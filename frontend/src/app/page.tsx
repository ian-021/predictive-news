"use client";

import { useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { CategorySlug, SortOption, FeedFilters } from "@/lib/types";
import { Header } from "@/components/Header";
import { StalenessBar } from "@/components/StalenessBar";
import { CategoryFilter } from "@/components/CategoryFilter";
import { SortToggle } from "@/components/SortToggle";
import { Feed } from "@/components/Feed";
import { MarketDetail } from "@/components/MarketDetail";
import { OnboardingOverlay } from "@/components/OnboardingOverlay";

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div className="spinner" />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State from URL
  const categoryParam = searchParams.get("category") as CategorySlug | null;
  const sortParam = (searchParams.get("sort") as SortOption) || "interesting";

  // Local state
  const [activeTab, setActiveTab] = useState<"feed" | "bookmarks">("feed");
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Update URL when filters change
  const updateFilters = useCallback(
    (updates: { category?: CategorySlug | null; sort?: SortOption }) => {
      const params = new URLSearchParams(searchParams.toString());

      if ("category" in updates) {
        if (updates.category) {
          params.set("category", updates.category);
        } else {
          params.delete("category");
        }
      }

      if ("sort" in updates) {
        if (updates.sort && updates.sort !== "interesting") {
          params.set("sort", updates.sort);
        } else {
          params.delete("sort");
        }
      }

      const qs = params.toString();
      router.push(qs ? `/?${qs}` : "/", { scroll: false });
    },
    [router, searchParams]
  );

  const filters: FeedFilters = {
    category: categoryParam,
    sort: sortParam,
    limit: 50,
    offset: 0,
  };

  const handleMarketClick = useCallback((id: string) => {
    setSelectedMarketId(id);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedMarketId(null);
  }, []);

  const handleShowOnboarding = useCallback(() => {
    setShowOnboarding(true);
  }, []);

  return (
    <>
      <OnboardingOverlay />

      {showOnboarding && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(8px)",
            padding: "var(--space-md)",
          }}
          onClick={() => setShowOnboarding(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "var(--bg-secondary)",
              borderRadius: "var(--radius-lg)",
              maxWidth: 520,
              width: "100%",
              padding: "var(--space-xl)",
              border: "1px solid var(--border-primary)",
            }}
          >
            <h2
              style={{
                fontSize: "1.2rem",
                fontWeight: 700,
                marginBottom: "var(--space-md)",
              }}
            >
              What is <span style={{ color: "var(--accent-green)" }}>Poly</span>
              News?
            </h2>
            <p
              style={{
                fontSize: "0.9rem",
                color: "var(--text-secondary)",
                lineHeight: 1.6,
                marginBottom: "var(--space-md)",
              }}
            >
              PolyNews transforms Polymarket prediction market data into a
              scannable news feed. Each percentage represents real-money bets
              from thousands of traders on whether something will happen.
            </p>
            <p
              style={{
                fontSize: "0.9rem",
                color: "var(--text-secondary)",
                lineHeight: 1.6,
                marginBottom: "var(--space-lg)",
              }}
            >
              Higher percentages mean the crowd thinks it&apos;s more likely.
              Track predictions across politics, crypto, sports, and tech — all
              updated every 15 minutes.
            </p>
            <button
              onClick={() => setShowOnboarding(false)}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "var(--radius-md)",
                fontSize: "0.9rem",
                fontWeight: 600,
                backgroundColor: "var(--bg-card)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-primary)",
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      <StalenessBar />
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onHelpClick={handleShowOnboarding}
      />

      <main className="container" style={{ paddingTop: "var(--space-lg)", paddingBottom: "var(--space-2xl)" }}>
        {activeTab === "feed" && (
          <>
            {/* Filters bar */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-md)",
                marginBottom: "var(--space-lg)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "var(--space-md)",
                }}
              >
                <CategoryFilter
                  activeCategory={categoryParam}
                  onCategoryChange={(cat) => updateFilters({ category: cat })}
                />
                <SortToggle
                  activeSort={sortParam}
                  onSortChange={(sort) => updateFilters({ sort })}
                />
              </div>
            </div>

            <Feed filters={filters} onMarketClick={handleMarketClick} />
          </>
        )}

        {activeTab === "bookmarks" && (
          <>
            <div style={{ marginBottom: "var(--space-lg)" }}>
              <h2
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 600,
                  marginBottom: "var(--space-xs)",
                }}
              >
                My Questions
              </h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                Markets you&apos;re tracking. Stored locally in your browser.
              </p>
            </div>
            <Feed
              filters={filters}
              onMarketClick={handleMarketClick}
              showBookmarkedOnly
            />
          </>
        )}
      </main>

      {/* Market detail panel */}
      {selectedMarketId && (
        <MarketDetail marketId={selectedMarketId} onClose={handleCloseDetail} />
      )}
    </>
  );
}
