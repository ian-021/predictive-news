import { useQuery } from "@tanstack/react-query";
import type { EditorialFeed } from "@/types/feed";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

async function fetchEditorialFeed(
  category: string | null,
): Promise<EditorialFeed> {
  const params = new URLSearchParams();
  if (category) params.set("category", category);

  const url = `${API_BASE}/api/v1/feed${params.toString() ? `?${params}` : ""}`;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Feed API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export function useEditorialFeed(category: string | null = null) {
  return useQuery<EditorialFeed>({
    queryKey: ["editorial-feed", category],
    queryFn: () => fetchEditorialFeed(category),
    staleTime: 30_000, // 30 seconds
    refetchOnWindowFocus: true,
    refetchInterval: 60_000, // 1 minute background refresh
  });
}
