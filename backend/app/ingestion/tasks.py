"""Celery tasks for Polymarket data ingestion.

This module is fully synchronous — no async/await, no event loops.
It uses sync httpx (via PolymarketClient) and sync Redis so it runs
safely in Celery workers and background threads.
"""

import json
import logging
from datetime import datetime, timezone

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

    try:
        # Fetch markets from Polymarket (sync HTTP)
        from app.ingestion.polymarket import PolymarketClient
        client = PolymarketClient()

        all_markets = []
        offset = 0
        batch_size = 100

        try:
            for _ in range(5):  # Max 5 pages = 500 markets
                markets = client.fetch_markets(limit=batch_size, offset=offset)
                if not markets:
                    break
                all_markets.extend(markets)
                offset += batch_size

                # Track API request count
                _increment_counter(rds, "polynews:requests:daily", ttl=86400)
        finally:
            client.close()

        logger.info(f"Fetched {len(all_markets)} markets from Polymarket")

        if not all_markets:
            logger.warning("No markets fetched, skipping ingestion")
            return

        now = datetime.now(timezone.utc)
        errors = 0

        # Write to database
        with Session(engine) as session:
            for market_data in all_markets:
                try:
                    # Upsert market
                    session.execute(
                        text("""
                            INSERT INTO markets (id, question, description, category,
                                resolution_date, created_at, status, last_updated,
                                outcomes, image_url, slug)
                            VALUES (:id, :question, :description, :category,
                                :resolution_date, :created_at, :status, :last_updated,
                                :outcomes, :image_url, :slug)
                            ON CONFLICT (id) DO UPDATE SET
                                question = EXCLUDED.question,
                                description = EXCLUDED.description,
                                category = EXCLUDED.category,
                                resolution_date = EXCLUDED.resolution_date,
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
