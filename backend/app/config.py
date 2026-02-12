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
    FEED_CACHE_TTL: int = 300  # 5 minutes
    CATEGORY_CACHE_TTL: int = 3600  # 1 hour
    MARKET_CACHE_TTL: int = 300  # 5 minutes
    INGESTION_INTERVAL: int = 900  # 15 minutes in seconds

    # Staleness threshold (seconds)
    STALENESS_THRESHOLD: int = 1800  # 30 minutes

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()
