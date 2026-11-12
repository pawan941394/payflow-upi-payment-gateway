import os

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from fastapi import FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

from api.routers import (  # noqa: E402
    accounts,
    admin,
    auth,
    checkout,
    dashboard,
    merchant_api,
    orders,
    password,
    sandbox,
    settings,
)

app = FastAPI(title="UPI Gateway API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(accounts.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(settings.router, prefix="/api")
app.include_router(checkout.router, prefix="/api")
app.include_router(merchant_api.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(password.router, prefix="/api")
app.include_router(sandbox.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}
