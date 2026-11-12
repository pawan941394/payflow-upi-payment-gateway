import secrets
from datetime import timedelta
from decimal import Decimal
from typing import Optional

from django.utils import timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field

from api.merchant_auth import get_api_merchant
from api.schemas import serialize_account, serialize_order
from api.services.qr import upi_intent

router = APIRouter(prefix="/v1", tags=["merchant-api"])


class ApiOrderCreateRequest(BaseModel):
    amount: Decimal = Field(gt=0)
    note: Optional[str] = Field(default=None, max_length=255)
    customer_name: Optional[str] = Field(default=None, max_length=255)
    customer_email: Optional[EmailStr] = None
    expiry_minutes: int = Field(default=15, ge=1, le=1440)


def _get_order(user, environment: str, order_no: str):
    order = user.orders.filter(order_no=order_no, environment=environment).first()
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


def _order_response(order):
    data = serialize_order(order)
    data["pay_url"] = f"/pay/{order.order_no}"
    account = order.payment_account
    data["upi_intent"] = (
        upi_intent(account.upi_id, order.user.display_name(), order.amount, order.order_no)
        if account
        else None
    )
    return data


@router.post("/orders")
def create_order(body: ApiOrderCreateRequest, merchant=Depends(get_api_merchant)):
    user, environment = merchant
    account = user.payment_accounts.filter(is_default=True, is_active=True).first()
    if account is None:
        account = user.payment_accounts.filter(is_active=True).first()
    if account is None:
        raise HTTPException(status_code=400, detail="No active payment account")

    order = user.orders.create(
        payment_account=account,
        order_no="ORD" + secrets.token_hex(5).upper(),
        amount=body.amount,
        note=body.note or "",
        customer_name=body.customer_name or "",
        customer_email=body.customer_email or "",
        environment=environment,
        status="pending",
        expires_at=timezone.now() + timedelta(minutes=body.expiry_minutes),
    )
    return _order_response(order)


@router.get("/orders")
def list_orders(
    status: str = "",
    page: int = 1,
    per_page: int = 20,
    merchant=Depends(get_api_merchant),
):
    user, environment = merchant
    qs = user.orders.filter(environment=environment).order_by("-created_at")
    if status:
        qs = qs.filter(status=status)
    total = qs.count()
    per_page = max(1, min(per_page, 100))
    page = max(1, page)
    items = qs.select_related("payment_account")[(page - 1) * per_page : page * per_page]
    return {"items": [serialize_order(o) for o in items], "total": total, "page": page, "per_page": per_page}


@router.get("/orders/{order_no}")
def get_order(order_no: str, merchant=Depends(get_api_merchant)):
    user, environment = merchant
    return _order_response(_get_order(user, environment, order_no))


@router.post("/orders/{order_no}/recheck")
def recheck_order(order_no: str, merchant=Depends(get_api_merchant)):
    user, environment = merchant
    order = _get_order(user, environment, order_no)
    from api.services.verification import verify_order

    result = verify_order(order)
    order.refresh_from_db()
    return {"result": result, "order": serialize_order(order)}


@router.get("/accounts")
def list_accounts(merchant=Depends(get_api_merchant)):
    user, _environment = merchant
    accounts = user.payment_accounts.order_by("-is_default", "-created_at")
    return [serialize_account(a) for a in accounts]
