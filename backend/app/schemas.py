from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class SnapshotSchema(BaseModel):
    market_id: str
    timestamp: datetime
    yes_price: float
    no_price: float
    volume: float
    open_interest: float

    class Config:
        from_attributes = True


class PricePoint(BaseModel):
    timestamp: datetime
    price: float


class MarketCard(BaseModel):
    """Compact market data for feed cards."""
    id: str
    question: str
    category: str
    current_price: float
    price_24h_ago: Optional[float] = None
    delta: Optional[float] = None
    volume: float
    resolution_date: Optional[datetime] = None
    status: str
    is_featured: bool = False
    image_url: Optional[str] = None
    slug: Optional[str] = None

    class Config:
        from_attributes = True


class MarketDetail(BaseModel):
    """Full market data for detail view."""
    id: str
    question: str
    description: Optional[str] = None
    category: str
    current_price: float
    price_24h_ago: Optional[float] = None
    delta: Optional[float] = None
    volume: float
    open_interest: float
    resolution_date: Optional[datetime] = None
    created_at: datetime
    status: str
    is_featured: bool = False
    outcomes: Optional[dict] = None
    image_url: Optional[str] = None
    slug: Optional[str] = None
    last_updated: datetime
    price_history: list[PricePoint] = []

    class Config:
        from_attributes = True


class CategoryInfo(BaseModel):
    name: str
    slug: str
    market_count: int
    featured_market_ids: list[str] = []


class FeedResponse(BaseModel):
    markets: list[MarketCard]
    total: int
    limit: int
    offset: int


class HealthResponse(BaseModel):
    status: str
    last_ingestion: Optional[datetime] = None
    staleness_minutes: Optional[float] = None
    api_error_rate: float = 0.0
    database_connected: bool = False
    redis_connected: bool = False
