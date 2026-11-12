from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import (
    AdminAuditLog,
    Order,
    PaymentAccount,
    User,
    WebhookLog,
    WebhookOutbox,
)


@admin.register(User)
class GatewayUserAdmin(UserAdmin):
    list_display = (
        "username",
        "email",
        "business_name",
        "is_merchant_active",
        "is_staff",
        "date_joined",
    )
    list_filter = ("is_merchant_active", "is_staff", "is_superuser", "is_active")
    search_fields = ("username", "email", "business_name", "api_key")
    fieldsets = UserAdmin.fieldsets + (
        (
            "Merchant",
            {
                "fields": (
                    "business_name",
                    "is_merchant_active",
                    "webhook_url",
                    "webhook_secret",
                    "sandbox_webhook_url",
                    "sandbox_webhook_secret",
                    "api_key",
                    "api_secret",
                    "sandbox_api_key",
                    "sandbox_api_secret",
                )
            },
        ),
    )


@admin.register(PaymentAccount)
class PaymentAccountAdmin(admin.ModelAdmin):
    list_display = (
        "label",
        "user",
        "upi_id",
        "provider",
        "daily_limit",
        "received_today",
        "is_active",
        "is_default",
        "created_at",
    )
    list_filter = ("provider", "is_active", "is_default")
    search_fields = ("label", "upi_id", "user__username", "user__business_name")


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "order_no",
        "user",
        "amount",
        "status",
        "environment",
        "created_at",
    )
    list_filter = ("status", "environment")
    search_fields = (
        "order_no",
        "utr",
        "customer_utr",
        "customer_name",
        "customer_email",
        "user__username",
    )
    date_hierarchy = "created_at"


@admin.register(WebhookLog)
class WebhookLogAdmin(admin.ModelAdmin):
    list_display = (
        "event",
        "user",
        "order",
        "url",
        "response_status",
        "attempts",
        "success",
        "created_at",
    )
    list_filter = ("event", "success")
    search_fields = ("url", "user__username", "order__order_no")


@admin.register(WebhookOutbox)
class WebhookOutboxAdmin(admin.ModelAdmin):
    list_display = (
        "status",
        "event",
        "attempts",
        "user",
        "order",
        "next_attempt_at",
        "delivered_at",
        "created_at",
    )
    list_filter = ("status", "event")
    search_fields = ("url", "user__username", "order__order_no")


@admin.register(AdminAuditLog)
class AdminAuditLogAdmin(admin.ModelAdmin):
    list_display = ("admin", "action", "created_at")
    list_filter = ("action",)
    search_fields = ("admin__username", "action")
