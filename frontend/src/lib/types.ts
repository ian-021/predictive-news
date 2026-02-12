export interface PricePoint {
  timestamp: string;
  price: number;
}

export interface MarketCard {
  id: string;
  question: string;
  category: string;
  current_price: number;
  price_24h_ago: number | null;
  delta: number | null;
  volume: number;
  resolution_date: string | null;
  status: string;
  is_featured: boolean;
  image_url: string | null;
  slug: string | null;
}

export interface MarketDetail {
  id: string;
  question: string;
  description: string | null;
  category: string;
  current_price: number;
  price_24h_ago: number | null;
  delta: number | null;
  volume: number;
  open_interest: number;
  resolution_date: string | null;
  created_at: string;
  status: string;
  is_featured: boolean;
  outcomes: Record<string, unknown> | null;
  image_url: string | null;
  slug: string | null;
  last_updated: string;
  price_history: PricePoint[];
}

export interface CategoryInfo {
  name: string;
  slug: string;
  market_count: number;
  featured_market_ids: string[];
}

export interface FeedResponse {
  markets: MarketCard[];
  total: number;
  limit: number;
  offset: number;
}

export interface HealthResponse {
  status: string;
  last_ingestion: string | null;
  staleness_minutes: number | null;
  api_error_rate: number;
  database_connected: boolean;
  redis_connected: boolean;
}

export type SortOption = "interesting" | "trending";
export type CategorySlug = "politics" | "crypto" | "sports" | "tech" | "other";

export interface FeedFilters {
  category: CategorySlug | null;
  sort: SortOption;
  limit: number;
  offset: number;
}
