from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from gateway.models import WebhookLog, WebhookOutbox


class Command(BaseCommand):
    help = "Delete old webhook logs and settled outbox entries."

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=30)

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(days=options["days"])
        logs_deleted, _ = WebhookLog.objects.filter(created_at__lt=cutoff).delete()
        outbox_deleted, _ = WebhookOutbox.objects.filter(
            status__in=["delivered", "failed"], created_at__lt=cutoff
        ).delete()
        self.stdout.write(
            f"webhook_logs_deleted={logs_deleted} outbox_deleted={outbox_deleted}"
        )
