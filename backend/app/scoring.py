"""Scoring algorithms for market feed ranking."""

from datetime import datetime, timezone
from typing import Optional
import math


def calculate_interesting_score(
    delta: float,
    volume: float,
    volume_rank: int,
    resolution_date: Optional[datetime],
    current_price: float,
    total_markets: int = 100,
) -> float:
    """
    Multi-factor 'Most Interesting' scoring algorithm.

    Factors:
    - 24h price delta (weight: 2x) — bigger moves are more interesting
    - Volume rank (weight: 1x) — higher volume = more credible
    - Urgency (weight: 1x) — closer resolution = more timely
    - Uncertainty (weight: 0.5x) — prices near 50% are most uncertain/interesting

    Returns a score from 0 to 100.
    """
    # Delta score: absolute 24h price movement, scaled 0-1
    # Max expected delta is ~0.3 (30% move in 24h)
    delta_score = min(abs(delta) / 0.30, 1.0)

    # Volume rank score: normalized 0-1 (rank 1 = best)
    volume_score = max(0.0, 1.0 - (volume_rank / max(total_markets, 1)))

    # Urgency score: closer to resolution = higher score
    urgency_score = 0.0
    if resolution_date:
        now = datetime.now(timezone.utc)
        days_until = max((resolution_date - now).total_seconds() / 86400, 0)
        if days_until > 0:
            # Inverse: 1 day away = 1.0, 365 days = ~0.003
            urgency_score = min(1.0 / days_until, 1.0)
        else:
            urgency_score = 1.0

    # Uncertainty score: price near 0.5 = most uncertain = most interesting
    # abs(price - 0.5) gives 0 at 0.5 (most uncertain) and 0.5 at extremes
    uncertainty_score = 1.0 - (abs(current_price - 0.5) * 2)

    # Weighted combination
    score = (
        delta_score * 2.0
        + volume_score * 1.0
        + urgency_score * 1.0
        + uncertainty_score * 0.5
    )

    # Normalize to 0-100 (max possible raw = 2 + 1 + 1 + 0.5 = 4.5)
    normalized = (score / 4.5) * 100

    return round(normalized, 2)


def calculate_featured_score(volume: float, last_updated: datetime) -> float:
    """
    Score for determining featured markets per category.
    volume x recency formula.
    """
    now = datetime.now(timezone.utc)
    hours_since_update = max((now - last_updated).total_seconds() / 3600, 1)

    # Recency decay: recent updates score higher
    recency = 1.0 / math.log2(hours_since_update + 1)

    # Volume in log scale to prevent dominant outliers
    vol_score = math.log10(max(volume, 1))

    return vol_score * recency
