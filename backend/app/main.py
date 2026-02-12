import logging
from threading import Thread

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import get_settings
from app.api.markets import router as markets_router
from app.api.categories import router as categories_router
from app.api.health import router as health_router
from app.api.ingest import router as ingest_router

logger = logging.getLogger(__name__)
settings = get_settings()


def _run_initial_ingestion():
    """Run first ingestion in a background thread on startup."""
    import time
    time.sleep(5)  # Wait for DB to be fully ready
    try:
        from app.ingestion.tasks import ingest_markets_task
        logger.info("Running initial data ingestion on startup...")
        ingest_markets_task()
        logger.info("Initial ingestion complete.")
    except Exception as e:
        logger.error(f"Initial ingestion failed (will retry via Celery): {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: kick off first ingestion in background thread
    thread = Thread(target=_run_initial_ingestion, daemon=True)
    thread.start()
    yield
    # Shutdown
    from app.cache import redis_client
    await redis_client.close()


app = FastAPI(
    title="PolyNews API",
    description="Prediction market data as a news feed",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
    max_age=3600,
)

# Routers
app.include_router(markets_router)
app.include_router(categories_router)
app.include_router(health_router)
app.include_router(ingest_router)


@app.get("/")
async def root():
    return {
        "name": "PolyNews API",
        "version": "1.0.0",
        "docs": "/docs",
    }
