from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from datetime import datetime, timezone

from app.database import get_db
from app.schemas import HealthResponse
from app.cache import get_last_ingestion_time, get_error_count, redis_client

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health_check(
    db: AsyncSession = Depends(get_db),
):
    """Health check with ingestion status and system metrics."""
    status = "healthy"
    db_connected = False
    redis_connected = False
    last_ingestion = None
    staleness_minutes = None
    error_rate = 0.0

    # Check database
    try:
        await db.execute(text("SELECT 1"))
        db_connected = True
    except Exception:
        status = "degraded"

    # Check Redis
    try:
        await redis_client.ping()
        redis_connected = True
    except Exception:
        status = "degraded"

    # Get last ingestion time
    try:
        last_ingestion_str = await get_last_ingestion_time()
        if last_ingestion_str:
            last_ingestion = datetime.fromisoformat(last_ingestion_str)
            now = datetime.now(timezone.utc)
            staleness_minutes = (now - last_ingestion).total_seconds() / 60
            if staleness_minutes > 30:
                status = "stale"
    except Exception:
        pass

    # Calculate error rate
    try:
        error_count = await get_error_count()
        # Rough estimate: assume ~4 ingestion runs per hour
        error_rate = min(error_count / max(4, 1), 1.0)
        if error_rate > 0.05:
            status = "degraded"
    except Exception:
        pass

    return HealthResponse(
        status=status,
        last_ingestion=last_ingestion,
        staleness_minutes=round(staleness_minutes, 1) if staleness_minutes is not None else None,
        api_error_rate=round(error_rate, 3),
        database_connected=db_connected,
        redis_connected=redis_connected,
    )
