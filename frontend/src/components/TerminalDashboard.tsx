"use client";

import { memo, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useCategories, useHealth, useMarketDetail, useMarketFeed } from "@/hooks/useMarkets";
import { formatRelativeTime, formatVolume } from "@/lib/utils";
import type { CategorySlug, FeedFilters, MarketCard, PricePoint } from "@/lib/types";

function useSyncFlash(lastIngestion: string | null | undefined) {
  const [flash, setFlash] = useState(false);
  const prevRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (
      lastIngestion &&
      prevRef.current !== undefined &&
      prevRef.current !== lastIngestion
    ) {
      setFlash(true);
      const id = window.setTimeout(() => setFlash(false), 1500);
      return () => window.clearTimeout(id);
    }
    prevRef.current = lastIngestion;
  }, [lastIngestion]);

  return flash;
}

type CategoryFilter = "all" | CategorySlug;
type FeedTab = "active" | "recently_resolved";

interface SidebarCategory {
  label: string;
  slug: CategoryFilter;
  count: number;
}

const toPercent = (value: number) => Math.round(value * 100);

const signedDelta = (market: MarketCard) => {
  const baseline = market.price_24h_ago ?? market.current_price;
  return Math.round((market.current_price - baseline) * 100);
};

const probabilityColorClass = (probability: number) => {
  if (probability > 70) return "ti-green";
  if (probability >= 50) return "ti-amber";
  return "ti-red";
};

const tickerIndicatorSymbol = (probability: number) => {
  if (probability > 70) return "▲";
  if (probability >= 50) return "●";
  return "▼";
};

const resolutionLabel = (resolutionDate: string | null) => {
  if (!resolutionDate) return "LIVE";

  const date = new Date(resolutionDate);
  if (Number.isNaN(date.getTime())) return "LIVE";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const buildSidebarCategories = (categories: { name: string; slug: string; market_count: number }[] | undefined): SidebarCategory[] => {
  if (!categories || categories.length === 0) {
    return [
      { label: "ALL", slug: "all", count: 0 },
      { label: "POLITICS", slug: "politics", count: 0 },
      { label: "CRYPTO", slug: "crypto", count: 0 },
      { label: "SPORTS", slug: "sports", count: 0 },
      { label: "TECH", slug: "tech", count: 0 },
      { label: "OTHER", slug: "other", count: 0 },
    ];
  }

  const mapped = categories.map((cat) => ({
    label: cat.name.toUpperCase(),
    slug: cat.slug as CategorySlug,
    count: cat.market_count,
  }));

  const total = mapped.reduce((sum, cat) => sum + cat.count, 0);
  return [{ label: "ALL", slug: "all", count: total }, ...mapped];
};

export function TerminalDashboard() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("all");
  const [feedTab, setFeedTab] = useState<FeedTab>("active");
  const [expandedMarketId, setExpandedMarketId] = useState<string | null>(null);
  const [feedSearchQuery, setFeedSearchQuery] = useState("");
  const deferredFeedSearchQuery = useDeferredValue(feedSearchQuery);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setExpandedMarketId(null);
  }, [selectedCategory, feedTab]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const activeElement = document.activeElement;
      const isTypingField =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLSelectElement ||
        (activeElement instanceof HTMLElement && activeElement.isContentEditable);

      if (isTypingField) {
        return;
      }

      event.preventDefault();
      searchInputRef.current?.focus();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const activeFilters: FeedFilters = useMemo(
    () => ({
      category: selectedCategory === "all" ? null : selectedCategory,
      sort: "interesting",
      status: "active",
      limit: 100,
      offset: 0,
    }),
    [selectedCategory]
  );

  const resolvedFilters: FeedFilters = useMemo(
    () => ({
      category: selectedCategory === "all" ? null : selectedCategory,
      sort: "trending",
      status: "recently_resolved",
      limit: 100,
      offset: 0,
    }),
    [selectedCategory]
  );

  const feedQuery = useMarketFeed(activeFilters);
  const recentlyResolvedQuery = useMarketFeed(resolvedFilters);
  const categoriesQuery = useCategories();
  const healthQuery = useHealth();

  const markets = useMemo(
    () => (feedQuery.data?.pages ?? []).flatMap((page) => page.markets),
    [feedQuery.data]
  );

  const sortedMarkets = useMemo(() => {
    return [...markets].sort((a, b) => toPercent(b.current_price) - toPercent(a.current_price));
  }, [markets]);

  const recentlyResolvedMarkets = useMemo(
    () => (recentlyResolvedQuery.data?.pages ?? []).flatMap((page) => page.markets),
    [recentlyResolvedQuery.data]
  );

  const filteredFeedMarkets = useMemo(() => {
    const query = deferredFeedSearchQuery.trim().toLowerCase();
    if (!query) {
      return sortedMarkets;
    }

    return sortedMarkets.filter((market) => {
      const question = market.question.toLowerCase();
      const category = market.category.toLowerCase();
      return question.includes(query) || category.includes(query);
    });
  }, [deferredFeedSearchQuery, sortedMarkets]);

  const filteredResolvedMarkets = useMemo(() => {
    const query = deferredFeedSearchQuery.trim().toLowerCase();
    if (!query) {
      return recentlyResolvedMarkets;
    }

    return recentlyResolvedMarkets.filter((market) => {
      const question = market.question.toLowerCase();
      const category = market.category.toLowerCase();
      return question.includes(query) || category.includes(query);
    });
  }, [deferredFeedSearchQuery, recentlyResolvedMarkets]);

  const visibleFeedMarkets = feedTab === "active" ? filteredFeedMarkets : filteredResolvedMarkets;
  const totalInTab = feedTab === "active" ? sortedMarkets.length : recentlyResolvedMarkets.length;
  const currentFeedQuery = feedTab === "active" ? feedQuery : recentlyResolvedQuery;

  const tickerItems = useMemo(() => {
    return [...sortedMarkets]
      .sort((a, b) => Math.abs(signedDelta(b)) - Math.abs(signedDelta(a)))
      .slice(0, 8);
  }, [sortedMarkets]);

  const breakingEvents = useMemo(
    () => sortedMarkets.filter((market) => toPercent(market.current_price) >= 85).slice(0, 3),
    [sortedMarkets]
  );

  const movers = useMemo(
    () => [...sortedMarkets]
      .sort((a, b) => Math.abs(signedDelta(b)) - Math.abs(signedDelta(a)))
      .slice(0, 6),
    [sortedMarkets]
  );

  const sidebarCategories = useMemo(
    () => buildSidebarCategories(categoriesQuery.data),
    [categoriesQuery.data]
  );

  const isConnected = healthQuery.data?.status === "healthy";
  const feedSyncFlash = useSyncFlash(healthQuery.data?.last_ingestion);

  useEffect(() => {
    if (!expandedMarketId) {
      return;
    }

    const isVisible = visibleFeedMarkets.some((market) => market.id === expandedMarketId);
    if (!isVisible) {
      setExpandedMarketId(null);
    }
  }, [expandedMarketId, visibleFeedMarkets]);

  return (
    <div className="ti-shell">
      <div className="ti-crt-overlay" />

      <TickerBar items={tickerItems} />

      <header className="ti-brand-header">
        <div className="ti-brand-left">
          <h1 className="ti-brand-logo">FTS</h1>
          <span className="ti-brand-subtitle">TERMINAL FOR NEWS FROM THE FUTURE</span>
        </div>
        <div className="ti-brand-meta">
          <span>v2.4.1</span>
          <span>SESSION: ACTIVE</span>
          <span className="ti-cursor">_</span>
        </div>
      </header>

      <section className="ti-search-bar">
        <label className="ti-search-wrap" htmlFor="primary-feed-search">
          <span className="ti-search-label">SEARCH</span>
          <input
            ref={searchInputRef}
            id="primary-feed-search"
            className="ti-search-input"
            type="text"
            value={feedSearchQuery}
            onChange={(event) => setFeedSearchQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape" || event.key === "Esc") {
                event.preventDefault();
                event.currentTarget.blur();
              }
            }}
            placeholder=""
            autoComplete="off"
            spellCheck={false}
            aria-label="Filter selected feed tab"
          />
        </label>
        <span className="ti-search-hint">
          PRESS <kbd className="ti-search-key">/</kbd>
        </span>
      </section>

      <main className="ti-main-grid">
        <section className="ti-panel ti-sidebar">
          <div className="ti-panel-head">CATEGORIES</div>
          <div className="ti-sidebar-list">
            {sidebarCategories.map((cat) => (
              <button
                key={cat.slug}
                className={`ti-sidebar-btn ${selectedCategory === cat.slug ? "is-active" : ""}`}
                onClick={() => setSelectedCategory(cat.slug)}
              >
                <span>{cat.label}</span>
                <span>{cat.count}</span>
              </button>
            ))}
          </div>
        </section>

        <section className={`ti-panel ti-feed-panel${feedSyncFlash ? " ti-feed-sync-glow" : ""}`}>
          <div className="ti-panel-head ti-feed-head">
            <div className="ti-feed-tabs" role="tablist" aria-label="Feed tabs">
              <button
                className={`ti-feed-tab ${feedTab === "active" ? "is-active" : ""}`}
                onClick={() => setFeedTab("active")}
                type="button"
                role="tab"
                aria-selected={feedTab === "active"}
              >
                PRIMARY FEED
              </button>
              <button
                className={`ti-feed-tab ${feedTab === "recently_resolved" ? "is-active" : ""}`}
                onClick={() => setFeedTab("recently_resolved")}
                type="button"
                role="tab"
                aria-selected={feedTab === "recently_resolved"}
              >
                RECENTLY RESOLVED
              </button>
            </div>
            <span>
              {visibleFeedMarkets.length}/{totalInTab} {feedTab === "active" ? "ACTIVE" : "RESOLVED (24H)"}
            </span>
          </div>

          <div className="ti-feed-list">
            {currentFeedQuery.isLoading && (
              <div className="ti-state-row">
                <div className="spinner" />
              </div>
            )}

            {currentFeedQuery.error && (
              <div className="ti-state-row ti-state-error">Unable to load market feed.</div>
            )}

            {!currentFeedQuery.isLoading && !currentFeedQuery.error && totalInTab === 0 && (
              <div className="ti-state-row">
                {feedTab === "active" ? "No active markets available." : "No markets resolved in the last 24 hours."}
              </div>
            )}

            {!currentFeedQuery.isLoading && !currentFeedQuery.error && totalInTab > 0 && visibleFeedMarkets.length === 0 && (
              <div className="ti-state-row">No markets match that search.</div>
            )}

            {visibleFeedMarkets.map((market) => {
              const probability = toPercent(market.current_price);
              const delta = signedDelta(market);
              const isUp = delta >= 0;

              return (
                <article key={market.id} className="ti-feed-item-wrap">
                  <button
                    className="ti-feed-item"
                    onClick={() =>
                      setExpandedMarketId((current) => (current === market.id ? null : market.id))
                    }
                  >
                    <div className="ti-feed-prob">
                      <span className={probabilityColorClass(probability)}>{probability}%</span>
                    </div>

                    <div className="ti-feed-meter">
                      <div className="ti-feed-meter-track">
                        <div
                          className={`ti-feed-meter-fill ${probabilityColorClass(probability)}`}
                          style={{ width: `${Math.max(2, probability)}%` }}
                        />
                      </div>
                    </div>

                    <div className="ti-feed-title">{market.question.toUpperCase()}</div>

                    <div className="ti-feed-meta">
                      <span className={isUp ? "ti-green" : "ti-red"}>
                        {isUp ? "▲" : "▼"} {isUp ? "+" : ""}
                        {delta}%
                      </span>
                      <span className="ti-meta-chip">{market.category.toUpperCase()}</span>
                      <span>{resolutionLabel(market.resolution_date)}</span>
                    </div>
                  </button>

                  {expandedMarketId === market.id && <ExpandedMarketDetail marketId={market.id} />}
                </article>
              );
            })}
          </div>
        </section>

        <section className="ti-right-col">
          <div className="ti-panel ti-breaking-panel">
            <div className="ti-breaking-head">
              <span className="ti-breaking-pill">BREAKING</span>
              <span className="ti-panel-muted">HIGH CONFIDENCE &gt;85%</span>
            </div>

            {breakingEvents.length === 0 && <p className="ti-empty-note">No high-confidence signals.</p>}

            {breakingEvents.map((event) => {
              const probability = toPercent(event.current_price);
              const delta = Math.abs(signedDelta(event));

              return (
                <article key={event.id} className="ti-breaking-card">
                  <div className="ti-breaking-main">
                    <h3>{event.question}</h3>
                    <div className="ti-panel-muted">
                      <span>POLYMARKET</span>
                      <span>·</span>
                      <span>{event.category.toUpperCase()}</span>
                      <span>·</span>
                      <span>{resolutionLabel(event.resolution_date)}</span>
                    </div>
                  </div>

                  <div className="ti-breaking-score">
                    <div className="ti-amber">{probability}%</div>
                    <div className="ti-green">▲ +{delta}% 24H</div>
                    <div className="ti-breaking-likely">LIKELY</div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="ti-panel ti-movers-panel">
            <div className="ti-panel-head">TRENDING MOVERS - 24H</div>

            <div className="ti-movers-list">
              {movers.map((market) => {
                const delta = signedDelta(market);
                const isUp = delta >= 0;

                return (
                  <div key={market.id} className="ti-mover-row">
                    <div className="ti-mover-main">
                      <span className={`ti-mover-delta ${isUp ? "ti-green" : "ti-red"}`}>
                        {isUp ? "▲+" : "▼"}
                        {delta}%
                      </span>
                      <span className="ti-mover-title">{market.question}</span>
                    </div>
                    <span>{toPercent(market.current_price)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <footer className="ti-status-bar">
        <div>
          <span className={`ti-live-dot ${isConnected ? "is-live" : "is-offline"}`} />
          <span className={isConnected ? "ti-green" : "ti-red"}>
            {isConnected ? "CONNECTED" : "DEGRADED"}
          </span>
          <span className="ti-status-muted">
            POLYMARKET: <strong>{isConnected ? "LIVE" : "CHECKING"}</strong>
          </span>
        </div>

        <div>
          <SyncCountdown lastIngestion={healthQuery.data?.last_ingestion ?? null} />
          <LiveClock />
        </div>
      </footer>
    </div>
  );
}

const TickerBar = memo(function TickerBar({ items }: { items: MarketCard[] }) {
  if (items.length === 0) {
    return (
      <div className="ti-ticker-shell">
        <div className="ti-ticker-track">
          <span className="ti-panel-muted">Loading terminal feed...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="ti-ticker-shell">
      <div className="ti-ticker-track ti-ticker-track-animated">
        {items.concat(items).map((market, idx) => {
          const probability = toPercent(market.current_price);
          const colorClass = probabilityColorClass(probability);
          const symbol = tickerIndicatorSymbol(probability);
          return (
            <span key={`${market.id}-${idx}`} className="ti-ticker-item">
              <span className="ti-panel-muted">{market.question.toUpperCase()}</span>
              <span className={colorClass}>{symbol}</span>
              <span className={`ti-ticker-prob ${colorClass}`}>{probability}%</span>
              <span className="ti-panel-muted">·</span>
            </span>
          );
        })}
      </div>
    </div>
  );
});

TickerBar.displayName = "TickerBar";

const SYNC_INTERVAL_S = 2 * 60; // 2 minutes

function SyncCountdown({ lastIngestion }: { lastIngestion: string | null }) {
  const [now, setNow] = useState(() => Date.now());
  const [justSynced, setJustSynced] = useState(false);
  const prevIngestionRef = useRef<string | null>(null);
  // Tracks when the frontend *detected* the last sync — not the server timestamp.
  // The countdown resets from this moment, so it stays in sync with what the user sees.
  const lastDetectedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (
      lastIngestion &&
      prevIngestionRef.current !== null &&
      prevIngestionRef.current !== lastIngestion
    ) {
      lastDetectedAtRef.current = Date.now();
      setJustSynced(true);
      const id = window.setTimeout(() => setJustSynced(false), 3000);
      return () => window.clearTimeout(id);
    }
    if (lastIngestion && prevIngestionRef.current === null) {
      // First load — seed the timer from the server timestamp
      lastDetectedAtRef.current = new Date(lastIngestion).getTime();
    }
    prevIngestionRef.current = lastIngestion;
  }, [lastIngestion]);

  if (!lastIngestion) {
    return (
      <span className="ti-status-muted">
        SYNC: <strong>N/A</strong>
      </span>
    );
  }

  const elapsedS = Math.max(0, (now - lastDetectedAtRef.current) / 1000);
  const remaining = Math.max(0, SYNC_INTERVAL_S - Math.floor(elapsedS));
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const display = `${minutes}:${String(seconds).padStart(2, "0")}`;

  if (justSynced) {
    return (
      <span className="ti-sync-flash">
        SYNCED <strong className="ti-green">&#10003;</strong>
      </span>
    );
  }

  return (
    <span className="ti-status-muted">
      NEXT SYNC: <strong>{display}</strong>
    </span>
  );
}

function LiveClock() {
  const [timeString, setTimeString] = useState("--:--:--");

  useEffect(() => {
    const updateClock = () => {
      setTimeString(new Date().toLocaleTimeString("en-US", { hour12: false }));
    };

    updateClock();
    const interval = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <span className="ti-green" suppressHydrationWarning>
      {timeString}
    </span>
  );
}

function ExpandedMarketDetail({ marketId }: { marketId: string }) {
  const { data, isLoading } = useMarketDetail(marketId);

  if (isLoading) {
    return <div className="ti-detail-shell">Loading details...</div>;
  }

  if (!data) {
    return <div className="ti-detail-shell">No detail available.</div>;
  }

  const summary =
    data.description?.trim() ||
    "Market context is not available yet. Monitor this contract for additional updates and volume changes.";

  return (
    <div className="ti-detail-shell">
      <div className="ti-detail-grid">
        <div>
          <p className="ti-panel-muted">AI SUMMARY</p>
          <p className="ti-detail-summary">{summary}</p>
          <div className="ti-detail-meta ti-panel-muted">
            <span>SRC: POLYMARKET</span>
            <span>VOL: {formatVolume(data.volume)}</span>
            <span>ODDS: {data.current_price.toFixed(2)}</span>
            <span>UPD: {formatRelativeTime(data.last_updated)}</span>
          </div>
        </div>

        <div>
          <p className="ti-panel-muted">PROBABILITY / 7D</p>
          <MarketHistoryChart history={data.price_history} />
        </div>
      </div>
    </div>
  );
}

function MarketHistoryChart({ history }: { history: PricePoint[] }) {
  if (!history || history.length < 2) {
    return <div className="ti-chart-empty">NO HISTORY</div>;
  }

  const values = history.map((point) => toPercent(point.price));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);

  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 90 - ((value - min) / range) * 80;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="ti-chart-svg">
      <polyline points={points} fill="none" stroke="var(--ti-green)" strokeWidth="2" />
    </svg>
  );
}
