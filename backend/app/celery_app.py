from celery import Celery
from celery.schedules import crontab
from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "polynews",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)

# Scheduled tasks
celery_app.conf.beat_schedule = {
    "ingest-markets": {
        "task": "polynews.ingest_markets",
        "schedule": settings.INGESTION_INTERVAL,  # 120 seconds = 2 minutes
    },
}


@celery_app.task(name="polynews.ingest_markets", bind=True, max_retries=3)
def ingest_markets(self):
    """Celery task wrapper for market ingestion."""
    try:
        from app.ingestion.tasks import ingest_markets_task
        ingest_markets_task()
    except Exception as exc:
        # Exponential backoff: 60s, 180s, 540s
        raise self.retry(exc=exc, countdown=60 * (3 ** self.request.retries))
