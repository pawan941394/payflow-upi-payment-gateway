from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from api.deps import get_current_user

router = APIRouter(tags=["password"])


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


@router.put("/settings/password")
def change_password(body: PasswordChangeRequest, user=Depends(get_current_user)):
    if not user.check_password(body.current_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    user.set_password(body.new_password)
    user.save(update_fields=["password"])
    return {"ok": True}
