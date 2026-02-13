"""Celery tasks for Polymarket data ingestion.

This module is fully synchronous — no async/await, no event loops.
It uses sync httpx (via PolymarketClient) and sync Redis so it runs
safely in Celery workers and background threads.
"""

import json
import logging
from datetime import datetime, timezone, timedelta

import redis
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def get_sync_engine():
    """Create a synchronous SQLAlchemy engine."""
    return create_engine(settings.DATABASE_URL_SYNC, pool_pre_ping=True)


def get_sync_redis():
    """Create a synchronous Redis client."""
    return redis.from_url(settings.REDIS_URL, decode_responses=True)


def ingest_markets_task():
    """
    Main ingestion task: fetch markets from Polymarket and store snapshots.

    This runs every 2 minutes via Celery Beat, and once on startup.
    Idempotent: duplicate snapshots are prevented by composite PK.
    Fully synchronous — safe for threads and Celery workers.
    """
    logger.info("Starting market ingestion...")
    engine = get_sync_engine()
    rds = get_sync_redis()
    now = datetime.now(timezone.utc)

    try:
        # Ensure schema additions exist before writes (safe for repeated runs).
        with Session(engine) as session:
            _ensure_markets_schema(session)
            session.commit()

        # Fetch markets from Polymarket (sync HTTP)
        from app.ingestion.polymarket import PolymarketClient
        client = PolymarketClient()

        all_markets_by_id: dict[str, dict] = {}
        active_batch_size = 100
        resolved_batch_size = settings.RESOLVED_FETCH_BATCH_SIZE
        max_active_pages = settings.MAX_ACTIVE_PAGES
        max_resolved_pages = settings.MAX_RESOLVED_PAGES
        resolved_cutoff = now - timedelta(hours=settings.RECENTLY_RESOLVED_WINDOW_HOURS)

        try:
            active_offset = 0
            for _ in range(max_active_pages):
                markets = client.fetch_markets(
                    limit=active_batch_size,
                    offset=active_offset,
                    active=True,
                    closed=False,
                    order="volume",
                    ascending=False,
                )
                if not markets:
                    break
                for market in markets:
                    all_markets_by_id[market["id"]] = market
                active_offset += active_batch_size

                # Track API request count
                _increment_counter(rds, "polynews:requests:daily", ttl=86400)

            resolved_offset = 0
            for _ in range(max_resolved_pages):
                markets = client.fetch_recently_resolved_markets(
                    limit=resolved_batch_size,
                    offset=resolved_offset,
                )
                if not markets:
                    break

                for market in markets:
                    all_markets_by_id[market["id"]] = market

                resolved_offset += resolved_batch_size

                # Track API request count
                _increment_counter(rds, "polynews:requests:daily", ttl=86400)

                # Stop once we have likely covered recently closed markets.
                closed_times = [m.get("closed_time") for m in markets if m.get("closed_time")]
                if closed_times:
                    oldest_closed_time = min(closed_times)
                    if oldest_closed_time < resolved_cutoff:
                        logger.info(
                            "Resolved fetch reached cutoff at offset %s (oldest closed_time=%s)",
                            resolved_offset,
                            oldest_closed_time.isoformat(),
                        )
                        break
                elif len(markets) < resolved_batch_size:
                    break

            # Reconcile stale active rows (past resolution date) by direct ID lookup.
            with Session(engine) as session:
                stale_market_ids = _get_stale_active_market_ids(
                    session,
                    settings.STALE_ACTIVE_RECONCILE_LIMIT,
                    settings.STALE_ACTIVE_RECHECK_MINUTES,
                )

            reconciled_requests = 0
            reconciled_markets = 0
            if stale_market_ids:
                logger.info(
                    "Reconciling %s stale active markets by ID",
                    len(stale_market_ids),
                )
            for market_id in stale_market_ids:
                refreshed = client.fetch_market(market_id)
                reconciled_requests += 1
                if refreshed:
                    all_markets_by_id[market_id] = refreshed
                    reconciled_markets += 1
            if reconciled_requests:
                _increment_counter(
                    rds,
                    "polynews:requests:daily",
                    count=reconciled_requests,
                    ttl=86400,
                )
                logger.info(
                    "Reconciled stale active markets: %s refreshed via direct lookup",
                    reconciled_markets,
                )
        finally:
            client.close()

        all_markets = list(all_markets_by_id.values())
        logger.info(f"Fetched {len(all_markets)} markets from Polymarket")

        if not all_markets:
            logger.warning("No markets fetched, skipping ingestion")
            return

        errors = 0

        # Write to database
        with Session(engine) as session:
            for market_data in all_markets:
                try:
                    # Upsert market
                    session.execute(
                        text("""
                            INSERT INTO markets (id, question, description, category,
                                resolution_date, closed_time, resolution_status,
                                created_at, status, last_updated, outcomes, image_url, slug)
                            VALUES (:id, :question, :description, :category,
                                :resolution_date, :closed_time, :resolution_status,
                                :created_at, :status, :last_updated, :outcomes, :image_url, :slug)
                            ON CONFLICT (id) DO UPDATE SET
                                question = EXCLUDED.question,
                                description = EXCLUDED.description,
                                category = EXCLUDED.category,
                                resolution_date = EXCLUDED.resolution_date,
                                closed_time = EXCLUDED.closed_time,
                                resolution_status = EXCLUDED.resolution_status,
                                status = EXCLUDED.status,
                                last_updated = EXCLUDED.last_updated,
                                outcomes = EXCLUDED.outcomes,
                                image_url = EXCLUDED.image_url,
                                slug = EXCLUDED.slug
                        """),
                        {
                            "id": market_data["id"],
                            "question": market_data["question"],
                            "description": market_data.get("description"),
                            "category": market_data["category"],
                            "resolution_date": market_data.get("resolution_date"),
                            "closed_time": market_data.get("closed_time"),
                            "resolution_status": market_data.get("resolution_status"),
                            "created_at": market_data.get("created_at", now),
                            "status": market_data.get("status", "active"),
                            "last_updated": now,
                            "outcomes": json.dumps(market_data.get("outcomes")) if market_data.get("outcomes") else None,
                            "image_url": market_data.get("image_url"),
                            "slug": market_data.get("slug"),
                        },
                    )

                    # Insert snapshot (append-only)
                    session.execute(
                        text("""
                            INSERT INTO snapshots (market_id, timestamp, yes_price, no_price, volume, open_interest)
                            VALUES (:market_id, :timestamp, :yes_price, :no_price, :volume, :open_interest)
                            ON CONFLICT (market_id, timestamp) DO NOTHING
                        """),
                        {
                            "market_id": market_data["id"],
                            "timestamp": now,
                            "yes_price": market_data["yes_price"],
                            "no_price": market_data["no_price"],
                            "volume": market_data["volume"],
                            "open_interest": market_data["open_interest"],
                        },
                    )

                except Exception as e:
                    errors += 1
                    logger.error(f"Error ingesting market {market_data.get('id', 'unknown')}: {e}")

                    # Log ingestion error
                    try:
                        session.execute(
                            text("""
                                INSERT INTO ingestion_errors (market_id, error_message, retry_count)
                                VALUES (:market_id, :error_message, 0)
                            """),
                            {
                                "market_id": market_data.get("id", "unknown"),
                                "error_message": str(e)[:500],
                            },
                        )
                    except Exception:
                        pass

            session.commit()

        with Session(engine) as session:
            _log_data_quality_metrics(session)

        # Refresh materialized view
        try:
            with Session(engine) as session:
                session.execute(text("SELECT refresh_trending_view()"))
                session.commit()
            logger.info("Refreshed trending materialized view")
        except Exception as e:
            logger.error(f"Error refreshing trending view: {e}")

        # Update last ingestion timestamp (sync Redis)
        rds.set("polynews:last_ingestion", now.isoformat())

        # Clear feed caches so new data is served
        _delete_keys_by_pattern(rds, "polynews:feed:*")
        _delete_keys_by_pattern(rds, "polynews:market:*")
        rds.delete("polynews:categories")

        # Track errors
        if errors > 0:
            _increment_counter(rds, "polynews:errors:hourly", count=errors, ttl=3600)

        logger.info(
            f"Ingestion complete: {len(all_markets)} markets processed, {errors} errors"
        )

    except Exception as e:
        logger.error(f"Ingestion task failed: {e}")
        _increment_counter(rds, "polynews:errors:hourly", ttl=3600)
        raise

    finally:
        engine.dispose()
        rds.close()


def _increment_counter(rds, key: str, count: int = 1, ttl: int = 3600):
    """Increment a Redis counter with TTL."""
    try:
        pipe = rds.pipeline()
        pipe.incrby(key, count)
        pipe.expire(key, ttl)
        pipe.execute()
    except Exception:
        logger.exception("Failed to increment Redis counter: %s", key)


def _ensure_markets_schema(session: Session):
    """Create additive schema columns used for resolution correctness."""
    session.execute(text("ALTER TABLE markets ADD COLUMN IF NOT EXISTS closed_time TIMESTAMPTZ"))
    session.execute(text("ALTER TABLE markets ADD COLUMN IF NOT EXISTS resolution_status TEXT"))
    session.execute(
        text("CREATE INDEX IF NOT EXISTS idx_markets_closed_time ON markets(closed_time DESC)")
    )


def _get_stale_active_market_ids(
    session: Session,
    limit: int,
    recheck_minutes: int,
) -> list[str]:
    """Find active markets whose resolution date has already passed."""
    rows = session.execute(
        text("""
            SELECT id
            FROM markets
            WHERE status = 'active'
                AND resolution_date IS NOT NULL
                AND resolution_date < NOW()
                AND last_updated < NOW() - (:recheck_minutes * INTERVAL '1 minute')
            ORDER BY resolution_date DESC
            LIMIT :limit
        """),
        {
            "limit": limit,
            "recheck_minutes": recheck_minutes,
        },
    ).fetchall()
    return [row.id for row in rows]


def _log_data_quality_metrics(session: Session):
    """Emit warnings when market status appears out of sync."""
    active_past_resolution = session.execute(
        text("""
            SELECT COUNT(*)
            FROM markets
            WHERE status = 'active'
                AND resolution_date IS NOT NULL
                AND resolution_date < NOW()
        """)
    ).scalar() or 0
    if active_past_resolution > 0:
        logger.warning(
            "Data quality: %s active markets have resolution_date in the past",
            active_past_resolution,
        )


def _delete_keys_by_pattern(rds, pattern: str):
    """Delete all Redis keys matching a pattern."""
    try:
        cursor = 0
        while True:
            cursor, keys = rds.scan(cursor=cursor, match=pattern, count=100)
            if keys:
                rds.delete(*keys)
            if cursor == 0:
                break
    except Exception:
        logger.exception("Failed to delete Redis keys for pattern: %s", pattern)
