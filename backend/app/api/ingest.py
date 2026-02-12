from fastapi import APIRouter, BackgroundTasks

router = APIRouter(prefix="/api", tags=["ingestion"])


@router.post("/ingest")
async def trigger_ingestion(background_tasks: BackgroundTasks):
    """
    Manually trigger a market ingestion run.

    Runs the ingestion in the background so the request returns immediately.
    Useful for first-time setup and testing — in production, Celery Beat
    handles the every-15-minute schedule automatically.
    """
    background_tasks.add_task(_run_ingestion)
    return {
        "status": "started",
        "message": "Ingestion started in background. Check /api/health for status.",
    }


def _run_ingestion():
    """Run the ingestion task directly (outside Celery)."""
    from app.ingestion.tasks import ingest_markets_task

    ingest_markets_task()
