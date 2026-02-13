import type {
  FeedResponse,
  MarketDetail,
  CategoryInfo,
  HealthResponse,
  FeedFilters,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

async function fetchJSON<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function fetchMarkets(filters: FeedFilters): Promise<FeedResponse> {
  const params = new URLSearchParams();
  if (filters.category) params.set("category", filters.category);
  params.set("sort", filters.sort);
  if (filters.status) params.set("status", filters.status);
  params.set("limit", String(filters.limit));
  params.set("offset", String(filters.offset));

  return fetchJSON<FeedResponse>(`${API_BASE}/api/markets?${params}`);
}

export async function fetchMarketDetail(id: string): Promise<MarketDetail> {
  return fetchJSON<MarketDetail>(`${API_BASE}/api/markets/${id}`);
}

export async function fetchCategories(): Promise<CategoryInfo[]> {
  return fetchJSON<CategoryInfo[]>(`${API_BASE}/api/categories`);
}

export async function fetchHealth(): Promise<HealthResponse> {
  return fetchJSON<HealthResponse>(`${API_BASE}/api/health`);
}
