import json
from datetime import timedelta

import httpx
from django.utils import timezone

from api.services.webhooks import build_order_payload, sign_payload, webhook_target

MAX_ATTEMPTS = 5


def enqueue_order_webhook(order, event: str):
    from gateway.models import WebhookOutbox

    url, _secret = webhook_target(order.user, order.environment)
    if not url:
        return None

    return WebhookOutbox.objects.create(
        user=order.user,
        order=order,
        event=event,
        url=url,
        payload=build_order_payload(order, event),
        status="pending",
        next_attempt_at=timezone.now(),
    )


def process_outbox(limit: int = 50) -> dict:
    from gateway.models import WebhookLog, WebhookOutbox

    now = timezone.now()
    entries = list(
        WebhookOutbox.objects.filter(status="pending", next_attempt_at__lte=now)
        .order_by("created_at")[:limit]
    )

    delivered = failed = rescheduled = 0
    for entry in entries:
        _url, secret = webhook_target(
            entry.user, entry.order.environment if entry.order else "live"
        )
        body = json.dumps(entry.payload, separators=(",", ":")).encode()
        headers = {
            "Content-Type": "application/json",
            "X-Webhook-Signature": sign_payload(secret, body),
            "X-Webhook-Event": entry.event,
        }

        response_status = None
        success = False
        try:
            response = httpx.post(entry.url, content=body, headers=headers, timeout=10.0)
            response_status = response.status_code
            success = 200 <= response.status_code < 300
        except Exception:
            pass

        entry.attempts += 1
        entry.last_response_status = response_status
        if success:
            entry.status = "delivered"
            entry.delivered_at = timezone.now()
            delivered += 1
        elif entry.attempts >= MAX_ATTEMPTS:
            entry.status = "failed"
            failed += 1
        else:
            entry.next_attempt_at = timezone.now() + timedelta(minutes=2**entry.attempts)
            rescheduled += 1
        entry.save()

        try:
            WebhookLog.objects.create(
                user=entry.user,
                order=entry.order,
                event=entry.event,
                url=entry.url,
                payload=entry.payload,
                response_status=response_status,
                attempts=entry.attempts,
                success=success,
            )
        except Exception:
            pass

    return {
        "processed": len(entries),
        "delivered": delivered,
        "failed": failed,
        "rescheduled": rescheduled,
    }
