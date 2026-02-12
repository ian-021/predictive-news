"use client";

import type { MarketCard as MarketCardType } from "@/lib/types";
import { ProbabilityGauge } from "./ProbabilityGauge";
import { TrendArrow } from "./TrendArrow";
import { BookmarkButton } from "./BookmarkButton";
import { formatVolume, formatCategory } from "@/lib/utils";

interface MarketCardProps {
  market: MarketCardType;
  isBookmarked: boolean;
  onToggleBookmark: (id: string) => void;
  onClick: (id: string) => void;
}

export function MarketCard({
  market,
  isBookmarked,
  onToggleBookmark,
  onClick,
}: MarketCardProps) {
  return (
    <article
      onClick={() => onClick(market.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(market.id);
        }
      }}
      style={{
        backgroundColor: "var(--bg-card)",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border-subtle)",
        padding: "var(--space-lg)",
        cursor: "pointer",
        transition: "all var(--transition-fast)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-md)",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.backgroundColor = "var(--bg-card-hover)";
        el.style.borderColor = "var(--border-primary)";
        el.style.boxShadow = "var(--shadow-card-hover)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.backgroundColor = "var(--bg-card)";
        el.style.borderColor = "var(--border-subtle)";
        el.style.boxShadow = "none";
      }}
    >
      {/* Header: category + bookmark */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
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
            backgroundColor: "var(--bg-secondary)",
          }}
        >
          {formatCategory(market.category)}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
          <TrendArrow delta={market.delta} />
          <BookmarkButton
            isBookmarked={isBookmarked}
            onClick={(e) => {
              e.stopPropagation();
              onToggleBookmark(market.id);
            }}
          />
        </div>
      </div>

      {/* Question */}
      <h3
        style={{
          fontSize: "0.95rem",
          fontWeight: 500,
          lineHeight: 1.45,
          color: "var(--text-primary)",
          flex: 1,
        }}
      >
        {market.question}
      </h3>

      {/* Probability gauge */}
      <ProbabilityGauge probability={market.current_price} size="md" />

      {/* Footer: volume */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.75rem",
          color: "var(--text-muted)",
        }}
      >
        <span>Vol: {formatVolume(market.volume)}</span>
        {market.resolution_date && (
          <span>
            Resolves:{" "}
            {new Date(market.resolution_date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year:
                new Date(market.resolution_date).getFullYear() !==
                new Date().getFullYear()
                  ? "numeric"
                  : undefined,
            })}
          </span>
        )}
      </div>
    </article>
  );
}
