from secrets import token_hex

from django.utils import timezone

from .webhooks import dispatch_order_webhook

PROVIDER_LABELS = {
    "paytm_business": "Paytm Business",
    "paytm_pg": "Paytm PG",
    "phonepe_pg": "PhonePe PG",
}


def verify_order(order) -> dict:
    if order.status == "paid":
        return {"status": "paid", "verified": True, "message": "Already paid"}

    if (
        order.status == "pending"
        and order.expires_at
        and order.expires_at < timezone.now()
    ):
        order.status = "expired"
        order.save(update_fields=["status"])
        dispatch_order_webhook(order, "order.expired")
        return {
            "status": "expired",
            "verified": False,
            "message": "Order expired before payment was verified",
        }

    if order.environment == "sandbox":
        order.status = "paid"
        order.utr = order.customer_utr or "SBX" + token_hex(6).upper()
        order.paid_at = timezone.now()
        order.save(update_fields=["status", "utr", "paid_at"])
        dispatch_order_webhook(order, "order.paid")
        return {
            "status": "paid",
            "verified": True,
            "message": "Sandbox payment verified",
        }

    provider = order.payment_account.provider if order.payment_account else "manual"
    if provider == "manual":
        return {
            "status": order.status,
            "verified": False,
            "message": "Manual account — approve the customer UTR from the dashboard",
        }

    label = PROVIDER_LABELS.get(provider, provider)
    return {
        "status": order.status,
        "verified": False,
        "message": f"{label} API credentials not configured — running in mock mode",
        "mock": True,
    }
