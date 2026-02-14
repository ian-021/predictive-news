"""Market clustering: group related markets (e.g. Bitcoin price thresholds)."""

import re
import logging
from collections import defaultdict

logger = logging.getLogger(__name__)

# Patterns for extracting threshold values from market questions
THRESHOLD_PATTERNS = [
    # "Will the price of Bitcoin be above $60,000 on February 13?"
    re.compile(
        r'price of (.+?) (?:be )?above \$?([\d,]+(?:\.\d+)?)',
        re.IGNORECASE,
    ),
    # "Will Bitcoin be above $60,000?"
    re.compile(
        r'(.+?) (?:be )?above \$?([\d,]+(?:\.\d+)?)',
        re.IGNORECASE,
    ),
    # "Will X exceed Y?"
    re.compile(
        r'(.+?) exceed \$?([\d,]+(?:\.\d+)?)',
        re.IGNORECASE,
    ),
]


def _normalize_title(title: str) -> str:
    """Normalize a market title for clustering comparison."""
    t = title.lower().strip()
    # Remove "will " prefix
    t = re.sub(r'^will\s+', '', t)
    # Remove question mark
    t = t.rstrip('?').strip()
    # Replace threshold values with THRESHOLD
    t = re.sub(r'\$[\d,]+(?:\.\d+)?', 'THRESHOLD', t)
    # Normalize dates to generic
    t = re.sub(
        r'(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}',
        'DATE',
        t,
        flags=re.IGNORECASE,
    )
    # Remove extra whitespace
    t = re.sub(r'\s+', ' ', t).strip()
    return t


def _extract_threshold(title: str) -> float | None:
    """Extract the numeric threshold value from a market title."""
    for pattern in THRESHOLD_PATTERNS:
        match = pattern.search(title)
        if match:
            try:
                value_str = match.group(2).replace(',', '')
                return float(value_str)
            except (ValueError, IndexError):
                continue
    return None


def _extract_subject(title: str) -> str | None:
    """Extract the subject (e.g., 'Bitcoin') from a threshold market title."""
    for pattern in THRESHOLD_PATTERNS:
        match = pattern.search(title)
        if match:
            return match.group(1).strip()
    return None


def cluster_markets(markets: list[dict]) -> list[dict]:
    """
    Group markets that represent thresholds of the same underlying question.

    Args:
        markets: list of dicts with at least 'id', 'question', 'probability', 'headline'

    Returns:
        list of cluster dicts: { id, title, tag, markets: [...] }
    """
    # Group by normalized title
    groups: dict[str, list[dict]] = defaultdict(list)

    for market in markets:
        normalized = _normalize_title(market["question"])
        threshold = _extract_threshold(market["question"])

        if threshold is not None:
            groups[normalized].append({
                **market,
                "_threshold": threshold,
            })

    # Only keep groups with 3+ markets
    clusters = []
    cluster_id = 1

    for normalized_title, group in groups.items():
        if len(group) < 3:
            continue

        # Sort by threshold value ascending
        group.sort(key=lambda m: m["_threshold"])

        # Generate a cluster title
        subject = _extract_subject(group[0]["question"])
        if subject:
            title = f"{subject} Price Outlook"
        else:
            title = "Related Markets"

        # Clean up: generate compact headlines for cluster items
        for m in group:
            threshold = m["_threshold"]
            if threshold >= 1000:
                m["headline"] = f"Above ${threshold:,.0f}"
            else:
                m["headline"] = f"Above ${threshold}"

        clusters.append({
            "id": cluster_id,
            "title": title,
            "tag": "STORY",
            "markets": group,
        })
        cluster_id += 1

    return clusters
