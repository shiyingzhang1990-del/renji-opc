from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from decimal import Decimal
from uuid import uuid4

from sqlalchemy.orm import Session

from .models import Milestone, Order, PaymentLedger, PaymentStatus


@dataclass(frozen=True)
class PaymentResult:
    provider_payment_id: str
    status: PaymentStatus


class PaymentProvider(ABC):
    @abstractmethod
    def create_and_freeze(self, order: Order) -> PaymentResult:
        raise NotImplementedError

    @abstractmethod
    def release_milestone(
        self,
        db: Session,
        order: Order,
        milestone: Milestone,
        platform_fee_rate: Decimal,
    ) -> PaymentLedger:
        raise NotImplementedError


class MockPaymentProvider(PaymentProvider):
    # 仅用于开发环境。
    # 真实生产环境必须替换成持牌支付机构提供的平台型支付、分账、
    # 延期结算或担保交易能力。平台业务数据库只保存支付状态和流水号，
    # 不保存银行卡号，不自行形成客户资金池。

    def create_and_freeze(self, order: Order) -> PaymentResult:
        return PaymentResult(
            provider_payment_id=f"mock_{uuid4().hex}",
            status=PaymentStatus.FROZEN,
        )

    def release_milestone(
        self,
        db: Session,
        order: Order,
        milestone: Milestone,
        platform_fee_rate: Decimal,
    ) -> PaymentLedger:
        payment = order.payment
        if payment is None:
            raise ValueError("订单尚未支付")
        if milestone.amount > payment.frozen_amount:
            raise ValueError("冻结余额不足")

        fee = (milestone.amount * platform_fee_rate).quantize(Decimal("0.01"))
        merchant_amount = milestone.amount - fee

        payment.frozen_amount -= milestone.amount
        payment.released_to_merchant += merchant_amount
        payment.platform_fee_accrued += fee
        payment.status = (
            PaymentStatus.RELEASED
            if payment.frozen_amount == Decimal("0.00")
            else PaymentStatus.PARTIALLY_RELEASED
        )
        db.add(payment)
        return payment


class WechatPlatformPaymentProvider(PaymentProvider):
    def create_and_freeze(self, order: Order) -> PaymentResult:
        raise NotImplementedError(
            "请根据微信支付平台收付通官方 SDK 实现：二级商户进件、"
            "支付下单、profit_sharing 标识、回调验签和幂等处理。"
        )

    def release_milestone(
        self,
        db: Session,
        order: Order,
        milestone: Milestone,
        platform_fee_rate: Decimal,
    ) -> PaymentLedger:
        raise NotImplementedError(
            "请调用微信支付分账/解冻接口，并以支付机构回调为最终状态依据。"
        )


class AlipayPlatformPaymentProvider(PaymentProvider):
    def create_and_freeze(self, order: Order) -> PaymentResult:
        raise NotImplementedError(
            "请根据支付宝面向互联网平台的支付结算产品实现商家进件、"
            "订单支付、待结算资金和异步通知验签。"
        )

    def release_milestone(
        self,
        db: Session,
        order: Order,
        milestone: Milestone,
        platform_fee_rate: Decimal,
    ) -> PaymentLedger:
        raise NotImplementedError(
            "请调用支付宝结算/分账能力，并以支付宝异步通知为最终状态依据。"
        )


def get_payment_provider(name: str) -> PaymentProvider:
    normalized = name.strip().lower()
    if normalized == "mock":
        return MockPaymentProvider()
    if normalized == "wechat":
        return WechatPlatformPaymentProvider()
    if normalized == "alipay":
        return AlipayPlatformPaymentProvider()
    raise ValueError(f"未知支付提供方：{name}")
