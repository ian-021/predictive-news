from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://polynews:polynews_dev@localhost:5432/polynews"
    DATABASE_URL_SYNC: str = "postgresql://polynews:polynews_dev@localhost:5432/polynews"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Polymarket
    POLYMARKET_API_URL: str = "https://gamma-api.polymarket.com"
    POLYMARKET_RATE_LIMIT: int = 100  # requests per minute
    POLYMARKET_DAILY_LIMIT: int = 10000

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000"

    # App
    ENV: str = "development"
    FEED_CACHE_TTL: int = 90  # 90 seconds
    CATEGORY_CACHE_TTL: int = 3600  # 1 hour
    MARKET_CACHE_TTL: int = 90  # 90 seconds
    INGESTION_INTERVAL: int = 120  # 2 minutes in seconds
    MAX_ACTIVE_PAGES: int = 5
    MAX_RESOLVED_PAGES: int = 6
    RESOLVED_FETCH_BATCH_SIZE: int = 250
    RECENTLY_RESOLVED_WINDOW_HOURS: int = 24
    STALE_ACTIVE_RECONCILE_LIMIT: int = 100
    STALE_ACTIVE_RECHECK_MINUTES: int = 60

    # Staleness threshold (seconds)
    STALENESS_THRESHOLD: int = 300  # 5 minutes

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()
