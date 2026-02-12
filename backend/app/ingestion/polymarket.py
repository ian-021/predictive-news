"""Polymarket API client for market data ingestion."""

import json
import httpx
import logging
from typing import Optional
from datetime import datetime, timezone

from app.config import get_settings
from app.api.categories import map_category

logger = logging.getLogger(__name__)
settings = get_settings()


class PolymarketClient:
    """Synchronous client for Polymarket's Gamma API.

    Uses httpx.Client (sync) so it works safely in Celery workers
    and background threads without event loop issues.
    """

    BASE_URL = settings.POLYMARKET_API_URL

    def __init__(self):
        self.client = httpx.Client(
            base_url=self.BASE_URL,
            timeout=30.0,
            headers={
                "Accept": "application/json",
                "User-Agent": "FTM/1.0",
            },
        )

    def close(self):
        self.client.close()

    def fetch_markets(
        self,
        limit: int = 100,
        offset: int = 0,
        active: bool = True,
    ) -> list[dict]:
        """
        Fetch markets from Polymarket Gamma API.

        Returns normalized market data ready for database insertion.
        """
        try:
            params = {
                "limit": limit,
                "offset": offset,
                "active": str(active).lower(),
                "closed": "false",
                "order": "volume",
                "ascending": "false",
            }

            response = self.client.get("/markets", params=params)
            response.raise_for_status()

            raw_markets = response.json()
            if not isinstance(raw_markets, list):
                logger.warning("Unexpected response format from Polymarket API")
                return []

            return [self._normalize_market(m) for m in raw_markets if m.get("question")]

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                logger.warning("Rate limited by Polymarket API")
                raise RateLimitError("Polymarket API rate limit exceeded")
            logger.error(f"Polymarket API HTTP error: {e.response.status_code}")
            raise
        except httpx.RequestError as e:
            logger.error(f"Polymarket API request error: {e}")
            raise

    def fetch_market(self, market_id: str) -> Optional[dict]:
        """Fetch a single market by ID."""
        try:
            response = self.client.get(f"/markets/{market_id}")
            response.raise_for_status()
            data = response.json()
            if data and data.get("question"):
                return self._normalize_market(data)
            return None
        except Exception as e:
            logger.error(f"Error fetching market {market_id}: {e}")
            return None

    def _normalize_market(self, raw: dict) -> dict:
        """Normalize raw Polymarket data to our schema."""
        # Parse outcome prices
        outcome_prices = raw.get("outcomePrices", "")
        yes_price = 0.5
        no_price = 0.5

        if isinstance(outcome_prices, str) and outcome_prices:
            try:
                prices = json.loads(outcome_prices)
                if isinstance(prices, list) and len(prices) >= 2:
                    yes_price = float(prices[0])
                    no_price = float(prices[1])
            except (json.JSONDecodeError, ValueError, IndexError):
                pass
        elif isinstance(outcome_prices, list) and len(outcome_prices) >= 2:
            try:
                yes_price = float(outcome_prices[0])
                no_price = float(outcome_prices[1])
            except (ValueError, IndexError):
                pass

        # Parse volume
        volume = 0.0
        try:
            volume = float(raw.get("volume", 0) or 0)
        except (ValueError, TypeError):
            pass

        # Parse liquidity / open interest
        open_interest = 0.0
        try:
            open_interest = float(raw.get("liquidity", 0) or 0)
        except (ValueError, TypeError):
            pass

        # Parse dates
        resolution_date = None
        if raw.get("endDate"):
            try:
                resolution_date = datetime.fromisoformat(
                    raw["endDate"].replace("Z", "+00:00")
                )
            except (ValueError, AttributeError):
                pass

        created_at = datetime.now(timezone.utc)
        if raw.get("createdAt"):
            try:
                created_at = datetime.fromisoformat(
                    raw["createdAt"].replace("Z", "+00:00")
                )
            except (ValueError, AttributeError):
                pass

        # Map category
        raw_category = raw.get("category", "") or raw.get("groupItemTitle", "") or ""
        category = map_category(raw_category)

        # Parse outcomes
        outcomes = None
        if raw.get("outcomes"):
            try:
                if isinstance(raw["outcomes"], str):
                    outcomes = json.loads(raw["outcomes"])
                else:
                    outcomes = raw["outcomes"]
            except Exception:
                pass

        return {
            "id": str(raw.get("id", "")),
            "question": raw.get("question", ""),
            "description": raw.get("description", ""),
            "category": category,
            "resolution_date": resolution_date,
            "created_at": created_at,
            "status": "active" if raw.get("active") else "resolved",
            "outcomes": outcomes,
            "image_url": raw.get("image", None),
            "slug": raw.get("slug", None),
            "yes_price": yes_price,
            "no_price": no_price,
            "volume": volume,
            "open_interest": open_interest,
        }


class RateLimitError(Exception):
    """Raised when Polymarket API rate limit is hit."""
    pass
