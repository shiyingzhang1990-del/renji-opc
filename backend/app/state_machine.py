from .models import MilestoneStatus, OrderStatus


ORDER_TRANSITIONS: dict[OrderStatus, set[OrderStatus]] = {
    OrderStatus.DRAFT: {OrderStatus.AWAITING_PAYMENT, OrderStatus.CANCELLED},
    OrderStatus.AWAITING_PAYMENT: {OrderStatus.FUNDS_FROZEN, OrderStatus.CANCELLED},
    OrderStatus.FUNDS_FROZEN: {OrderStatus.IN_PROGRESS, OrderStatus.DISPUTED, OrderStatus.REFUNDED},
    OrderStatus.IN_PROGRESS: {
        OrderStatus.PARTIALLY_RELEASED,
        OrderStatus.COMPLETED,
        OrderStatus.DISPUTED,
    },
    OrderStatus.PARTIALLY_RELEASED: {
        OrderStatus.PARTIALLY_RELEASED,
        OrderStatus.COMPLETED,
        OrderStatus.DISPUTED,
    },
    OrderStatus.DISPUTED: {
        OrderStatus.IN_PROGRESS,
        OrderStatus.PARTIALLY_RELEASED,
        OrderStatus.COMPLETED,
        OrderStatus.REFUNDED,
    },
    OrderStatus.COMPLETED: set(),
    OrderStatus.CANCELLED: set(),
    OrderStatus.REFUNDED: set(),
}


def transition_order(current: OrderStatus, target: OrderStatus) -> OrderStatus:
    if target == current:
        return current
    allowed = ORDER_TRANSITIONS.get(current, set())
    if target not in allowed:
        raise ValueError(f"订单状态不允许从 {current.value} 变更为 {target.value}")
    return target


def can_submit_milestone(status: MilestoneStatus) -> bool:
    return status in {MilestoneStatus.PENDING, MilestoneStatus.IN_PROGRESS}


def can_accept_milestone(status: MilestoneStatus) -> bool:
    return status == MilestoneStatus.SUBMITTED
