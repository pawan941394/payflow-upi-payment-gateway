import time

from django.core.management.base import BaseCommand

from api.services.outbox import process_outbox


class Command(BaseCommand):
    help = "Deliver pending webhook outbox entries."

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=50)
        parser.add_argument("--loop", action="store_true")

    def handle(self, *args, **options):
        limit = options["limit"]
        while True:
            result = process_outbox(limit=limit)
            self.stdout.write(
                "processed={processed} delivered={delivered} "
                "failed={failed} rescheduled={rescheduled}".format(**result)
            )
            if not options["loop"]:
                break
            time.sleep(5)
