import hmac

from fastapi import Header, HTTPException


def get_api_merchant(
    x_api_key: str = Header(default="", alias="X-Api-Key"),
    x_api_secret: str = Header(default="", alias="X-Api-Secret"),
):
    from gateway.models import User

    if not x_api_key or not x_api_secret:
        raise HTTPException(status_code=401, detail="Missing X-Api-Key or X-Api-Secret header")

    user = User.objects.filter(api_key=x_api_key).first()
    environment = "live"
    if user is None:
        user = User.objects.filter(sandbox_api_key=x_api_key).first()
        environment = "sandbox"

    if user is None:
        raise HTTPException(status_code=401, detail="Invalid API credentials")

    expected = user.api_secret if environment == "live" else user.sandbox_api_secret
    if not expected or not hmac.compare_digest(expected, x_api_secret):
        raise HTTPException(status_code=401, detail="Invalid API credentials")

    if not user.is_merchant_active:
        raise HTTPException(status_code=403, detail="Merchant account is disabled")

    return user, environment
