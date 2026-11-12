import hashlib
import hmac
import json
import time

import httpx


def build_order_payload(order, event: str) -> dict:
    return {
        "event": event,
        "order": {
            "order_no": order.order_no,
            "amount": str(order.amount),
            "status": order.status,
            "environment": order.environment,
            "utr": order.utr,
            "customer_utr": order.customer_utr,
            "customer_name": getattr(order, "customer_name", None),
            "note": getattr(order, "note", None),
            "paid_at": order.paid_at.isoformat() if order.paid_at else None,
            "created_at": order.created_at.isoformat() if order.created_at else None,
        },
    }


def sign_payload(secret: str, body_bytes: bytes) -> str:
    return hmac.new((secret or "").encode(), body_bytes, hashlib.sha256).hexdigest()


def webhook_target(user, environment: str):
    if environment == "sandbox":
        return user.sandbox_webhook_url, user.sandbox_webhook_secret
    return user.webhook_url, user.webhook_secret


def dispatch_order_webhook(order, event: str):
    from gateway.models import WebhookLog

    user = order.user
    url, secret = webhook_target(user, order.environment)

    if not url:
        return None

    payload = build_order_payload(order, event)
    body = json.dumps(payload, separators=(",", ":")).encode()
    signature = sign_payload(secret, body)
    headers = {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
        "X-Webhook-Event": event,
    }

    attempts = 0
    response_status = None
    success = False
    try:
        for backoff in (1, 2, None):
            attempts += 1
            try:
                response = httpx.post(url, content=body, headers=headers, timeout=10.0)
                response_status = response.status_code
                if 200 <= response.status_code < 300:
                    success = True
                    break
            except Exception:
                response_status = None
            if backoff is not None:
                time.sleep(backoff)
    except Exception:
        pass

    try:
        return WebhookLog.objects.create(
            user=user,
            order=order,
            event=event,
            url=url,
            payload=payload,
            response_status=response_status,
            attempts=attempts,
            success=success,
        )
    except Exception:
        return None


def verify_webhook_signature(secret: str, raw_body: bytes, signature: str) -> bool:
    expected = sign_payload(secret, raw_body)
    return hmac.compare_digest(expected, signature or "")
