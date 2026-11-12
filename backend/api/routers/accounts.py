from fastapi import APIRouter, Depends, HTTPException

from api.deps import get_current_user
from api.schemas import AccountCreateRequest, AccountLimitRequest, serialize_account

router = APIRouter(prefix="/accounts", tags=["accounts"])


def _get_account(user, account_id: int):
    account = user.payment_accounts.filter(pk=account_id).first()
    if account is None:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


@router.get("")
def list_accounts(user=Depends(get_current_user)):
    accounts = user.payment_accounts.order_by("-is_default", "-created_at")
    return [serialize_account(a) for a in accounts]


@router.post("")
def create_account(body: AccountCreateRequest, user=Depends(get_current_user)):
    is_first = not user.payment_accounts.exists()
    account = user.payment_accounts.create(
        label=body.label,
        upi_id=body.upi_id,
        provider=body.provider,
        daily_limit=body.daily_limit,
        is_default=is_first,
    )
    return serialize_account(account)


@router.post("/{account_id}/toggle")
def toggle_account(account_id: int, user=Depends(get_current_user)):
    account = _get_account(user, account_id)
    account.is_active = not account.is_active
    account.save(update_fields=["is_active"])
    return serialize_account(account)


@router.post("/{account_id}/default")
def make_default(account_id: int, user=Depends(get_current_user)):
    account = _get_account(user, account_id)
    user.payment_accounts.update(is_default=False)
    account.is_default = True
    account.save(update_fields=["is_default"])
    return serialize_account(account)


@router.post("/{account_id}/limit")
def update_limit(account_id: int, body: AccountLimitRequest, user=Depends(get_current_user)):
    account = _get_account(user, account_id)
    account.daily_limit = body.daily_limit
    account.save(update_fields=["daily_limit"])
    return serialize_account(account)


@router.delete("/{account_id}")
def delete_account(account_id: int, user=Depends(get_current_user)):
    account = _get_account(user, account_id)
    was_default = account.is_default
    account.delete()
    if was_default:
        replacement = user.payment_accounts.filter(is_active=True).first() or user.payment_accounts.first()
        if replacement:
            replacement.is_default = True
            replacement.save(update_fields=["is_default"])
    return {"deleted": True}
