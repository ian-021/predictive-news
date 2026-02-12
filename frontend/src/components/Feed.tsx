"use client";

import { useCallback, useEffect, useRef, useMemo } from "react";
import type { MarketCard as MarketCardType, FeedFilters } from "@/lib/types";
import { useMarketFeed } from "@/hooks/useMarkets";
import { useBookmarks } from "@/hooks/useBookmarks";
import { MarketCard } from "./MarketCard";

interface FeedProps {
  filters: FeedFilters;
  onMarketClick: (id: string) => void;
  showBookmarkedOnly?: boolean;
}

export function Feed({ filters, onMarketClick, showBookmarkedOnly = false }: FeedProps) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error } =
    useMarketFeed(filters);
  const { bookmarks, toggleBookmark, isBookmarked } = useBookmarks();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Infinite scroll observer
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Flatten pages into markets list
  const allMarkets = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.markets);
  }, [data]);

  // Filter for bookmarks tab
  const displayMarkets = useMemo(() => {
    if (showBookmarkedOnly) {
      return allMarkets.filter((m) => bookmarks.includes(m.id));
    }
    return allMarkets;
  }, [allMarkets, showBookmarkedOnly, bookmarks]);

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "var(--space-2xl)",
        }}
      >
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "var(--space-2xl)",
          color: "var(--text-secondary)",
        }}
      >
        <p style={{ fontSize: "1.1rem", marginBottom: "var(--space-sm)" }}>
          Unable to load predictions
        </p>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
          Please try again in a moment.
        </p>
      </div>
    );
  }

  if (showBookmarkedOnly && displayMarkets.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "var(--space-2xl)",
          color: "var(--text-secondary)",
        }}
      >
        <div style={{ fontSize: "2rem", marginBottom: "var(--space-md)" }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth={1.5}>
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <p style={{ fontSize: "1rem", marginBottom: "var(--space-sm)" }}>
          No bookmarked questions yet
        </p>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
          Tap the bookmark icon on any prediction to track it here.
        </p>
      </div>
    );
  }

  if (displayMarkets.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "var(--space-2xl)",
          color: "var(--text-secondary)",
        }}
      >
        <p>No predictions found for this category.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="feed-grid">
        {displayMarkets.map((market, index) => (
          <div
            key={market.id}
            className="fade-in"
            style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
          >
            <MarketCard
              market={market}
              isBookmarked={isBookmarked(market.id)}
              onToggleBookmark={toggleBookmark}
              onClick={onMarketClick}
            />
          </div>
        ))}
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={loadMoreRef} style={{ height: 1 }} />

      {isFetchingNextPage && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "var(--space-xl)",
          }}
        >
          <div className="spinner" />
        </div>
      )}
    </div>
  );
}
