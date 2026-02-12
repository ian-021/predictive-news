"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useCategories, useHealth, useMarketDetail, useMarketFeed } from "@/hooks/useMarkets";
import { formatRelativeTime, formatVolume } from "@/lib/utils";
import type { CategorySlug, FeedFilters, MarketCard, PricePoint } from "@/lib/types";

type CategoryFilter = "all" | CategorySlug;

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
  if (probability > 80) return "ti-green";
  if (probability >= 50) return "ti-amber";
  return "ti-red";
};

const tickerIndicatorSymbol = (probability: number) => {
  if (probability > 80) return "▲";
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
  const [expandedMarketId, setExpandedMarketId] = useState<string | null>(null);

  useEffect(() => {
    setExpandedMarketId(null);
  }, [selectedCategory]);

  const filters: FeedFilters = useMemo(
    () => ({
      category: selectedCategory === "all" ? null : selectedCategory,
      sort: "interesting",
      limit: 100,
      offset: 0,
    }),
    [selectedCategory]
  );

  const feedQuery = useMarketFeed(filters);
  const categoriesQuery = useCategories();
  const healthQuery = useHealth();

  const markets = useMemo(
    () => (feedQuery.data?.pages ?? []).flatMap((page) => page.markets),
    [feedQuery.data]
  );

  const sortedMarkets = useMemo(() => {
    return [...markets].sort((a, b) => toPercent(b.current_price) - toPercent(a.current_price));
  }, [markets]);

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

  const avgConfidence = useMemo(() => {
    if (sortedMarkets.length === 0) return 0;
    const total = sortedMarkets.reduce((sum, market) => sum + toPercent(market.current_price), 0);
    return total / sortedMarkets.length;
  }, [sortedMarkets]);

  const highConfidenceCount = useMemo(
    () => sortedMarkets.filter((market) => toPercent(market.current_price) >= 80).length,
    [sortedMarkets]
  );

  const syncText = useMemo(() => {
    const staleness = healthQuery.data?.staleness_minutes;
    if (staleness === null || staleness === undefined) return "N/A";
    if (staleness < 1) return "<1m AGO";
    return `${Math.round(staleness)}m AGO`;
  }, [healthQuery.data?.staleness_minutes]);

  const healthScore = useMemo(() => {
    const rate = healthQuery.data?.api_error_rate;
    if (rate === null || rate === undefined) return "--";
    const score = Math.max(0, 100 - rate * 100);
    return score.toFixed(1);
  }, [healthQuery.data?.api_error_rate]);

  const isConnected = healthQuery.data?.status === "ok";

  return (
    <div className="ti-shell">
      <div className="ti-crt-overlay" />

      <TickerBar items={tickerItems} />

      <header className="ti-brand-header">
        <div className="ti-brand-left">
          <h1 className="ti-brand-logo">FTS</h1>
          <span className="ti-brand-subtitle">NEWS TERMINAL FROM THE FUTURE</span>
        </div>
        <div className="ti-brand-meta">
          <span>v2.4.1</span>
          <span>SESSION: ACTIVE</span>
          <span className="ti-cursor">_</span>
        </div>
      </header>

      <section className="ti-stats-bar">
        <span>
          TRACKED: <strong>{feedQuery.data?.pages[0]?.total ?? sortedMarkets.length}</strong>
        </span>
        <span>
          AVG CONF: <strong>{avgConfidence.toFixed(1)}%</strong>
        </span>
        <span>
          &gt;80% PROB: <strong>{highConfidenceCount}</strong>
        </span>
        <span>
          API HEALTH: <strong>{healthScore === "--" ? healthScore : `${healthScore}%`}</strong>
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

        <section className="ti-panel ti-feed-panel">
          <div className="ti-panel-head ti-feed-head">
            <span>PRIMARY FEED - WIRE SERVICE</span>
            <span>{sortedMarkets.length} ACTIVE</span>
          </div>

          <div className="ti-feed-list">
            {feedQuery.isLoading && (
              <div className="ti-state-row">
                <div className="spinner" />
              </div>
            )}

            {feedQuery.error && (
              <div className="ti-state-row ti-state-error">Unable to load market feed.</div>
            )}

            {!feedQuery.isLoading && !feedQuery.error && sortedMarkets.length === 0 && (
              <div className="ti-state-row">No active markets available.</div>
            )}

            {sortedMarkets.map((market) => {
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
          <span className="ti-status-muted">
            LAST SYNC: <strong>{syncText}</strong>
          </span>
          <LiveClock />
        </div>
      </footer>
    </div>
  );
}

const TickerBar = memo(function TickerBar({ items }: { items: MarketCard[] }) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const segmentWidthRef = useRef(0);
  const offsetRef = useRef(0);
  const speedRef = useRef(0);
  const isHoveredRef = useRef(false);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || items.length === 0) return;

    const syncWidth = () => {
      const segmentWidth = track.scrollWidth / 2;
      segmentWidthRef.current = segmentWidth;

      if (segmentWidth <= 0) {
        offsetRef.current = 0;
        track.style.transform = "translate3d(0, 0, 0)";
        return;
      }

      while (offsetRef.current <= -segmentWidth) {
        offsetRef.current += segmentWidth;
      }
      while (offsetRef.current > 0) {
        offsetRef.current -= segmentWidth;
      }

      track.style.transform = `translate3d(${offsetRef.current}px, 0, 0)`;
    };

    syncWidth();
    window.addEventListener("resize", syncWidth);

    return () => window.removeEventListener("resize", syncWidth);
  }, [items]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || items.length === 0) return;

    const baseDurationSeconds = 48.9;
    const speedFactor = 0.3;
    const stopEasingMs = 165;
    let lastFrame = performance.now();

    const animate = (timestamp: number) => {
      const deltaMs = timestamp - lastFrame;
      lastFrame = timestamp;
      const segmentWidth = segmentWidthRef.current;

      if (segmentWidth > 0) {
        const baseSpeedPxPerSecond = (segmentWidth / baseDurationSeconds) * speedFactor;
        const targetSpeedPxPerSecond = isHoveredRef.current ? 0 : baseSpeedPxPerSecond;
        const easing = 1 - Math.exp(-deltaMs / stopEasingMs);

        speedRef.current += (targetSpeedPxPerSecond - speedRef.current) * easing;
        offsetRef.current -= speedRef.current * (deltaMs / 1000);

        if (offsetRef.current <= -segmentWidth) {
          offsetRef.current += segmentWidth;
        }

        track.style.transform = `translate3d(${offsetRef.current}px, 0, 0)`;
      }

      frameRef.current = window.requestAnimationFrame(animate);
    };

    frameRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [items]);

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
    <div
      className="ti-ticker-shell"
      onMouseEnter={() => {
        isHoveredRef.current = true;
      }}
      onMouseLeave={() => {
        isHoveredRef.current = false;
      }}
    >
      <div ref={trackRef} className="ti-ticker-track">
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
