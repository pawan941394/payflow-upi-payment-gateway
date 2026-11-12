import secrets

from django.contrib.auth import get_user_model
from fastapi import APIRouter, Depends, HTTPException

from api.deps import get_current_user
from api.schemas import ProfileUpdateRequest, WebhookUpdateRequest, mask, serialize_user

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("")
def get_settings(user=Depends(get_current_user)):
    return {
        "profile": serialize_user(user),
        "webhook_url": user.webhook_url,
        "sandbox_webhook_url": user.sandbox_webhook_url,
        "api_key": user.api_key,
        "api_secret_masked": mask(user.api_secret),
        "sandbox_api_key": user.sandbox_api_key,
        "sandbox_api_secret_masked": mask(user.sandbox_api_secret),
        "webhook_secret_masked": mask(user.webhook_secret),
        "sandbox_webhook_secret_masked": mask(user.sandbox_webhook_secret),
    }


@router.put("/profile")
def update_profile(body: ProfileUpdateRequest, user=Depends(get_current_user)):
    User = get_user_model()
    if User.objects.filter(email__iexact=body.email).exclude(pk=user.pk).exists():
        raise HTTPException(status_code=400, detail="Email is already in use")
    user.business_name = body.business_name
    user.email = body.email
    user.save(update_fields=["business_name", "email"])
    return serialize_user(user)


@router.put("/webhook")
def update_webhook(body: WebhookUpdateRequest, user=Depends(get_current_user)):
    user.webhook_url = body.webhook_url or ""
    user.save(update_fields=["webhook_url"])
    return {"webhook_url": user.webhook_url}


@router.put("/sandbox-webhook")
def update_sandbox_webhook(body: WebhookUpdateRequest, user=Depends(get_current_user)):
    user.sandbox_webhook_url = body.webhook_url or ""
    user.save(update_fields=["sandbox_webhook_url"])
    return {"sandbox_webhook_url": user.sandbox_webhook_url}


@router.post("/regenerate-keys")
def regenerate_keys(user=Depends(get_current_user)):
    user.api_key = "pk_live_" + secrets.token_hex(16)
    user.api_secret = "sk_live_" + secrets.token_hex(24)
    user.save(update_fields=["api_key", "api_secret"])
    return {"api_key": user.api_key, "api_secret": user.api_secret}


@router.post("/regenerate-sandbox-keys")
def regenerate_sandbox_keys(user=Depends(get_current_user)):
    user.sandbox_api_key = "pk_test_" + secrets.token_hex(16)
    user.sandbox_api_secret = "sk_test_" + secrets.token_hex(24)
    user.save(update_fields=["sandbox_api_key", "sandbox_api_secret"])
    return {"sandbox_api_key": user.sandbox_api_key, "sandbox_api_secret": user.sandbox_api_secret}


@router.post("/regenerate-webhook-secret")
def regenerate_webhook_secret(user=Depends(get_current_user)):
    user.webhook_secret = secrets.token_hex(24)
    user.save(update_fields=["webhook_secret"])
    return {"webhook_secret": user.webhook_secret}


@router.post("/regenerate-sandbox-webhook-secret")
def regenerate_sandbox_webhook_secret(user=Depends(get_current_user)):
    user.sandbox_webhook_secret = secrets.token_hex(24)
    user.save(update_fields=["sandbox_webhook_secret"])
    return {"sandbox_webhook_secret": user.sandbox_webhook_secret}
