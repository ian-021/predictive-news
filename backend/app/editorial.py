"""Editorial logic: newsworthiness scoring, hero selection, section assignment."""

import math
import os
import re
import logging
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

# ── Configurable weights (env vars or defaults) ──

WEIGHT_MOVEMENT = float(os.environ.get("HERO_WEIGHT_MOVEMENT", "0.4"))
WEIGHT_SIGNIFICANCE = float(os.environ.get("HERO_WEIGHT_SIGNIFICANCE", "0.5"))
WEIGHT_VOLATILITY = float(os.environ.get("HERO_WEIGHT_VOLATILITY", "0.1"))
SIGMOID_STEEPNESS = float(os.environ.get("HERO_SIGMOID_STEEPNESS", "0.15"))
SIGMOID_MIDPOINT = float(os.environ.get("HERO_SIGMOID_MIDPOINT", "8"))
MIN_CHANGE_THRESHOLD = float(os.environ.get("HERO_MIN_CHANGE_THRESHOLD", "2.0"))
MAX_VOLUME_LOG = float(os.environ.get("HERO_MAX_VOLUME_LOG", "8.0"))


def compute_newsworthiness(
    change_pct: float,
    volume: float,
    avg_daily_change: Optional[float] = None,
) -> float:
    """
    Composite newsworthiness score (0-100).

    Args:
        change_pct: Absolute 24h change in percentage points (e.g. 12.0)
        volume: Total volume in USD
        avg_daily_change: Historical average daily change in pct points (optional)
    """
    # Component 1: Movement Signal (sigmoid curve)
    abs_change = abs(change_pct)
    movement = 100 / (1 + math.exp(-SIGMOID_STEEPNESS * (abs_change - SIGMOID_MIDPOINT)))

    # Component 2: Significance Signal (log-scaled volume)
    volume_log = math.log10(max(volume, 1))
    significance = min(100, (volume_log / MAX_VOLUME_LOG) * 100)

    # Component 3: Volatility Bonus
    volatility_bonus = 0.0
    if avg_daily_change and avg_daily_change > 0:
        volatility_ratio = abs_change / avg_daily_change
        volatility_bonus = min(20, volatility_ratio * 4)

    score = (
        movement * WEIGHT_MOVEMENT
        + significance * WEIGHT_SIGNIFICANCE
        + volatility_bonus * WEIGHT_VOLATILITY
    )
    return round(score, 2)


def select_hero_markets(markets: list[dict]) -> tuple[Optional[dict], list[dict]]:
    """
    Select top 3 most newsworthy markets for the hero section.

    Args:
        markets: list of market dicts with 'change_pct', 'volume', 'category', 'cluster_id', 'id'

    Returns:
        (primary, [secondary1, secondary2])
    """
    # Filter: must have meaningful recent movement
    eligible = [m for m in markets if abs(m.get("change_pct", 0)) >= MIN_CHANGE_THRESHOLD]

    if not eligible:
        # Fallback: just take top 3 by volume
        by_volume = sorted(markets, key=lambda m: m.get("volume", 0), reverse=True)
        primary = by_volume[0] if by_volume else None
        secondary = by_volume[1:3]
        return primary, secondary

    # Score and sort
    scored = [
        (m, compute_newsworthiness(m.get("change_pct", 0), m.get("volume", 0)))
        for m in eligible
    ]
    scored.sort(key=lambda x: x[1], reverse=True)

    # Deduplicate clusters
    seen_clusters = set()
    deduplicated = []
    for market, score in scored:
        cluster_id = market.get("cluster_id") or market["id"]
        if cluster_id not in seen_clusters:
            seen_clusters.add(cluster_id)
            deduplicated.append((market, score))

    if not deduplicated:
        return None, []

    hero_1 = deduplicated[0][0]
    hero_1_cat = hero_1.get("category", "")
    remaining = deduplicated[1:]

    # Pick with category diversity
    hero_2 = None
    hero_3 = None

    for market, score in remaining:
        if hero_2 is None and market.get("category", "") != hero_1_cat:
            hero_2 = market
        elif hero_3 is None and market.get("category", "") != hero_1_cat and market is not hero_2:
            hero_3 = market
        if hero_2 and hero_3:
            break

    # Fallback
    if hero_2 is None and remaining:
        hero_2 = remaining[0][0]
    if hero_3 is None:
        candidates = [m for m, _ in remaining if m is not hero_2]
        if candidates:
            hero_3 = candidates[0]

    secondary = [m for m in [hero_2, hero_3] if m is not None]
    return hero_1, secondary


# ── Section assignment ──

GEOPOLITICS_KEYWORDS = {
    "war", "government", "minister", "president", "election",
    "strike", "nato", "capture", "military", "sanctions",
    "ceasefire", "invasion", "diplomacy", "parliament", "coalition",
}

TECH_KEYWORDS = {
    "nvidia", "apple", "microsoft", "google", "ai", "bitcoin",
    "ethereum", "crypto", "tesla", "openai", "meta", "amazon",
}


def assign_sections(markets: list[dict], hero_ids: set[str]) -> list[dict]:
    """
    Assign remaining markets to editorial sections.
    Returns list of section dicts with label, type, card_variant, grid_cols, markets.
    """
    # Remove hero markets
    remaining = [m for m in markets if m["id"] not in hero_ids]

    sections = []

    # High Confidence (>= 90% probability)
    high_conf = [
        m for m in remaining
        if m.get("probability", 0) >= 90
    ]
    high_conf.sort(key=lambda m: (m.get("probability", 0), m.get("volume", 0)), reverse=True)
    if high_conf:
        sections.append({
            "label": "High Confidence \u00b7 >90%",
            "type": "default",
            "card_variant": "compact",
            "grid_cols": 3,
            "markets": high_conf[:6],
        })
    high_conf_ids = {m["id"] for m in high_conf[:6]}

    # Geopolitics
    geo = [
        m for m in remaining
        if m["id"] not in high_conf_ids and (
            m.get("category") in ("politics",)
            or any(kw in m.get("question", "").lower() for kw in GEOPOLITICS_KEYWORDS)
        )
    ]
    geo.sort(key=lambda m: (abs(m.get("change_pct", 0)), m.get("volume", 0)), reverse=True)
    if geo:
        sections.append({
            "label": "Geopolitics & Conflict",
            "type": "default",
            "card_variant": "mini",
            "grid_cols": 2,
            "markets": geo[:4],
        })
    geo_ids = {m["id"] for m in geo[:4]}

    # Tech & Markets
    tech = [
        m for m in remaining
        if m["id"] not in high_conf_ids and m["id"] not in geo_ids and (
            m.get("category") in ("tech", "crypto")
            or any(kw in m.get("question", "").lower() for kw in TECH_KEYWORDS)
        )
    ]
    tech.sort(key=lambda m: (abs(m.get("change_pct", 0)), m.get("volume", 0)), reverse=True)
    if tech:
        sections.append({
            "label": "Tech & Markets",
            "type": "default",
            "card_variant": "medium",
            "grid_cols": 2,
            "markets": tech[:4],
        })

    return sections


def select_ticker(markets: list[dict], count: int = 8) -> list[dict]:
    """Select top markets by absolute 24h change for the ticker."""
    sorted_markets = sorted(
        markets,
        key=lambda m: abs(m.get("change_pct", 0)),
        reverse=True,
    )
    return sorted_markets[:count]


def select_movers(markets: list[dict], count: int = 8) -> list[dict]:
    """Select biggest movers for the sidebar."""
    sorted_markets = sorted(
        markets,
        key=lambda m: abs(m.get("change_pct", 0)),
        reverse=True,
    )
    return sorted_markets[:count]
