from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=150)
    email: EmailStr
    password: str = Field(min_length=8)
    business_name: str = Field(min_length=2, max_length=255)


class LoginRequest(BaseModel):
    username: str
    password: str


class AccountCreateRequest(BaseModel):
    label: str = Field(min_length=1, max_length=255)
    upi_id: str = Field(min_length=3, max_length=255)
    provider: str = Field(default="manual", pattern="^(manual|paytm_business|paytm_pg|phonepe_pg)$")
    daily_limit: Decimal = Field(default=Decimal("0"), ge=0)


class AccountLimitRequest(BaseModel):
    daily_limit: Decimal = Field(ge=0)


class OrderCreateRequest(BaseModel):
    amount: Decimal = Field(gt=0)
    note: Optional[str] = Field(default=None, max_length=255)
    customer_name: Optional[str] = Field(default=None, max_length=255)
    customer_email: Optional[EmailStr] = None
    environment: str = Field(default="live", pattern="^(live|sandbox)$")
    expiry_minutes: int = Field(default=15, ge=1, le=1440)


class MarkPaidRequest(BaseModel):
    utr: Optional[str] = Field(default=None, max_length=22)


class UtrSubmitRequest(BaseModel):
    utr: str = Field(min_length=10, max_length=22, pattern="^[A-Za-z0-9]+$")


class ProfileUpdateRequest(BaseModel):
    business_name: str = Field(min_length=2, max_length=255)
    email: EmailStr


class WebhookUpdateRequest(BaseModel):
    webhook_url: Optional[str] = Field(default=None, max_length=500)


def mask(value):
    if not value:
        return None
    return value[:6] + "…" + value[-4:] if len(value) > 10 else "…"


def serialize_user(user):
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "business_name": user.business_name,
        "display_name": user.display_name(),
        "is_merchant_active": user.is_merchant_active,
        "is_staff": user.is_staff,
    }


def serialize_account(account):
    return {
        "id": account.id,
        "label": account.label,
        "upi_id": account.upi_id,
        "provider": account.provider,
        "daily_limit": str(account.daily_limit),
        "received_today": str(account.received_today),
        "is_active": account.is_active,
        "is_default": account.is_default,
        "created_at": account.created_at.isoformat() if account.created_at else None,
    }


def serialize_order(order):
    return {
        "id": order.id,
        "order_no": order.order_no,
        "amount": str(order.amount),
        "note": order.note,
        "customer_name": order.customer_name,
        "customer_email": order.customer_email,
        "status": order.status,
        "environment": order.environment,
        "utr": order.utr,
        "customer_utr": order.customer_utr,
        "utr_submitted_at": order.utr_submitted_at.isoformat() if order.utr_submitted_at else None,
        "paid_at": order.paid_at.isoformat() if order.paid_at else None,
        "expires_at": order.expires_at.isoformat() if order.expires_at else None,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "payment_account": serialize_account(order.payment_account) if order.payment_account else None,
    }
