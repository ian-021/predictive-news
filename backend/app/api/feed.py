"""Editorial feed endpoint — /api/v1/feed"""

import logging
from typing import Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.database import get_db
from app.cache import cache_get, cache_set
from app.config import get_settings
from app.schemas import (
    EditorialFeedResponse,
    EditorialMarket,
    TickerItem,
    StoryClusterSchema,
    FeedSectionSchema,
    HeroSection,
    FeedMeta,
)
from app.editorial import (
    select_hero_markets,
    assign_sections,
    select_ticker,
    select_movers,
)
from app.headlines import to_headline
from app.card_summaries import get_summary_for_card
from app.clustering import cluster_markets

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["editorial-feed"])
settings = get_settings()

VALID_CATEGORIES = {"politics", "crypto", "sports", "tech", "other"}


def _build_editorial_market(row) -> dict:
    """Convert a raw DB row to an editorial market dict."""
    current_price = float(row.current_price)
    price_24h_ago = float(row.price_24h_ago) if row.price_24h_ago is not None else None

    # Calculate signed change in percentage points
    if price_24h_ago is not None:
        change_pct = (current_price - price_24h_ago) * 100
    else:
        change_pct = 0.0

    probability = round(current_price * 100)
    volume = float(row.volume)

    headline = to_headline(row.question, probability)
    summary = get_summary_for_card(
        probability=probability,
        change_pct=change_pct,
        volume=volume,
    )

    return {
        "id": row.id,
        "question": row.question,
        "headline": headline,
        "summary": summary,
        "category": row.category,
        "current_price": current_price,
        "probability": probability,
        "price_24h_ago": price_24h_ago,
        "change_24h": round(change_pct, 1),
        "change_pct": round(abs(change_pct), 1),  # absolute, for scoring
        "volume": volume,
        "resolution_date": row.resolution_date.isoformat() if row.resolution_date else None,
        "status": row.status,
        "slug": row.slug,
        "image_url": row.image_url,
        "cluster_id": None,
    }


def _to_editorial_market(m: dict) -> EditorialMarket:
    """Convert internal dict to Pydantic schema (strips internal fields like change_pct)."""
    return EditorialMarket(
        id=m["id"],
        question=m["question"],
        headline=m["headline"],
        summary=m["summary"],
        category=m["category"],
        current_price=m["current_price"],
        probability=m["probability"],
        price_24h_ago=m["price_24h_ago"],
        change_24h=m["change_24h"],
        volume=m["volume"],
        resolution_date=m["resolution_date"],
        status=m["status"],
        slug=m["slug"],
        image_url=m["image_url"],
        cluster_id=m.get("cluster_id"),
    )


@router.get("/feed", response_model=EditorialFeedResponse)
async def get_editorial_feed(
    category: Optional[str] = Query(None, description="Filter by category"),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns the pre-computed editorial layout in a single request.
    All sections, hero, ticker, movers, and recently resolved.
    """
    # Check cache
    cache_key = f"polynews:editorial_feed:{category or 'all'}"
    cached = await cache_get(cache_key)
    if cached:
        return EditorialFeedResponse(**cached)

    # Category filter
    category_clause = ""
    params: dict = {}
    if category and category in VALID_CATEGORIES:
        category_clause = "AND m.category = :category"
        params["category"] = category

    # ── Fetch active markets with latest snapshot data ──
    query = text(f"""
        WITH latest_snap AS (
            SELECT DISTINCT ON (s.market_id)
                s.market_id,
                s.yes_price AS current_price,
                s.volume,
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
        )
        SELECT
            m.id,
            m.question,
            m.category,
            m.resolution_date,
            m.status,
            m.slug,
            m.image_url,
            COALESCE(ls.current_price, 0.5) AS current_price,
            d.price_24h_ago,
            COALESCE(ls.volume, 0) AS volume
        FROM markets m
        LEFT JOIN latest_snap ls ON m.id = ls.market_id
        LEFT JOIN day_ago_snap d ON m.id = d.market_id
        WHERE m.status = 'active'
        {category_clause}
        ORDER BY COALESCE(ls.volume, 0) DESC
        LIMIT 500
    """)

    result = await db.execute(query, params)
    rows = result.fetchall()

    # Build editorial market dicts
    all_markets = [_build_editorial_market(row) for row in rows]

    # ── Total market count ──
    count_query = text(f"""
        SELECT COUNT(*) FROM markets m WHERE m.status = 'active' {category_clause}
    """)
    count_result = await db.execute(count_query, params)
    total_count = count_result.scalar() or 0

    # ── Clustering ──
    raw_clusters = cluster_markets(all_markets)
    clustered_market_ids = set()
    clusters = []
    for c in raw_clusters:
        cluster_market_objs = [_to_editorial_market(m) for m in c["markets"]]
        clusters.append(StoryClusterSchema(
            id=c["id"],
            title=c["title"],
            tag=c["tag"],
            markets=cluster_market_objs,
        ))
        for m in c["markets"]:
            clustered_market_ids.add(m["id"])
            m["cluster_id"] = c["id"]

    # ── Hero selection ──
    primary, secondary = select_hero_markets(all_markets)
    hero_ids = set()
    if primary:
        hero_ids.add(primary["id"])
    for s in secondary:
        hero_ids.add(s["id"])

    hero = HeroSection(
        primary=_to_editorial_market(primary) if primary else None,
        secondary=[_to_editorial_market(s) for s in secondary],
    )

    # ── Section assignment ──
    raw_sections = assign_sections(all_markets, hero_ids)
    sections = [
        FeedSectionSchema(
            label=sec["label"],
            type=sec["type"],
            card_variant=sec["card_variant"],
            grid_cols=sec["grid_cols"],
            markets=[_to_editorial_market(m) for m in sec["markets"]],
        )
        for sec in raw_sections
    ]

    # ── Ticker ──
    ticker_markets = select_ticker(all_markets)
    ticker = [
        TickerItem(
            label=m["headline"][:40],
            change=m["change_24h"],
            probability=m["probability"],
        )
        for m in ticker_markets
    ]

    # ── Movers (sidebar) ──
    mover_markets = select_movers(all_markets)
    movers = [_to_editorial_market(m) for m in mover_markets]

    # ── Recently resolved ──
    resolved_query = text(f"""
        WITH latest_snap AS (
            SELECT DISTINCT ON (s.market_id)
                s.market_id,
                s.yes_price AS current_price,
                s.volume
            FROM snapshots s
            ORDER BY s.market_id, s.timestamp DESC
        )
        SELECT
            m.id,
            m.question,
            m.category,
            m.resolution_date,
            m.status,
            m.slug,
            m.image_url,
            COALESCE(ls.current_price, 0.5) AS current_price,
            NULL::numeric AS price_24h_ago,
            COALESCE(ls.volume, 0) AS volume
        FROM markets m
        LEFT JOIN latest_snap ls ON m.id = ls.market_id
        WHERE m.status = 'resolved'
            AND COALESCE(m.closed_time, m.last_updated) >= NOW() - INTERVAL '24 hours'
        ORDER BY COALESCE(m.closed_time, m.last_updated) DESC
        LIMIT 10
    """)
    resolved_result = await db.execute(resolved_query)
    resolved_rows = resolved_result.fetchall()
    recently_resolved = [
        _to_editorial_market(_build_editorial_market(r))
        for r in resolved_rows
    ]

    # ── Last sync time ──
    sync_query = text("SELECT MAX(timestamp) FROM snapshots")
    sync_result = await db.execute(sync_query)
    last_sync = sync_result.scalar()

    meta = FeedMeta(
        total_markets=total_count,
        last_sync=last_sync,
        sources_status={"polymarket": "connected"},
    )

    response = EditorialFeedResponse(
        hero=hero,
        clusters=clusters,
        sections=sections,
        ticker=ticker,
        movers=movers,
        recently_resolved=recently_resolved,
        meta=meta,
    )

    # Cache for 60 seconds
    await cache_set(cache_key, response.model_dump(), ttl=60)

    return response
