"use client";

import { useState, lazy, Suspense } from "react";
import { useMarketDetail } from "@/hooks/useMarkets";
import { useBookmarks } from "@/hooks/useBookmarks";
import { ProbabilityGauge } from "./ProbabilityGauge";
import { TrendArrow } from "./TrendArrow";
import { BookmarkButton } from "./BookmarkButton";
import { SparklineChart } from "./SparklineChart";
import {
  formatVolume,
  formatCategory,
  formatCountdown,
  formatRelativeTime,
  getShareUrl,
  copyToClipboard,
} from "@/lib/utils";

interface MarketDetailProps {
  marketId: string;
  onClose: () => void;
}

export function MarketDetail({ marketId, onClose }: MarketDetailProps) {
  const { data: market, isLoading, error } = useMarketDetail(marketId);
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = getShareUrl(marketId);
    const success = await copyToClipboard(url);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "var(--bg-overlay)",
          zIndex: 100,
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          maxWidth: 560,
          backgroundColor: "var(--bg-secondary)",
          zIndex: 101,
          overflowY: "auto",
          boxShadow: "var(--shadow-modal)",
          animation: "slideInRight 0.3s ease",
        }}
      >
        {/* Close button */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "var(--space-md) var(--space-lg)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <button
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-xs)",
              fontSize: "0.85rem",
              color: "var(--text-secondary)",
              padding: "var(--space-xs) var(--space-sm)",
              borderRadius: "var(--radius-sm)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div style={{ display: "flex", gap: "var(--space-sm)" }}>
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
              </svg>
              {copied ? "Copied!" : "Share"}
            </button>
          </div>
        </div>

        {isLoading && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "var(--space-2xl)",
            }}
          >
            <div className="spinner" />
          </div>
        )}

        {error && (
          <div
            style={{
              textAlign: "center",
              padding: "var(--space-2xl)",
              color: "var(--text-secondary)",
            }}
          >
            Unable to load market details.
          </div>
        )}

        {market && (
          <div style={{ padding: "var(--space-lg)" }}>
            {/* Category + Bookmark */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "var(--space-md)",
              }}
            >
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
                }}
              >
                {formatCategory(market.category)}
              </span>
              <BookmarkButton
                isBookmarked={isBookmarked(market.id)}
                onClick={() => toggleBookmark(market.id)}
                size="md"
              />
            </div>

            {/* Question */}
            <h2
              style={{
                fontSize: "1.25rem",
                fontWeight: 600,
                lineHeight: 1.4,
                marginBottom: "var(--space-lg)",
                color: "var(--text-primary)",
              }}
            >
              {market.question}
            </h2>

            {/* Large probability display */}
            <div
              style={{
                backgroundColor: "var(--bg-card)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-lg)",
                marginBottom: "var(--space-lg)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-md)",
                  marginBottom: "var(--space-md)",
                }}
              >
                <ProbabilityGauge
                  probability={market.current_price}
                  size="lg"
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                <TrendArrow delta={market.delta} threshold={0.01} />
                {market.delta !== null && Math.abs(market.delta) >= 0.01 && (
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    24h change
                  </span>
                )}
              </div>
            </div>

            {/* 7-day Sparkline chart */}
            <div
              style={{
                marginBottom: "var(--space-lg)",
                backgroundColor: "var(--bg-card)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-md)",
              }}
            >
              <h3
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
              </h3>
              <SparklineChart data={market.price_history} height={180} />
            </div>

            {/* Stats grid */}
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
                <StatBox label="Resolution" value={formatCountdown(market.resolution_date)} />
              )}
              <StatBox label="Updated" value={formatRelativeTime(market.last_updated)} />
            </div>

            {/* Description / Resolution Criteria */}
            {market.description && (
              <div
                style={{
                  backgroundColor: "var(--bg-card)",
                  borderRadius: "var(--radius-md)",
                  padding: "var(--space-lg)",
                  marginBottom: "var(--space-lg)",
                }}
              >
                <h3
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
                </h3>
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

            {/* Data freshness */}
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
          </div>
        )}
      </div>
    </>
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
