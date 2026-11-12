import secrets
from datetime import timedelta

from django.db.models import Q
from django.utils import timezone
from fastapi import APIRouter, Depends, HTTPException

from api.deps import get_current_user
from api.schemas import MarkPaidRequest, OrderCreateRequest, serialize_order

router = APIRouter(prefix="/orders", tags=["orders"])


def _get_order(user, order_no: str):
    order = user.orders.filter(order_no=order_no).first()
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.get("")
def list_orders(
    status: str = "",
    environment: str = "",
    q: str = "",
    page: int = 1,
    per_page: int = 20,
    user=Depends(get_current_user),
):
    qs = user.orders.order_by("-created_at")
    if status:
        qs = qs.filter(status=status)
    if environment:
        qs = qs.filter(environment=environment)
    if q:
        qs = qs.filter(
            Q(order_no__icontains=q)
            | Q(customer_name__icontains=q)
            | Q(customer_email__icontains=q)
            | Q(utr__icontains=q)
            | Q(customer_utr__icontains=q)
        )
    total = qs.count()
    per_page = max(1, min(per_page, 100))
    page = max(1, page)
    items = qs.select_related("payment_account")[(page - 1) * per_page : page * per_page]
    return {"items": [serialize_order(o) for o in items], "total": total, "page": page, "per_page": per_page}


@router.post("")
def create_order(body: OrderCreateRequest, user=Depends(get_current_user)):
    account = user.payment_accounts.filter(is_default=True, is_active=True).first()
    if account is None:
        account = user.payment_accounts.filter(is_active=True).first()
    if account is None:
        raise HTTPException(status_code=400, detail="Add an active UPI account before creating orders")

    order = user.orders.create(
        payment_account=account,
        order_no="ORD" + secrets.token_hex(5).upper(),
        amount=body.amount,
        note=body.note or "",
        customer_name=body.customer_name or "",
        customer_email=body.customer_email or "",
        environment=body.environment,
        status="pending",
        expires_at=timezone.now() + timedelta(minutes=body.expiry_minutes),
    )
    return serialize_order(order)


@router.get("/{order_no}")
def get_order(order_no: str, user=Depends(get_current_user)):
    return serialize_order(_get_order(user, order_no))


@router.post("/{order_no}/approve-utr")
def approve_utr(order_no: str, user=Depends(get_current_user)):
    order = _get_order(user, order_no)
    if order.status != "review":
        raise HTTPException(status_code=400, detail="Order is not awaiting review")
    order.status = "paid"
    order.utr = order.customer_utr
    order.paid_at = timezone.now()
    order.save(update_fields=["status", "utr", "paid_at"])
    from api.services.webhooks import dispatch_order_webhook

    dispatch_order_webhook(order, "order.paid")
    return serialize_order(order)


@router.post("/{order_no}/reject-utr")
def reject_utr(order_no: str, user=Depends(get_current_user)):
    order = _get_order(user, order_no)
    if order.status != "review":
        raise HTTPException(status_code=400, detail="Order is not awaiting review")
    order.status = "pending"
    order.customer_utr = ""
    order.utr_submitted_at = None
    order.save(update_fields=["status", "customer_utr", "utr_submitted_at"])
    return serialize_order(order)


@router.post("/{order_no}/mark-paid")
def mark_paid(order_no: str, body: MarkPaidRequest, user=Depends(get_current_user)):
    order = _get_order(user, order_no)
    if order.status == "paid":
        raise HTTPException(status_code=400, detail="Order is already paid")
    order.status = "paid"
    if body.utr:
        order.utr = body.utr
    elif order.customer_utr:
        order.utr = order.customer_utr
    order.paid_at = timezone.now()
    order.save(update_fields=["status", "utr", "paid_at"])
    from api.services.webhooks import dispatch_order_webhook

    dispatch_order_webhook(order, "order.paid")
    return serialize_order(order)


@router.post("/{order_no}/recheck")
def recheck(order_no: str, user=Depends(get_current_user)):
    order = _get_order(user, order_no)
    from api.services.verification import verify_order

    result = verify_order(order)
    order.refresh_from_db()
    return {"result": result, "order": serialize_order(order)}
