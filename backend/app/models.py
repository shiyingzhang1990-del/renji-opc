from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from enum import Enum

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum as SqlEnum,
    ForeignKey,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class ProductDeliveryType(str, Enum):
    DIGITAL_GOOD = "digital_good"
    SUBSCRIPTION = "subscription"
    PROJECT_SERVICE = "project_service"
    CONSULTING = "consulting"
    API_RESOURCE = "api_resource"
    TRAINING = "training"
    PHYSICAL_OR_HYBRID = "physical_or_hybrid"


class UserRole(str, Enum):
    BUYER = "buyer"
    MERCHANT_OWNER = "merchant_owner"
    MERCHANT_STAFF = "merchant_staff"
    COMMUNITY_OPERATOR = "community_operator"
    PLATFORM_OPERATOR = "platform_operator"
    RISK_REVIEWER = "risk_reviewer"
    DISPUTE_MEDIATOR = "dispute_mediator"
    SUPER_ADMIN = "super_admin"


class MerchantApplicationStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    REVIEWING = "reviewing"
    VERIFIED = "verified"
    REJECTED = "rejected"
    SUSPENDED = "suspended"
    EXITED = "exited"


class OrderStatus(str, Enum):
    DRAFT = "draft"
    AWAITING_PAYMENT = "awaiting_payment"
    FUNDS_FROZEN = "funds_frozen"
    IN_PROGRESS = "in_progress"
    PARTIALLY_RELEASED = "partially_released"
    COMPLETED = "completed"
    DISPUTED = "disputed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class MilestoneStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    SUBMITTED = "submitted"
    ACCEPTED = "accepted"
    RELEASED = "released"
    DISPUTED = "disputed"
    REFUNDED = "refunded"


class PaymentStatus(str, Enum):
    CREATED = "created"
    AUTHORIZED = "authorized"
    FROZEN = "frozen"
    PARTIALLY_RELEASED = "partially_released"
    RELEASED = "released"
    REFUNDING = "refunding"
    REFUNDED = "refunded"
    FAILED = "failed"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    display_name: Mapped[str] = mapped_column(String(120), index=True)
    role: Mapped[UserRole] = mapped_column(SqlEnum(UserRole), default=UserRole.BUYER)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    community_id: Mapped[int | None] = mapped_column(ForeignKey("communities.id"), nullable=True)
    merchant_id: Mapped[int | None] = mapped_column(ForeignKey("merchants.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    community: Mapped["Community | None"] = relationship()
    merchant: Mapped["Merchant | None"] = relationship()


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    token_hash: Mapped[str] = mapped_column(String(128), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship()


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(80), index=True)
    resource_type: Mapped[str] = mapped_column(String(80))
    resource_id: Mapped[int | None] = mapped_column(nullable=True)
    detail: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    actor: Mapped["User | None"] = relationship()


class MerchantApplication(Base):
    __tablename__ = "merchant_applications"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    company_name: Mapped[str] = mapped_column(String(160), index=True)
    display_name: Mapped[str] = mapped_column(String(120))
    unified_social_credit_code: Mapped[str] = mapped_column(String(40))
    legal_representative: Mapped[str] = mapped_column(String(120))
    contact_phone: Mapped[str] = mapped_column(String(30))
    contact_email: Mapped[str] = mapped_column(String(255))
    registered_address: Mapped[str] = mapped_column(String(500), default="")
    business_scope: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[MerchantApplicationStatus] = mapped_column(
        SqlEnum(MerchantApplicationStatus), default=MerchantApplicationStatus.DRAFT
    )
    community_id: Mapped[int | None] = mapped_column(ForeignKey("communities.id"), nullable=True)
    industry_category: Mapped[str] = mapped_column(String(200), default="")
    professional_qualifications: Mapped[str] = mapped_column(Text, default="")
    cases: Mapped[str] = mapped_column(Text, default="")
    receiving_account_identifier: Mapped[str] = mapped_column(String(200), default="")
    risk_level: Mapped[str] = mapped_column(String(30), default="normal")
    reviewer_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    review_comment: Mapped[str] = mapped_column(Text, default="")
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    suspended_reason: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user: Mapped["User"] = relationship(foreign_keys=[user_id])
    community: Mapped["Community | None"] = relationship()
    reviewer: Mapped["User | None"] = relationship(foreign_keys=[reviewer_id])

class Community(Base):
    __tablename__ = "communities"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    city: Mapped[str] = mapped_column(String(80), default="")
    operator_name: Mapped[str] = mapped_column(String(120), default="")
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Merchant(Base):
    __tablename__ = "merchants"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_name: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(120), index=True)
    unified_social_credit_code: Mapped[str | None] = mapped_column(String(40), nullable=True)
    community_id: Mapped[int | None] = mapped_column(ForeignKey("communities.id"), nullable=True)
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    service_score: Mapped[Decimal] = mapped_column(Numeric(3, 2), default=Decimal("5.00"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    community: Mapped[Community | None] = relationship()
    products: Mapped[list["Product"]] = relationship(back_populates="merchant")


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    description: Mapped[str] = mapped_column(Text, default="")
    sort_order: Mapped[int] = mapped_column(default=0)


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    merchant_id: Mapped[int] = mapped_column(ForeignKey("merchants.id"), index=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"), index=True)
    title: Mapped[str] = mapped_column(String(180), index=True)
    summary: Mapped[str] = mapped_column(Text)
    delivery_type: Mapped[ProductDeliveryType] = mapped_column(SqlEnum(ProductDeliveryType))
    price_from: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    currency: Mapped[str] = mapped_column(String(8), default="CNY")
    delivery_days: Mapped[int] = mapped_column(default=7)
    ai_generated_content: Mapped[bool] = mapped_column(Boolean, default=False)
    published: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    merchant: Mapped[Merchant] = relationship(back_populates="products")
    category: Mapped[Category] = relationship()


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_no: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    buyer_name: Mapped[str] = mapped_column(String(120))
    buyer_contact: Mapped[str] = mapped_column(String(160))
    merchant_id: Mapped[int] = mapped_column(ForeignKey("merchants.id"), index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), index=True)
    status: Mapped[OrderStatus] = mapped_column(SqlEnum(OrderStatus), default=OrderStatus.AWAITING_PAYMENT)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    platform_fee_rate: Mapped[Decimal] = mapped_column(Numeric(6, 4))
    contract_snapshot: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    merchant: Mapped[Merchant] = relationship()
    product: Mapped[Product] = relationship()
    milestones: Mapped[list["Milestone"]] = relationship(
        back_populates="order",
        cascade="all, delete-orphan",
        order_by="Milestone.sequence",
    )
    payment: Mapped["PaymentLedger | None"] = relationship(
        back_populates="order",
        uselist=False,
        cascade="all, delete-orphan",
    )


class Milestone(Base):
    __tablename__ = "milestones"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), index=True)
    sequence: Mapped[int]
    title: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text, default="")
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    due_days: Mapped[int] = mapped_column(default=7)
    status: Mapped[MilestoneStatus] = mapped_column(
        SqlEnum(MilestoneStatus),
        default=MilestoneStatus.PENDING,
    )
    deliverable_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    released_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    order: Mapped[Order] = relationship(back_populates="milestones")


class PaymentLedger(Base):
    __tablename__ = "payment_ledgers"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), unique=True, index=True)
    provider: Mapped[str] = mapped_column(String(40), default="mock")
    provider_payment_id: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    status: Mapped[PaymentStatus] = mapped_column(SqlEnum(PaymentStatus))
    gross_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    frozen_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))
    released_to_merchant: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))
    platform_fee_accrued: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))
    refunded_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    order: Mapped[Order] = relationship(back_populates="payment")


class Dispute(Base):
    __tablename__ = "disputes"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), index=True)
    milestone_id: Mapped[int | None] = mapped_column(ForeignKey("milestones.id"), nullable=True)
    opened_by: Mapped[str] = mapped_column(String(120))
    reason: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(30), default="open")
    resolution: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
