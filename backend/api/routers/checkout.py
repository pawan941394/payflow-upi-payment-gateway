import io
from urllib.parse import quote

from django.utils import timezone
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from api.schemas import UtrSubmitRequest

router = APIRouter(prefix="/pay", tags=["checkout"])


def _get_order(order_no: str):
    from gateway.models import Order

    order = Order.objects.select_related("user", "payment_account").filter(order_no=order_no).first()
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
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


@router.get("/{order_no}")
def public_order(order_no: str):
    order = _get_order(order_no)
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


@router.get("/{order_no}/status")
def public_status(order_no: str):
    order = _get_order(order_no)
    return {"status": order.status, "paid": order.status == "paid"}


@router.post("/{order_no}/utr")
def submit_utr(order_no: str, body: UtrSubmitRequest):
    order = _get_order(order_no)
    if order.status not in ("pending", "expired"):
        raise HTTPException(status_code=400, detail="This order no longer accepts UTR submissions")
    order.status = "review"
    order.customer_utr = body.utr
    order.utr_submitted_at = timezone.now()
    order.save(update_fields=["status", "customer_utr", "utr_submitted_at"])
    from api.services.webhooks import dispatch_order_webhook

    dispatch_order_webhook(order, "order.review")
    return {"status": order.status}


@router.get("/{order_no}/qr.png")
def qr_png(order_no: str):
    order = _get_order(order_no)
    from api.services.qr import make_qr_png

    png = make_qr_png(_upi_intent(order))
    return StreamingResponse(io.BytesIO(png), media_type="image/png")
