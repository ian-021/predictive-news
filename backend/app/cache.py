import json
import logging
import redis.asyncio as aioredis
from typing import Optional, Any
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

redis_client = aioredis.from_url(
    settings.REDIS_URL,
    encoding="utf-8",
    decode_responses=True,
)


async def cache_get(key: str) -> Optional[Any]:
    """Get value from Redis cache."""
    try:
        value = await redis_client.get(key)
        if value:
            return json.loads(value)
    except Exception:
        logger.exception("Cache read failure for key: %s", key)
    return None


async def cache_set(key: str, value: Any, ttl: int = 300) -> None:
    """Set value in Redis cache with TTL."""
    try:
        await redis_client.set(key, json.dumps(value, default=str), ex=ttl)
    except Exception:
        logger.exception("Cache write failure for key: %s", key)


async def cache_delete(key: str) -> None:
    """Delete key from Redis cache."""
    try:
        await redis_client.delete(key)
    except Exception:
        logger.exception("Cache delete failure for key: %s", key)


async def cache_delete_pattern(pattern: str) -> None:
    """Delete all keys matching pattern."""
    try:
        keys = []
        async for key in redis_client.scan_iter(match=pattern):
            keys.append(key)
        if keys:
            await redis_client.delete(*keys)
    except Exception:
        logger.exception("Cache pattern delete failure for pattern: %s", pattern)


async def get_last_ingestion_time() -> Optional[str]:
    """Get the timestamp of the last successful ingestion."""
    try:
        return await redis_client.get("polynews:last_ingestion")
    except Exception:
        logger.exception("Failed to read last ingestion timestamp")
        return None


async def set_last_ingestion_time(timestamp: str) -> None:
    """Set the timestamp of the last successful ingestion."""
    try:
        await redis_client.set("polynews:last_ingestion", timestamp)
    except Exception:
        logger.exception("Failed to write last ingestion timestamp")


async def increment_error_count() -> None:
    """Increment the hourly API error counter."""
    try:
        key = "polynews:errors:hourly"
        pipe = redis_client.pipeline()
        await pipe.incr(key)
        await pipe.expire(key, 3600)
        await pipe.execute()
    except Exception:
        logger.exception("Failed to increment error counter")


async def get_error_count() -> int:
    """Get the hourly API error count."""
    try:
        count = await redis_client.get("polynews:errors:hourly")
        return int(count) if count else 0
    except Exception:
        logger.exception("Failed to read error counter")
        return 0


async def get_request_count() -> int:
    """Get the daily Polymarket API request count."""
    try:
        count = await redis_client.get("polynews:requests:daily")
        return int(count) if count else 0
    except Exception:
        logger.exception("Failed to read request counter")
        return 0


async def increment_request_count() -> None:
    """Increment the daily Polymarket API request counter."""
    try:
        key = "polynews:requests:daily"
        pipe = redis_client.pipeline()
        await pipe.incr(key)
        await pipe.expire(key, 86400)
        await pipe.execute()
    except Exception:
        logger.exception("Failed to increment request counter")
