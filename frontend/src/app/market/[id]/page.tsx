"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { useMarketDetail } from "@/hooks/useMarkets";
import { useBookmarks } from "@/hooks/useBookmarks";
import { ProbabilityGauge } from "@/components/ProbabilityGauge";
import { TrendArrow } from "@/components/TrendArrow";
import { BookmarkButton } from "@/components/BookmarkButton";
import { SparklineChart } from "@/components/SparklineChart";
import {
  formatVolume,
  formatCategory,
  formatCountdown,
  formatRelativeTime,
  getShareUrl,
  copyToClipboard,
} from "@/lib/utils";

export default function MarketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: market, isLoading, error } = useMarketDetail(id);
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = getShareUrl(id);
    const success = await copyToClipboard(url);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
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
    );
  }

  if (error || !market) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "var(--space-md)",
        }}
      >
        <p style={{ color: "var(--text-secondary)" }}>Market not found.</p>
        <button
          onClick={() => router.push("/")}
          style={{
            padding: "8px 20px",
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--bg-card)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-primary)",
            fontSize: "0.85rem",
          }}
        >
          Back to Feed
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg-primary)",
      }}
    >
      {/* Header */}
      <header
        style={{
          borderBottom: "1px solid var(--border-subtle)",
          padding: "var(--space-md) var(--space-lg)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <button
          onClick={() => router.push("/")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-xs)",
            fontSize: "0.85rem",
            color: "var(--text-secondary)",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span style={{ color: "var(--accent-green)" }}>Poly</span>News
        </button>
        <div style={{ display: "flex", gap: "var(--space-sm)" }}>
          <BookmarkButton
            isBookmarked={isBookmarked(market.id)}
            onClick={() => toggleBookmark(market.id)}
            size="md"
          />
          <button
            onClick={handleShare}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-xs)",
              fontSize: "0.8rem",
              color: copied ? "var(--accent-green)" : "var(--text-secondary)",
              padding: "6px 12px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border-primary)",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
            </svg>
            {copied ? "Copied!" : "Share"}
          </button>
        </div>
      </header>

      {/* Content */}
      <main
        className="container"
        style={{
          maxWidth: 640,
          paddingTop: "var(--space-xl)",
          paddingBottom: "var(--space-2xl)",
        }}
      >
        {/* Category badge */}
        <span
          style={{
            fontSize: "0.7rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--text-muted)",
            padding: "2px 8px",
            borderRadius: "var(--radius-full)",
            backgroundColor: "var(--bg-card)",
            display: "inline-block",
            marginBottom: "var(--space-md)",
          }}
        >
          {formatCategory(market.category)}
        </span>

        {/* Question */}
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            lineHeight: 1.35,
            marginBottom: "var(--space-xl)",
          }}
        >
          {market.question}
        </h1>

        {/* Probability */}
        <div
          style={{
            backgroundColor: "var(--bg-card)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-lg)",
            marginBottom: "var(--space-lg)",
          }}
        >
          <ProbabilityGauge probability={market.current_price} size="lg" />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-sm)",
              marginTop: "var(--space-md)",
            }}
          >
            <TrendArrow delta={market.delta} threshold={0.01} />
            {market.delta !== null && Math.abs(market.delta) >= 0.01 && (
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                24h change
              </span>
            )}
          </div>
        </div>

        {/* Chart */}
        <div
          style={{
            backgroundColor: "var(--bg-card)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-md)",
            marginBottom: "var(--space-lg)",
          }}
        >
          <h2
            style={{
              fontSize: "0.8rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--text-muted)",
              marginBottom: "var(--space-md)",
            }}
          >
            7-Day Price History
          </h2>
          <SparklineChart data={market.price_history} height={220} />
        </div>

        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "var(--space-sm)",
            marginBottom: "var(--space-lg)",
          }}
        >
          <StatBox label="Volume" value={formatVolume(market.volume)} />
          <StatBox label="Liquidity" value={formatVolume(market.open_interest)} />
          {market.resolution_date && (
            <StatBox
              label="Resolution"
              value={formatCountdown(market.resolution_date)}
            />
          )}
          <StatBox
            label="Updated"
            value={formatRelativeTime(market.last_updated)}
          />
        </div>

        {/* Description */}
        {market.description && (
          <div
            style={{
              backgroundColor: "var(--bg-card)",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-lg)",
              marginBottom: "var(--space-lg)",
            }}
          >
            <h2
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--text-muted)",
                marginBottom: "var(--space-sm)",
              }}
            >
              Resolution Criteria
            </h2>
            <p
              style={{
                fontSize: "0.875rem",
                lineHeight: 1.6,
                color: "var(--text-secondary)",
                whiteSpace: "pre-wrap",
              }}
            >
              {market.description}
            </p>
          </div>
        )}

        {/* Freshness */}
        <div
          style={{
            textAlign: "center",
            padding: "var(--space-md)",
            fontSize: "0.75rem",
            color: "var(--text-muted)",
          }}
        >
          As of{" "}
          {new Date(market.last_updated).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </div>
      </main>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        backgroundColor: "var(--bg-card)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-md)",
      }}
    >
      <div
        style={{
          fontSize: "0.7rem",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "var(--text-muted)",
          marginBottom: "var(--space-xs)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "0.95rem",
          fontWeight: 600,
          fontFamily: "var(--font-mono)",
          color: "var(--text-primary)",
        }}
      >
        {value}
      </div>
    </div>
  );
}
