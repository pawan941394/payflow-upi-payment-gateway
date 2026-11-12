import secrets
from datetime import datetime, timedelta, timezone

import jwt
from django.conf import settings as dj_settings
from django.contrib.auth import get_user_model
from fastapi import APIRouter, Depends, HTTPException

from api.deps import get_current_user
from api.schemas import LoginRequest, RegisterRequest, serialize_user

router = APIRouter(prefix="/auth", tags=["auth"])


def make_token(user) -> str:
    payload = {
        "sub": str(user.id),
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, dj_settings.SECRET_KEY, algorithm="HS256")


@router.post("/register")
def register(body: RegisterRequest):
    User = get_user_model()
    if User.objects.filter(username__iexact=body.username).exists():
        raise HTTPException(status_code=400, detail="Username is already taken")
    if User.objects.filter(email__iexact=body.email).exists():
        raise HTTPException(status_code=400, detail="Email is already registered")

    user = User(
        username=body.username,
        email=body.email,
        business_name=body.business_name,
        api_key="pk_live_" + secrets.token_hex(16),
        api_secret="sk_live_" + secrets.token_hex(24),
        sandbox_api_key="pk_test_" + secrets.token_hex(16),
        sandbox_api_secret="sk_test_" + secrets.token_hex(24),
        webhook_secret=secrets.token_hex(24),
        sandbox_webhook_secret=secrets.token_hex(24),
    )
    user.set_password(body.password)
    user.save()
    return {"token": make_token(user), "user": serialize_user(user)}


@router.post("/login")
def login(body: LoginRequest):
    User = get_user_model()
    user = User.objects.filter(username__iexact=body.username).first()
    if user is None or not user.check_password(body.password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")
    return {"token": make_token(user), "user": serialize_user(user)}


@router.get("/me")
def me(user=Depends(get_current_user)):
    return serialize_user(user)
