from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    business_name = models.CharField(max_length=120, blank=True)
    is_merchant_active = models.BooleanField(default=True)

    webhook_url = models.URLField(blank=True)
    webhook_secret = models.CharField(max_length=64, blank=True)
    sandbox_webhook_url = models.URLField(blank=True)
    sandbox_webhook_secret = models.CharField(max_length=64, blank=True)

    api_key = models.CharField(max_length=64, unique=True, null=True, blank=True)
    api_secret = models.CharField(max_length=64, blank=True)
    sandbox_api_key = models.CharField(max_length=64, unique=True, null=True, blank=True)
    sandbox_api_secret = models.CharField(max_length=64, blank=True)

    def display_name(self):
        return self.business_name or self.username


class PaymentAccount(models.Model):
    PROVIDER_CHOICES = [
        ("manual", "Manual"),
        ("paytm_business", "Paytm Business"),
        ("paytm_pg", "Paytm PG"),
        ("phonepe_pg", "PhonePe PG"),
    ]

    user = models.ForeignKey(
        User, related_name="payment_accounts", on_delete=models.CASCADE
    )
    label = models.CharField(max_length=80)
    upi_id = models.CharField(max_length=120)
    provider = models.CharField(
        max_length=20, choices=PROVIDER_CHOICES, default="manual"
    )
    daily_limit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    received_today = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.label} ({self.upi_id})"


class Order(models.Model):
    PENDING = "pending"
    REVIEW = "review"
    PAID = "paid"
    EXPIRED = "expired"
    FAILED = "failed"

    STATUS_CHOICES = [
        (PENDING, "Pending"),
        (REVIEW, "Review"),
        (PAID, "Paid"),
        (EXPIRED, "Expired"),
        (FAILED, "Failed"),
    ]

    ENVIRONMENT_CHOICES = [
        ("live", "Live"),
        ("sandbox", "Sandbox"),
    ]

    user = models.ForeignKey(User, related_name="orders", on_delete=models.CASCADE)
    payment_account = models.ForeignKey(
        PaymentAccount, null=True, blank=True, on_delete=models.SET_NULL
    )
    order_no = models.CharField(max_length=32, unique=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    note = models.CharField(max_length=255, blank=True)
    customer_name = models.CharField(max_length=120, blank=True)
    customer_email = models.EmailField(blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=PENDING)
    environment = models.CharField(
        max_length=10, choices=ENVIRONMENT_CHOICES, default="live"
    )
    utr = models.CharField(max_length=32, blank=True)
    customer_utr = models.CharField(max_length=32, blank=True)
    utr_submitted_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.order_no


class WebhookLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    order = models.ForeignKey(Order, null=True, blank=True, on_delete=models.SET_NULL)
    event = models.CharField(max_length=40)
    url = models.URLField()
    payload = models.JSONField(default=dict)
    response_status = models.IntegerField(null=True)
    attempts = models.IntegerField(default=0)
    success = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.event} -> {self.url}"


class WebhookOutbox(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("delivered", "Delivered"),
        ("failed", "Failed"),
    ]

    user = models.ForeignKey(
        User, related_name="webhook_outbox", on_delete=models.CASCADE
    )
    order = models.ForeignKey(Order, null=True, blank=True, on_delete=models.SET_NULL)
    event = models.CharField(max_length=40)
    url = models.URLField()
    payload = models.JSONField(default=dict)
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default="pending")
    attempts = models.IntegerField(default=0)
    next_attempt_at = models.DateTimeField(null=True, blank=True)
    last_response_status = models.IntegerField(null=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.event} [{self.status}] -> {self.url}"


class AdminAuditLog(models.Model):
    admin = models.ForeignKey(
        User, related_name="audit_logs", on_delete=models.CASCADE
    )
    action = models.CharField(max_length=80)
    meta = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.admin} - {self.action}"
