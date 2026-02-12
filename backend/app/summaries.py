"""Deterministic, evidence-based summaries for market signal cards."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional


def _format_percent(value: float) -> str:
    return f"{round(value * 100)}%"


def _format_points(value: float) -> str:
    return f"{abs(value) * 100:.1f}".rstrip("0").rstrip(".")


def _format_usd(value: float) -> str:
    abs_value = abs(value)
    if abs_value >= 1_000_000_000:
        return f"${value / 1_000_000_000:.1f}B"
    if abs_value >= 1_000_000:
        return f"${value / 1_000_000:.1f}M"
    if abs_value >= 1_000:
        return f"${value / 1_000:.1f}K"
    return f"${value:.0f}"


def _probability_sentence(current_price: float) -> str:
    probability = _format_percent(current_price)

    if current_price >= 0.85:
        return f"Market pricing is near-certainty for YES at {probability}."
    if current_price >= 0.70:
        return f"Market is strongly leaning YES at {probability}."
    if current_price >= 0.55:
        return f"Market has a moderate YES edge at {probability}."
    if current_price > 0.45:
        return f"Market remains split, with YES at {probability}."
    if current_price > 0.30:
        return f"Market is leaning NO, with YES at {probability}."
    if current_price > 0.15:
        return f"Market is strongly leaning NO, with YES at {probability}."
    return f"Market pricing is near-certainty for NO, with YES at {probability}."


def _momentum_sentence(current_price: float, price_24h_ago: Optional[float]) -> str:
    if price_24h_ago is None:
        return "24h baseline is unavailable, so momentum is still forming."

    delta = current_price - price_24h_ago
    points = _format_points(delta)

    if abs(delta) < 0.01:
        return f"Odds were mostly flat over 24h ({_format_percent(current_price)} vs {_format_percent(price_24h_ago)})."
    if delta > 0:
        return f"YES odds rose {points} pts in 24h ({_format_percent(price_24h_ago)} to {_format_percent(current_price)}), showing stronger conviction."
    return f"YES odds fell {points} pts in 24h ({_format_percent(price_24h_ago)} to {_format_percent(current_price)}), signaling weakening conviction."


def _trend_sentence(price_7d_ago: Optional[float], current_price: float) -> Optional[str]:
    if price_7d_ago is None:
        return None

    weekly_delta = current_price - price_7d_ago
    if abs(weekly_delta) < 0.03:
        return "7d trend is relatively stable."

    direction = "upward" if weekly_delta > 0 else "downward"
    return f"7d trajectory is {direction} ({_format_points(weekly_delta)} pts), reinforcing the current signal."


def _participation_sentence(volume: float, open_interest: Optional[float]) -> str:
    if volume >= 10_000_000:
        depth = "very deep"
    elif volume >= 1_000_000:
        depth = "deep"
    elif volume >= 100_000:
        depth = "moderate"
    else:
        depth = "thin"

    if open_interest is None:
        return f"Participation is {depth} (volume {_format_usd(volume)})."

    if open_interest > 0:
        turnover = volume / open_interest
        if turnover >= 2.0:
            turnover_note = "high turnover"
        elif turnover >= 0.75:
            turnover_note = "balanced turnover"
        else:
            turnover_note = "lighter turnover"
    else:
        turnover_note = "limited visible liquidity"

    return (
        f"Participation is {depth} (vol {_format_usd(volume)}, "
        f"liq {_format_usd(open_interest)}; {turnover_note})."
    )


def _timing_sentence(resolution_date: Optional[datetime]) -> Optional[str]:
    if resolution_date is None:
        return None

    now = datetime.now(timezone.utc)
    if resolution_date.tzinfo is None:
        resolution_date = resolution_date.replace(tzinfo=timezone.utc)

    days = (resolution_date - now).total_seconds() / 86400
    if days <= 0:
        return "Market is at/near resolution, so probability can lock quickly."
    if days <= 7:
        return f"Only {int(max(days, 1))} day(s) to resolution, so repricing risk is elevated."
    if days <= 30:
        return f"Roughly {int(days)} days to resolution keeps this signal event-sensitive."
    return None


def build_market_summary(
    *,
    current_price: float,
    price_24h_ago: Optional[float],
    price_7d_ago: Optional[float],
    volume: float,
    open_interest: Optional[float] = None,
    resolution_date: Optional[datetime] = None,
) -> str:
    """Create a concise, factual explanation for current market pricing."""

    sentences = [
        _probability_sentence(current_price),
        _momentum_sentence(current_price, price_24h_ago),
        _participation_sentence(volume, open_interest),
    ]

    trend = _trend_sentence(price_7d_ago, current_price)
    if trend:
        sentences.append(trend)

    timing = _timing_sentence(resolution_date)
    if timing:
        sentences.append(timing)

    return " ".join(sentences)
