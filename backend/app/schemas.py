from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field, model_validator, field_serializer

from .models import (
    MerchantApplicationStatus,
    MilestoneStatus,
    OrderStatus,
    PaymentStatus,
    ProductDeliveryType,
    UserRole,
)


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class CategoryOut(ORMModel):
    id: int
    name: str
    slug: str
    description: str


class MerchantOut(ORMModel):
    id: int
    company_name: str
    display_name: str
    verified: bool
    service_score: Decimal


class ProductOut(ORMModel):
    id: int
    title: str
    summary: str
    delivery_type: ProductDeliveryType
    price_from: Decimal
    currency: str
    delivery_days: int
    ai_generated_content: bool
    contact_wechat: str
    contact_phone: str
    contact_qq: str
    merchant: MerchantOut
    category: CategoryOut


class ProductCreate(BaseModel):
    merchant_id: int
    category_id: int
    title: str = Field(min_length=2, max_length=180)
    summary: str = Field(min_length=10)
    delivery_type: ProductDeliveryType
    price_from: Decimal = Field(gt=0)
    delivery_days: int = Field(ge=1, le=365)
    ai_generated_content: bool = False
    contact_wechat: str = Field(default="", max_length=100)
    contact_phone: str = Field(default="", max_length=30)
    contact_qq: str = Field(default="", max_length=30)


class ProductUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=180)
    summary: str | None = Field(default=None, min_length=10)
    category_id: int | None = None
    delivery_type: ProductDeliveryType | None = None
    price_from: Decimal | None = Field(default=None, gt=0)
    delivery_days: int | None = Field(default=None, ge=1, le=365)
    published: bool | None = None
    contact_wechat: str | None = Field(default=None, max_length=100)
    contact_phone: str | None = Field(default=None, max_length=30)
    contact_qq: str | None = Field(default=None, max_length=30)


class MilestoneCreate(BaseModel):
    title: str = Field(min_length=2, max_length=160)
    description: str = ""
    amount: Decimal = Field(gt=0)
    due_days: int = Field(default=7, ge=1, le=365)


class OrderCreate(BaseModel):
    buyer_name: str = Field(min_length=2, max_length=120)
    buyer_contact: str = Field(min_length=3, max_length=160)
    product_id: int
    milestones: list[MilestoneCreate] = Field(min_length=1, max_length=20)
    contract_snapshot: str = ""

    @model_validator(mode="after")
    def validate_total(self):
        total = sum(item.amount for item in self.milestones)
        if total <= 0:
            raise ValueError("订单总金额必须大于 0")
        return self


class MilestoneOut(ORMModel):
    id: int
    sequence: int
    title: str
    description: str
    amount: Decimal
    due_days: int
    status: MilestoneStatus
    deliverable_url: str | None


class PaymentOut(ORMModel):
    provider: str
    provider_payment_id: str
    status: PaymentStatus
    gross_amount: Decimal
    frozen_amount: Decimal
    released_to_merchant: Decimal
    platform_fee_accrued: Decimal
    refunded_amount: Decimal


class OrderOut(ORMModel):
    id: int
    order_no: str
    buyer_name: str
    buyer_contact: str
    status: OrderStatus
    total_amount: Decimal
    platform_fee_rate: Decimal
    created_at: datetime
    merchant: MerchantOut
    product: ProductOut
    milestones: list[MilestoneOut]
    payment: PaymentOut | None


class SubmitMilestoneIn(BaseModel):
    deliverable_url: str = Field(min_length=4, max_length=500)


class DisputeIn(BaseModel):
    opened_by: str = Field(min_length=2, max_length=120)
    reason: str = Field(min_length=10, max_length=3000)


# ---- Auth schemas ----


class UserRegisterIn(BaseModel):
    email: str = Field(
        min_length=5, max_length=255,
        pattern=r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
    )
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(min_length=1, max_length=120)


class UserLoginIn(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=1, max_length=128)


class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefreshIn(BaseModel):
    refresh_token: str


class UserOut(ORMModel):
    id: int
    email: str
    display_name: str
    role: UserRole
    is_active: bool
    community_id: int | None
    merchant_id: int | None
    created_at: datetime


# ---- Merchant onboarding schemas ----


class MerchantApplicationCreate(BaseModel):
    company_name: str = Field(default="", max_length=160)
    display_name: str = Field(min_length=2, max_length=120)
    unified_social_credit_code: str = Field(default="", max_length=40)
    legal_representative: str = Field(default="", max_length=120)
    contact_phone: str = Field(default="", max_length=30)
    contact_email: str = Field(default="", max_length=255)
    registered_address: str = Field(default="", max_length=500)
    business_scope: str = Field(min_length=10, max_length=2000)
    community_id: int | None = None
    industry_category: str = Field(default="", max_length=200)
    professional_qualifications: str = Field(default="", max_length=3000)
    cases: str = Field(default="", max_length=3000)
    receiving_account_identifier: str = Field(default="", max_length=200)


class MerchantApplicationReview(BaseModel):
    status: MerchantApplicationStatus
    review_comment: str = Field(default="", max_length=2000)
    risk_level: str = Field(default="normal", max_length=30)


class MerchantApplicationOut(ORMModel):
    id: int
    user_id: int
    company_name: str
    display_name: str
    unified_social_credit_code: str
    legal_representative: str
    contact_phone: str
    contact_email: str
    registered_address: str
    business_scope: str
    status: MerchantApplicationStatus
    community_id: int | None
    industry_category: str
    professional_qualifications: str
    cases: str
    receiving_account_identifier: str
    risk_level: str
    reviewer_id: int | None
    review_comment: str
    reviewed_at: datetime | None
    suspended_reason: str
    created_at: datetime
    updated_at: datetime


class AuditLogOut(ORMModel):
    id: int
    actor_id: int | None
    action: str
    resource_type: str
    resource_id: int | None
    detail: str
    created_at: datetime
