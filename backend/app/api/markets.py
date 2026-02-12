from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Optional
from datetime import datetime, timezone

from app.database import get_db
from app.schemas import MarketCard, MarketDetail, FeedResponse, PricePoint
from app.cache import cache_get, cache_set
from app.config import get_settings
from app.scoring import calculate_interesting_score

router = APIRouter(prefix="/api/markets", tags=["markets"])
settings = get_settings()

VALID_CATEGORIES = {"politics", "crypto", "sports", "tech", "other"}
VALID_SORTS = {"trending", "interesting"}


@router.get("", response_model=FeedResponse)
async def get_markets(
    category: Optional[str] = Query(None, description="Filter by category"),
    sort: str = Query("interesting", description="Sort order: trending or interesting"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """Returns paginated feed of markets with latest snapshot data."""
    # Validate params
    if category and category not in VALID_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Invalid category. Must be one of: {', '.join(VALID_CATEGORIES)}")
    if sort not in VALID_SORTS:
        raise HTTPException(status_code=400, detail=f"Invalid sort. Must be one of: {', '.join(VALID_SORTS)}")

    # Check cache
    cache_key = f"polynews:feed:{category or 'all'}:{sort}:{limit}:{offset}"
    cached = await cache_get(cache_key)
    if cached:
        return FeedResponse(**cached)

    # Build query
    query = text("""
        WITH latest_snap AS (
            SELECT DISTINCT ON (s.market_id)
                s.market_id,
                s.yes_price AS current_price,
                s.no_price,
                s.volume,
                s.open_interest,
                s.timestamp
            FROM snapshots s
            ORDER BY s.market_id, s.timestamp DESC
        ),
        day_ago_snap AS (
            SELECT DISTINCT ON (s.market_id)
                s.market_id,
                s.yes_price AS price_24h_ago
            FROM snapshots s
            WHERE s.timestamp <= NOW() - INTERVAL '24 hours'
            ORDER BY s.market_id, s.timestamp DESC
        ),
        vol_ranks AS (
            SELECT
                market_id,
                RANK() OVER (ORDER BY SUM(volume) DESC) AS volume_rank
            FROM snapshots
            WHERE timestamp >= NOW() - INTERVAL '24 hours'
            GROUP BY market_id
        )
        SELECT
            m.id,
            m.question,
            m.category,
            m.resolution_date,
            m.status,
            m.is_featured,
            m.image_url,
            m.slug,
            COALESCE(ls.current_price, 0.5) AS current_price,
            d.price_24h_ago,
            ABS(COALESCE(ls.current_price, 0.5) - COALESCE(d.price_24h_ago, ls.current_price, 0.5)) AS delta,
            COALESCE(ls.volume, 0) AS volume,
            COALESCE(vr.volume_rank, 9999) AS volume_rank
        FROM markets m
        LEFT JOIN latest_snap ls ON m.id = ls.market_id
        LEFT JOIN day_ago_snap d ON m.id = d.market_id
        LEFT JOIN vol_ranks vr ON m.id = vr.market_id
        WHERE m.status = 'active'
        {category_filter}
        ORDER BY {order_clause}
        LIMIT :limit OFFSET :offset
    """.format(
        category_filter="AND m.category = :category" if category else "",
        order_clause="delta DESC, volume DESC" if sort == "trending" else "volume DESC, delta DESC",
    ))

    # Count query
    count_query = text("""
        SELECT COUNT(*) FROM markets m
        WHERE m.status = 'active'
        {category_filter}
    """.format(
        category_filter="AND m.category = :category" if category else "",
    ))

    params = {"limit": limit, "offset": offset}
    if category:
        params["category"] = category

    result = await db.execute(query, params)
    rows = result.fetchall()

    count_result = await db.execute(count_query, {"category": category} if category else {})
    total = count_result.scalar() or 0

    markets = []
    for row in rows:
        card = MarketCard(
            id=row.id,
            question=row.question,
            category=row.category,
            current_price=float(row.current_price),
            price_24h_ago=float(row.price_24h_ago) if row.price_24h_ago else None,
            delta=float(row.delta) if row.delta else None,
            volume=float(row.volume),
            resolution_date=row.resolution_date,
            status=row.status,
            is_featured=row.is_featured,
            image_url=row.image_url,
            slug=row.slug,
        )

        # Calculate interesting score for sorting if needed
        if sort == "interesting":
            card._interesting_score = calculate_interesting_score(
                delta=float(row.delta) if row.delta else 0,
                volume=float(row.volume),
                volume_rank=int(row.volume_rank),
                resolution_date=row.resolution_date,
                current_price=float(row.current_price),
                total_markets=total,
            )

        markets.append(card)

    # Sort by interesting score if applicable
    if sort == "interesting":
        markets.sort(key=lambda m: getattr(m, "_interesting_score", 0), reverse=True)

    response = FeedResponse(
        markets=markets,
        total=total,
        limit=limit,
        offset=offset,
    )

    # Cache the response
    await cache_set(cache_key, response.model_dump(), ttl=settings.FEED_CACHE_TTL)

    return response


@router.get("/{market_id}", response_model=MarketDetail)
async def get_market_detail(
    market_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Returns single market detail with 7-day price history."""
    # Check cache
    cache_key = f"polynews:market:{market_id}"
    cached = await cache_get(cache_key)
    if cached:
        return MarketDetail(**cached)

    # Get market info
    market_query = text("""
        SELECT
            m.id, m.question, m.description, m.category,
            m.resolution_date, m.created_at, m.status, m.is_featured,
            m.outcomes, m.image_url, m.slug, m.last_updated
        FROM markets m
        WHERE m.id = :market_id
    """)
    result = await db.execute(market_query, {"market_id": market_id})
    market = result.fetchone()

    if not market:
        raise HTTPException(status_code=404, detail="Market not found")

    # Get latest snapshot
    latest_query = text("""
        SELECT yes_price, no_price, volume, open_interest, timestamp
        FROM snapshots
        WHERE market_id = :market_id
        ORDER BY timestamp DESC
        LIMIT 1
    """)
    latest_result = await db.execute(latest_query, {"market_id": market_id})
    latest = latest_result.fetchone()

    # Get 24h ago snapshot
    day_ago_query = text("""
        SELECT yes_price
        FROM snapshots
        WHERE market_id = :market_id
            AND timestamp <= NOW() - INTERVAL '24 hours'
        ORDER BY timestamp DESC
        LIMIT 1
    """)
    day_ago_result = await db.execute(day_ago_query, {"market_id": market_id})
    day_ago = day_ago_result.fetchone()

    # Get 7-day price history
    history_query = text("""
        SELECT timestamp, yes_price AS price
        FROM snapshots
        WHERE market_id = :market_id
            AND timestamp >= NOW() - INTERVAL '7 days'
        ORDER BY timestamp ASC
    """)
    history_result = await db.execute(history_query, {"market_id": market_id})
    history_rows = history_result.fetchall()

    current_price = float(latest.yes_price) if latest else 0.5
    price_24h_ago = float(day_ago.yes_price) if day_ago else None
    delta = abs(current_price - price_24h_ago) if price_24h_ago is not None else None

    price_history = [
        PricePoint(timestamp=row.timestamp, price=float(row.price))
        for row in history_rows
    ]

    detail = MarketDetail(
        id=market.id,
        question=market.question,
        description=market.description,
        category=market.category,
        current_price=current_price,
        price_24h_ago=price_24h_ago,
        delta=delta,
        volume=float(latest.volume) if latest else 0,
        open_interest=float(latest.open_interest) if latest else 0,
        resolution_date=market.resolution_date,
        created_at=market.created_at,
        status=market.status,
        is_featured=market.is_featured,
        outcomes=market.outcomes,
        image_url=market.image_url,
        slug=market.slug,
        last_updated=market.last_updated,
        price_history=price_history,
    )

    # Cache
    await cache_set(cache_key, detail.model_dump(), ttl=settings.MARKET_CACHE_TTL)

    return detail
