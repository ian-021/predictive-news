from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.database import get_db
from app.schemas import CategoryInfo
from app.cache import cache_get, cache_set
from app.config import get_settings

router = APIRouter(prefix="/api/categories", tags=["categories"])
settings = get_settings()

# Category display names and slugs
CATEGORIES = [
    {"name": "Politics", "slug": "politics"},
    {"name": "Crypto", "slug": "crypto"},
    {"name": "Sports", "slug": "sports"},
    {"name": "Tech", "slug": "tech"},
    {"name": "Other", "slug": "other"},
]

# Mapping from Polymarket categories to our taxonomy
CATEGORY_MAPPING = {
    "politics": "politics",
    "us-politics": "politics",
    "us politics": "politics",
    "world-politics": "politics",
    "elections": "politics",
    "geopolitics": "politics",
    "crypto": "crypto",
    "cryptocurrency": "crypto",
    "bitcoin": "crypto",
    "ethereum": "crypto",
    "defi": "crypto",
    "nft": "crypto",
    "sports": "sports",
    "nfl": "sports",
    "nba": "sports",
    "mlb": "sports",
    "soccer": "sports",
    "football": "sports",
    "mma": "sports",
    "tech": "tech",
    "technology": "tech",
    "ai": "tech",
    "science": "tech",
    "space": "tech",
    "pop culture": "other",
    "entertainment": "other",
    "culture": "other",
    "business": "other",
    "finance": "other",
    "weather": "other",
}


def map_category(raw_category: str) -> str:
    """Map a Polymarket category to our taxonomy."""
    if not raw_category:
        return "other"
    normalized = raw_category.lower().strip()
    return CATEGORY_MAPPING.get(normalized, "other")


@router.get("", response_model=list[CategoryInfo])
async def get_categories(
    db: AsyncSession = Depends(get_db),
):
    """Returns categories with market counts and featured markets."""
    # Check cache
    cache_key = "polynews:categories"
    cached = await cache_get(cache_key)
    if cached:
        return [CategoryInfo(**c) for c in cached]

    categories = []
    for cat in CATEGORIES:
        # Count markets in category
        count_query = text("""
            SELECT COUNT(*) FROM markets
            WHERE category = :category AND status = 'active'
        """)
        count_result = await db.execute(count_query, {"category": cat["slug"]})
        market_count = count_result.scalar() or 0

        # Get featured market IDs (top 10 by volume * recency)
        featured_query = text("""
            SELECT m.id
            FROM markets m
            LEFT JOIN (
                SELECT DISTINCT ON (market_id)
                    market_id, volume, timestamp
                FROM snapshots
                ORDER BY market_id, timestamp DESC
            ) s ON m.id = s.market_id
            WHERE m.category = :category
                AND m.status = 'active'
            ORDER BY COALESCE(s.volume, 0) DESC
            LIMIT 10
        """)
        featured_result = await db.execute(featured_query, {"category": cat["slug"]})
        featured_ids = [row.id for row in featured_result.fetchall()]

        categories.append(CategoryInfo(
            name=cat["name"],
            slug=cat["slug"],
            market_count=market_count,
            featured_market_ids=featured_ids,
        ))

    # Cache for 1 hour
    await cache_set(
        cache_key,
        [c.model_dump() for c in categories],
        ttl=settings.CATEGORY_CACHE_TTL,
    )

    return categories
