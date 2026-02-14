// Editorial Feed types — aligned with actual Market model fields

export type CardVariant = "hero" | "medium" | "compact" | "mini";

export type ConfidenceClass = "likely" | "uncertain" | "unlikely";

export interface ConfidenceLevel {
  label: string;
  class: ConfidenceClass;
}

export interface EditorialMarket {
  id: string;
  question: string;
  headline: string;
  summary: string;
  category: string;
  current_price: number; // 0-1 scale (yes_price)
  probability: number; // 0-100 (current_price * 100)
  price_24h_ago: number | null;
  change_24h: number | null; // percentage points (delta * 100), signed
  volume: number;
  resolution_date: string | null;
  status: string;
  slug: string | null;
  image_url: string | null;
  cluster_id: number | null;
}

export interface MarketCardProps {
  market: EditorialMarket;
  variant: CardVariant;
  showSummary?: boolean;
  showProbBar?: boolean;
  animationDelay?: number;
}

export interface TickerItem {
  label: string;
  change: number; // signed percentage points
  probability: number; // 0-100
}

export interface StoryClusterData {
  id: number;
  title: string;
  tag: string;
  markets: EditorialMarket[];
}

export interface FeedSection {
  label: string;
  type: "breaking" | "default";
  card_variant: CardVariant;
  grid_cols: number;
  markets: EditorialMarket[];
}

export interface HeroSection {
  primary: EditorialMarket | null;
  secondary: EditorialMarket[];
}

export interface FeedMeta {
  total_markets: number;
  last_sync: string | null;
  sources_status: Record<string, string>;
}

export interface EditorialFeed {
  hero: HeroSection;
  clusters: StoryClusterData[];
  sections: FeedSection[];
  ticker: TickerItem[];
  movers: EditorialMarket[];
  recently_resolved: EditorialMarket[];
  meta: FeedMeta;
}
