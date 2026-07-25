from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import (
    get_current_user,
    require_platform_or_super_admin,
    scope_community,
)
from ..models import (
    AuditLog,
    Merchant,
    MerchantApplication,
    MerchantApplicationStatus,
    User,
    UserRole,
)
from ..schemas import (
    AuditLogOut,
    MerchantApplicationCreate,
    MerchantApplicationOut,
    MerchantApplicationReview,
)

router = APIRouter(prefix="/api/merchant-applications", tags=["merchant-onboarding"])


def _application_detail(db: Session, app_id: int) -> MerchantApplication:
    app = db.get(MerchantApplication, app_id)
    if app is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Application not found")
    return app


@router.post("/", response_model=MerchantApplicationOut, status_code=status.HTTP_201_CREATED)
def create_application(
    payload: MerchantApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new merchant application in draft status."""
    existing = db.scalar(
        select(MerchantApplication).where(
            MerchantApplication.user_id == current_user.id,
            MerchantApplication.status.in_([
                MerchantApplicationStatus.DRAFT,
                MerchantApplicationStatus.SUBMITTED,
                MerchantApplicationStatus.REVIEWING,
            ]),
        )
    )
    if existing:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "You already have a pending merchant application",
        )

    data = payload.model_dump()
    if not data.get("company_name"):
        data["company_name"] = data.get("display_name", "")
    if not data.get("contact_email"):
        data["contact_email"] = current_user.email
    app = MerchantApplication(
        user_id=current_user.id,
        **data,
    )
    db.add(app)
    db.flush()

    db.add(AuditLog(
        actor_id=current_user.id,
        action="merchant_application.create",
        resource_type="merchant_application",
        resource_id=app.id,
        detail=f"Created merchant application for {payload.company_name}",
    ))
    db.commit()
    db.refresh(app)
    return app


@router.get("/", response_model=list[MerchantApplicationOut])
def list_applications(
    status_filter: MerchantApplicationStatus | None = Query(default=None, alias="status"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List merchant applications. Users see their own; admins see all."""
    stmt = select(MerchantApplication).order_by(MerchantApplication.id.desc())

    if current_user.role not in {
        UserRole.PLATFORM_OPERATOR,
        UserRole.SUPER_ADMIN,
        UserRole.COMMUNITY_OPERATOR,
    }:
        stmt = stmt.where(MerchantApplication.user_id == current_user.id)

    if current_user.role == UserRole.COMMUNITY_OPERATOR and current_user.community_id:
        stmt = stmt.where(MerchantApplication.community_id == current_user.community_id)

    if status_filter:
        stmt = stmt.where(MerchantApplication.status == status_filter)

    offset = (page - 1) * page_size
    apps = db.scalars(stmt.offset(offset).limit(page_size)).all()
    return list(apps)


@router.get("/{application_id}", response_model=MerchantApplicationOut)
def get_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific merchant application."""
    app = _application_detail(db, application_id)

    if current_user.role not in {
        UserRole.PLATFORM_OPERATOR,
        UserRole.SUPER_ADMIN,
        UserRole.COMMUNITY_OPERATOR,
    } and app.user_id != current_user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Cannot view this application")

    return app


@router.post("/{application_id}/submit", response_model=MerchantApplicationOut)
def submit_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit a draft application for review."""
    app = _application_detail(db, application_id)

    if app.user_id != current_user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Cannot submit another user's application")
    if app.status != MerchantApplicationStatus.DRAFT:
        raise HTTPException(status.HTTP_409_CONFLICT, "Only draft applications can be submitted")

    app.status = MerchantApplicationStatus.SUBMITTED

    db.add(AuditLog(
        actor_id=current_user.id,
        action="merchant_application.submit",
        resource_type="merchant_application",
        resource_id=app.id,
        detail=f"Submitted merchant application for {app.company_name}",
    ))
    db.commit()
    db.refresh(app)
    return app


@router.post("/{application_id}/review", response_model=MerchantApplicationOut)
def review_application(
    application_id: int,
    payload: MerchantApplicationReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_platform_or_super_admin),
):
    """Review and verify/reject a merchant application."""
    app = _application_detail(db, application_id)

    if app.status not in {MerchantApplicationStatus.SUBMITTED, MerchantApplicationStatus.REVIEWING}:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Only submitted applications can be reviewed",
        )
    if payload.status not in {MerchantApplicationStatus.VERIFIED, MerchantApplicationStatus.REJECTED}:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Review must set status to verified or rejected",
        )

    app.status = payload.status
    app.reviewer_id = current_user.id
    app.review_comment = payload.review_comment
    app.risk_level = payload.risk_level
    app.reviewed_at = datetime.utcnow()

    if payload.status == MerchantApplicationStatus.VERIFIED:
        # Create or update Merchant record
        merchant = db.scalar(
            select(Merchant).where(
                Merchant.unified_social_credit_code == app.unified_social_credit_code
            )
        )
        if merchant is None:
            merchant = Merchant(
                company_name=app.company_name,
                display_name=app.display_name,
                unified_social_credit_code=app.unified_social_credit_code,
                community_id=app.community_id,
                verified=True,
                service_score=Decimal("5.00"),
            )
            db.add(merchant)
            db.flush()
        else:
            merchant.verified = True
            merchant.display_name = app.display_name
            merchant.community_id = app.community_id

        # Link user to merchant and promote role
        user = db.get(User, app.user_id)
        if user:
            user.merchant_id = merchant.id
            user.role = UserRole.MERCHANT_OWNER

    db.add(AuditLog(
        actor_id=current_user.id,
        action=f"merchant_application.{payload.status.value}",
        resource_type="merchant_application",
        resource_id=app.id,
        detail=(
            f"Application {payload.status.value} for {app.company_name}: "
            f"{payload.review_comment}"
        ),
    ))
    db.commit()
    db.refresh(app)
    return app


@router.post("/{application_id}/suspend", response_model=MerchantApplicationOut)
def suspend_merchant(
    application_id: int,
    reason: str = Query(min_length=1, max_length=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_platform_or_super_admin),
):
    """Suspend a verified merchant."""
    app = _application_detail(db, application_id)

    if app.status != MerchantApplicationStatus.VERIFIED:
        raise HTTPException(status.HTTP_409_CONFLICT, "Only verified merchants can be suspended")

    app.status = MerchantApplicationStatus.SUSPENDED
    app.suspended_reason = reason

    # Also mark the merchant as not verified
    user = db.get(User, app.user_id)
    if user and user.merchant_id:
        merchant = db.get(Merchant, user.merchant_id)
        if merchant:
            merchant.verified = False

    db.add(AuditLog(
        actor_id=current_user.id,
        action="merchant_application.suspend",
        resource_type="merchant_application",
        resource_id=app.id,
        detail=f"Suspended merchant {app.company_name}: {reason}",
    ))
    db.commit()
    db.refresh(app)
    return app


@router.get("/{application_id}/audit-logs", response_model=list[AuditLogOut])
def get_application_audit_logs(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get audit logs for a merchant application."""
    app = _application_detail(db, application_id)
    if current_user.role not in {
        UserRole.PLATFORM_OPERATOR, UserRole.SUPER_ADMIN
    } and app.user_id != current_user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Cannot view audit logs")
    logs = db.scalars(
        select(AuditLog)
        .where(
            AuditLog.resource_type == "merchant_application",
            AuditLog.resource_id == application_id,
        )
        .order_by(AuditLog.created_at.desc())
    ).all()
    return list(logs)
