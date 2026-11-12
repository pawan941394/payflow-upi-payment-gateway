import secrets
from urllib.parse import quote

from django.utils import timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/sandbox", tags=["sandbox"])


class SimulateRequest(BaseModel):
    outcome: str = Field(pattern="^(success|failure)$")


def _get_sandbox_order(order_no: str):
    from gateway.models import Order

    order = Order.objects.select_related("user", "payment_account").filter(order_no=order_no).first()
    if order is None or order.environment != "sandbox":
        raise HTTPException(status_code=404, detail="Sandbox order not found")
    if order.status == "pending" and order.expires_at and order.expires_at < timezone.now():
        order.status = "expired"
        order.save(update_fields=["status"])
    return order


def _upi_intent(order) -> str:
    upi_id = order.payment_account.upi_id if order.payment_account else ""
    merchant = order.user.display_name()
    return (
        f"upi://pay?pa={quote(upi_id)}&pn={quote(merchant)}"
        f"&am={order.amount}&tn={quote(order.order_no)}&cu=INR"
    )


@router.get("/pay/{order_no}")
def sandbox_order(order_no: str):
    order = _get_sandbox_order(order_no)
    return {
        "order_no": order.order_no,
        "merchant": order.user.display_name(),
        "amount": str(order.amount),
        "note": order.note,
        "status": order.status,
        "environment": order.environment,
        "customer_name": order.customer_name,
        "upi_id": order.payment_account.upi_id if order.payment_account else None,
        "customer_utr": order.customer_utr,
        "utr": order.utr,
        "utr_submitted_at": order.utr_submitted_at.isoformat() if order.utr_submitted_at else None,
        "paid_at": order.paid_at.isoformat() if order.paid_at else None,
        "expires_at": order.expires_at.isoformat() if order.expires_at else None,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "upi_intent": _upi_intent(order),
    }


@router.post("/pay/{order_no}/simulate")
def simulate_payment(order_no: str, body: SimulateRequest):
    order = _get_sandbox_order(order_no)
    if order.status == "paid":
        raise HTTPException(status_code=409, detail="Order is already paid")

    if body.outcome == "success":
        order.status = "paid"
        order.utr = "SBX" + secrets.token_hex(6).upper()
        order.paid_at = timezone.now()
        order.save(update_fields=["status", "utr", "paid_at"])
        from api.services.webhooks import dispatch_order_webhook

        dispatch_order_webhook(order, "order.paid")
    else:
        order.status = "failed"
        order.save(update_fields=["status"])

    return {"status": order.status, "utr": order.utr or None}
