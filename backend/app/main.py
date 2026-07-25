import os
from contextlib import asynccontextmanager
from datetime import datetime
from decimal import Decimal
from uuid import uuid4

from fastapi import Depends, FastAPI, Header, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from .config import get_settings
from .database import Base, engine, get_db
from .dependencies import get_current_user
from .models import (
    Category,
    Dispute,
    Merchant,
    Milestone,
    MilestoneStatus,
    Order,
    OrderStatus,
    PaymentLedger,
    Product,
    User,
)
from .payment import get_payment_provider
from .schemas import (
    CategoryOut,
    DisputeIn,
    OrderCreate,
    OrderOut,
    ProductCreate,
    ProductOut,
    SubmitMilestoneIn,
)
from .seed import seed_data
from .state_machine import can_accept_milestone, can_submit_milestone, transition_order
from .routers import auth, merchant_onboarding, users

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    with Session(engine) as db:
        seed_data(db)
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="壬集 OPC 交易市场与里程碑履约 MVP",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(merchant_onboarding.router)

@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": settings.app_name}


@app.get("/api/categories", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return list(db.scalars(select(Category).order_by(Category.sort_order)))


@app.get("/api/products", response_model=list[ProductOut])
def list_products(
    category_slug: str | None = Query(default=None),
    keyword: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    stmt = (
        select(Product)
        .where(Product.published.is_(True))
        .options(
            selectinload(Product.merchant),
            selectinload(Product.category),
        )
        .order_by(Product.id.desc())
    )

    if category_slug:
        stmt = stmt.join(Product.category).where(Category.slug == category_slug)
    if keyword:
        stmt = stmt.where(Product.title.contains(keyword))

    return list(db.scalars(stmt).unique())


@app.post("/api/products", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.merchant_id != payload.merchant_id:
        raise HTTPException(403, "只能为自己的商家发布商品")
    merchant = db.get(Merchant, payload.merchant_id)
    category = db.get(Category, payload.category_id)
    if merchant is None or not merchant.verified:
        raise HTTPException(400, "商家不存在或尚未完成平台认证")
    if category is None:
        raise HTTPException(400, "商品分类不存在")

    product = Product(**payload.model_dump())
    db.add(product)
    db.commit()

    stmt = (
        select(Product)
        .where(Product.id == product.id)
        .options(selectinload(Product.merchant), selectinload(Product.category))
    )
    return db.scalar(stmt)


def load_order(db: Session, order_id: int) -> Order:
    stmt = (
        select(Order)
        .where(Order.id == order_id)
        .options(
            selectinload(Order.merchant),
            selectinload(Order.product).selectinload(Product.merchant),
            selectinload(Order.product).selectinload(Product.category),
            selectinload(Order.milestones),
            selectinload(Order.payment),
        )
    )
    order = db.scalar(stmt)
    if order is None:
        raise HTTPException(404, "订单不存在")
    return order


@app.post("/api/orders", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(payload: OrderCreate, db: Session = Depends(get_db)):
    product = db.get(Product, payload.product_id)
    if product is None or not product.published:
        raise HTTPException(400, "商品不存在或已下架")

    total = sum(item.amount for item in payload.milestones)
    order = Order(
        order_no=f"RJ{datetime.utcnow():%Y%m%d}{uuid4().hex[:10].upper()}",
        buyer_name=payload.buyer_name,
        buyer_contact=payload.buyer_contact,
        merchant_id=product.merchant_id,
        product_id=product.id,
        status=OrderStatus.AWAITING_PAYMENT,
        total_amount=total,
        platform_fee_rate=Decimal(str(settings.platform_fee_rate)),
        contract_snapshot=payload.contract_snapshot,
    )

    for index, milestone_data in enumerate(payload.milestones, start=1):
        order.milestones.append(
            Milestone(
                sequence=index,
                title=milestone_data.title,
                description=milestone_data.description,
                amount=milestone_data.amount,
                due_days=milestone_data.due_days,
                status=MilestoneStatus.PENDING,
            )
        )

    db.add(order)
    db.commit()
    return load_order(db, order.id)


@app.get("/api/orders/{order_id}", response_model=OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db)):
    return load_order(db, order_id)


@app.post("/api/orders/{order_id}/pay", response_model=OrderOut)
def pay_order(
    order_id: int,
    db: Session = Depends(get_db),
    idempotency_key: str = Header(default="", alias="Idempotency-Key"),
):
    order = load_order(db, order_id)

    if order.payment is not None:
        return order
    if order.status != OrderStatus.AWAITING_PAYMENT:
        raise HTTPException(409, "当前订单状态不能支付")
    if not idempotency_key:
        raise HTTPException(400, "支付请求必须提供 Idempotency-Key")

    provider = get_payment_provider(settings.payment_provider)
    result = provider.create_and_freeze(order)

    order.payment = PaymentLedger(
        provider=settings.payment_provider,
        provider_payment_id=result.provider_payment_id,
        status=result.status,
        gross_amount=order.total_amount,
        frozen_amount=order.total_amount,
    )
    order.status = transition_order(order.status, OrderStatus.FUNDS_FROZEN)

    if order.milestones:
        order.milestones[0].status = MilestoneStatus.IN_PROGRESS
        order.status = transition_order(order.status, OrderStatus.IN_PROGRESS)

    db.add(order)
    db.commit()
    return load_order(db, order.id)


@app.post("/api/milestones/{milestone_id}/submit", response_model=OrderOut)
def submit_milestone(
    milestone_id: int,
    payload: SubmitMilestoneIn,
    db: Session = Depends(get_db),
):
    milestone = db.get(Milestone, milestone_id)
    if milestone is None:
        raise HTTPException(404, "里程碑不存在")
    if not can_submit_milestone(milestone.status):
        raise HTTPException(409, "当前里程碑状态不能提交")

    milestone.status = MilestoneStatus.SUBMITTED
    milestone.deliverable_url = payload.deliverable_url
    milestone.submitted_at = datetime.utcnow()
    db.add(milestone)
    db.commit()
    return load_order(db, milestone.order_id)


@app.post("/api/milestones/{milestone_id}/accept", response_model=OrderOut)
def accept_milestone(milestone_id: int, db: Session = Depends(get_db)):
    milestone = db.get(Milestone, milestone_id)
    if milestone is None:
        raise HTTPException(404, "里程碑不存在")
    if not can_accept_milestone(milestone.status):
        raise HTTPException(409, "只有已提交的里程碑可以验收")

    order = load_order(db, milestone.order_id)
    if order.status == OrderStatus.DISPUTED:
        raise HTTPException(409, "争议处理期间不得放款")

    milestone.status = MilestoneStatus.ACCEPTED
    milestone.accepted_at = datetime.utcnow()

    provider = get_payment_provider(settings.payment_provider)
    provider.release_milestone(
        db=db,
        order=order,
        milestone=milestone,
        platform_fee_rate=order.platform_fee_rate,
    )

    milestone.status = MilestoneStatus.RELEASED
    milestone.released_at = datetime.utcnow()

    remaining = [
        item
        for item in order.milestones
        if item.id != milestone.id and item.status != MilestoneStatus.RELEASED
    ]
    if not remaining:
        order.status = transition_order(order.status, OrderStatus.COMPLETED)
    else:
        order.status = transition_order(order.status, OrderStatus.PARTIALLY_RELEASED)
        next_item = sorted(remaining, key=lambda item: item.sequence)[0]
        if next_item.status == MilestoneStatus.PENDING:
            next_item.status = MilestoneStatus.IN_PROGRESS

    db.add(order)
    db.commit()
    return load_order(db, order.id)


@app.post("/api/milestones/{milestone_id}/dispute", response_model=OrderOut)
def open_dispute(
    milestone_id: int,
    payload: DisputeIn,
    db: Session = Depends(get_db),
):
    milestone = db.get(Milestone, milestone_id)
    if milestone is None:
        raise HTTPException(404, "里程碑不存在")

    order = load_order(db, milestone.order_id)
    if order.status in {OrderStatus.COMPLETED, OrderStatus.CANCELLED, OrderStatus.REFUNDED}:
        raise HTTPException(409, "当前订单不能发起争议")

    milestone.status = MilestoneStatus.DISPUTED
    order.status = OrderStatus.DISPUTED
    dispute = Dispute(
        order_id=order.id,
        milestone_id=milestone.id,
        opened_by=payload.opened_by,
        reason=payload.reason,
    )
    db.add_all([order, milestone, dispute])
    db.commit()
    return load_order(db, order.id)


# Serve static frontend in production
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.isdir(static_dir):
    app.mount("/assets", StaticFiles(directory=os.path.join(static_dir, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")
        index_path = os.path.join(static_dir, "index.html")
        if os.path.isfile(index_path):
            return FileResponse(index_path)
        raise HTTPException(status_code=404, detail="Not found")
