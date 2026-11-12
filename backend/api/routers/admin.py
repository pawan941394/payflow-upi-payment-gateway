from typing import Optional

from django.db.models import Count, Q, Sum
from django.utils import timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from api.deps import get_current_user
from api.schemas import serialize_account, serialize_order, serialize_user

router = APIRouter(prefix="/admin", tags=["admin"])


def require_admin(user=Depends(get_current_user)):
    if not (user.is_staff or user.is_superuser):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


class ManualOverrideRequest(BaseModel):
    utr: Optional[str] = Field(default=None, max_length=22)


def _get_order(order_no: str):
    from gateway.models import Order

    order = Order.objects.select_related("user", "payment_account").filter(order_no=order_no).first()
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


def _serialize_webhook_log(log):
    return {
        "id": log.id,
        "event": log.event,
        "url": log.url,
        "attempts": log.attempts,
        "success": log.success,
        "response_status": log.response_status,
        "created_at": log.created_at.isoformat() if log.created_at else None,
    }


@router.get("/merchants")
def list_merchants(q: str = "", page: int = 1, per_page: int = 20, admin=Depends(require_admin)):
    from django.contrib.auth import get_user_model

    User = get_user_model()
    qs = User.objects.order_by("-date_joined")
    if q:
        qs = qs.filter(
            Q(username__icontains=q) | Q(email__icontains=q) | Q(business_name__icontains=q)
        )
    qs = qs.annotate(
        order_count=Count("orders"),
        paid_count=Count("orders", filter=Q(orders__status="paid")),
        total_paid=Sum("orders__amount", filter=Q(orders__status="paid")),
    )
    total = qs.count()
    per_page = max(1, min(per_page, 100))
    page = max(1, page)
    items = qs[(page - 1) * per_page : page * per_page]
    return {
        "items": [
            {
                **serialize_user(u),
                "order_count": u.order_count,
                "paid_count": u.paid_count,
                "total_paid": str(u.total_paid or 0),
                "date_joined": u.date_joined.isoformat() if u.date_joined else None,
            }
            for u in items
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
    }


@router.post("/merchants/{user_id}/toggle")
def toggle_merchant(user_id: int, admin=Depends(require_admin)):
    from django.contrib.auth import get_user_model
    from gateway.models import AdminAuditLog

    User = get_user_model()
    user = User.objects.filter(pk=user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="Merchant not found")
    user.is_merchant_active = not user.is_merchant_active
    user.save(update_fields=["is_merchant_active"])
    AdminAuditLog.objects.create(
        admin=admin,
        action="merchant.toggle",
        meta={"user_id": user.id, "new_state": user.is_merchant_active},
    )
    return serialize_user(user)


@router.get("/orders")
def list_all_orders(
    status: str = "",
    environment: str = "",
    q: str = "",
    page: int = 1,
    per_page: int = 20,
    admin=Depends(require_admin),
):
    from gateway.models import Order

    qs = Order.objects.select_related("user", "payment_account").order_by("-created_at")
    if status:
        qs = qs.filter(status=status)
    if environment:
        qs = qs.filter(environment=environment)
    if q:
        qs = qs.filter(
            Q(order_no__icontains=q)
            | Q(customer_name__icontains=q)
            | Q(utr__icontains=q)
            | Q(customer_utr__icontains=q)
            | Q(user__username__icontains=q)
            | Q(user__business_name__icontains=q)
        )
    total = qs.count()
    per_page = max(1, min(per_page, 100))
    page = max(1, page)
    items = qs[(page - 1) * per_page : page * per_page]
    return {
        "items": [
            {**serialize_order(o), "merchant": o.user.username, "merchant_display": o.user.display_name()}
            for o in items
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
    }


@router.get("/orders/{order_no}")
def admin_order_detail(order_no: str, admin=Depends(require_admin)):
    order = _get_order(order_no)
    logs = order.webhooklog_set.order_by("-created_at") if hasattr(order, "webhooklog_set") else []
    return {
        **serialize_order(order),
        "merchant": serialize_user(order.user),
        "webhook_logs": [_serialize_webhook_log(l) for l in logs],
    }


@router.post("/orders/{order_no}/manual-payment-override")
def manual_payment_override(order_no: str, body: ManualOverrideRequest, admin=Depends(require_admin)):
    from gateway.models import AdminAuditLog

    order = _get_order(order_no)
    if order.status == "paid":
        raise HTTPException(status_code=400, detail="Order is already paid")
    order.status = "paid"
    if body.utr:
        order.utr = body.utr
    elif order.customer_utr:
        order.utr = order.customer_utr
    order.paid_at = timezone.now()
    order.save(update_fields=["status", "utr", "paid_at"])
    AdminAuditLog.objects.create(
        admin=admin,
        action="order.manual_override",
        meta={"order_no": order.order_no, "utr": order.utr},
    )
    from api.services.webhooks import dispatch_order_webhook

    dispatch_order_webhook(order, "order.paid")
    return serialize_order(order)


@router.get("/transaction-debugger/{order_no}")
def transaction_debugger(order_no: str, admin=Depends(require_admin)):
    order = _get_order(order_no)
    logs = order.webhooklog_set.order_by("-created_at") if hasattr(order, "webhooklog_set") else []
    return {
        "order": serialize_order(order),
        "payment_account": serialize_account(order.payment_account) if order.payment_account else None,
        "merchant": serialize_user(order.user),
        "webhook_logs": [_serialize_webhook_log(l) for l in logs],
        "timeline": {
            "created_at": order.created_at.isoformat() if order.created_at else None,
            "utr_submitted_at": order.utr_submitted_at.isoformat() if order.utr_submitted_at else None,
            "paid_at": order.paid_at.isoformat() if order.paid_at else None,
            "expires_at": order.expires_at.isoformat() if order.expires_at else None,
        },
    }
