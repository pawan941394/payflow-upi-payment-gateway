from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, Sum
from django.utils import timezone
from fastapi import APIRouter, Depends

from api.deps import get_current_user
from api.schemas import serialize_order

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
def stats(environment: str = "live", user=Depends(get_current_user)):
    orders = user.orders.filter(environment=environment)
    paid = orders.filter(status="paid")

    now = timezone.localtime()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    today = paid.filter(paid_at__gte=today_start).aggregate(amount=Sum("amount"), count=Count("id"))
    totals = paid.aggregate(amount=Sum("amount"), count=Count("id"))
    pending_count = orders.filter(status="pending").count()
    review_count = orders.filter(status="review").count()
    expired_count = orders.filter(status="expired").count()
    paid_count = totals["count"] or 0

    settled = paid_count + expired_count
    success_rate = round(paid_count / settled * 100) if settled else None

    chart = []
    for i in range(6, -1, -1):
        day_start = today_start - timedelta(days=i)
        day_end = day_start + timedelta(days=1)
        day = paid.filter(paid_at__gte=day_start, paid_at__lt=day_end).aggregate(
            amount=Sum("amount"), count=Count("id")
        )
        chart.append(
            {
                "date": day_start.strftime("%d %b"),
                "label": day_start.strftime("%a"),
                "amount": str(day["amount"] or Decimal("0")),
                "count": day["count"] or 0,
            }
        )

    recent = orders.select_related("payment_account").order_by("-created_at")[:8]

    return {
        "today_amount": str(today["amount"] or Decimal("0")),
        "today_count": today["count"] or 0,
        "total_amount": str(totals["amount"] or Decimal("0")),
        "paid_count": paid_count,
        "pending_count": pending_count,
        "review_count": review_count,
        "success_rate": success_rate,
        "chart": chart,
        "recent_orders": [serialize_order(o) for o in recent],
    }
