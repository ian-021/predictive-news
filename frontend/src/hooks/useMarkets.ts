"use client";

import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { fetchMarkets, fetchMarketDetail, fetchCategories, fetchHealth } from "@/lib/api";
import type { FeedFilters } from "@/lib/types";

export function useMarketFeed(filters: FeedFilters) {
  return useInfiniteQuery({
    queryKey: ["markets", filters.category, filters.sort],
    queryFn: ({ pageParam = 0 }) =>
      fetchMarkets({ ...filters, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const nextOffset = lastPage.offset + lastPage.limit;
      return nextOffset < lastPage.total ? nextOffset : undefined;
    },
    staleTime: 90 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });
}

export function useMarketDetail(id: string | null) {
  return useQuery({
    queryKey: ["market", id],
    queryFn: () => fetchMarketDetail(id!),
    enabled: !!id,
    staleTime: 90 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    staleTime: 10 * 1000, // 10 seconds
    refetchInterval: 15 * 1000, // poll every 15s — endpoint is lightweight
  });
}
