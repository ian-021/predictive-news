"use client";

import type { MarketCardProps, CardVariant } from "@/types/feed";
import ConfidenceBadge from "./ConfidenceBadge";
import ProbabilityBar from "./ProbabilityBar";
import ChangeTag from "./ChangeTag";
import { formatDate } from "@/utils/formatting";

const variantConfig: Record<
  CardVariant,
  {
    titleClass: string;
    probClass: string;
    showSummary: boolean;
    showProbBar: boolean;
    showAccent: boolean;
  }
> = {
  hero: {
    titleClass: "text-xl leading-snug",
    probClass: "text-5xl",
    showSummary: true,
    showProbBar: true,
    showAccent: true,
  },
  medium: {
    titleClass: "text-base leading-snug",
    probClass: "text-3xl",
    showSummary: true,
    showProbBar: true,
    showAccent: true,
  },
  compact: {
    titleClass: "text-sm leading-snug",
    probClass: "text-2xl",
    showSummary: true,
    showProbBar: true,
    showAccent: true,
  },
  mini: {
    titleClass: "text-xs leading-snug",
    probClass: "text-xl",
    showSummary: false,
    showProbBar: false,
    showAccent: false,
  },
};

export default function MarketCard({
  market,
  variant,
  showSummary,
  showProbBar,
  animationDelay = 0,
}: MarketCardProps) {
  const config = variantConfig[variant];
  const shouldShowSummary = showSummary ?? config.showSummary;
  const shouldShowProbBar = showProbBar ?? config.showProbBar;

  const linkUrl = market.slug
    ? `https://polymarket.com/event/${market.slug}`
    : `/market/${market.id}`;

  return (
    <a
      href={linkUrl}
      target={market.slug ? "_blank" : undefined}
      rel={market.slug ? "noopener noreferrer" : undefined}
      className="block group"
      style={{ animationDelay: `${animationDelay}s` }}
    >
      <div
        className={`
          relative bg-ft-bg-card border border-ft-border p-5 cursor-pointer
          transition-all duration-300 ease-out
          hover:bg-ft-bg-hover hover:border-ft-border-bright
          opacity-0 animate-fade-in
        `}
      >
        {/* Left accent bar */}
        {config.showAccent && (
          <div
            className="absolute top-0 left-0 w-[3px] h-full bg-ft-green-dim
              transition-all duration-300
              group-hover:bg-ft-green-bright group-hover:shadow-glow-green"
          />
        )}

        {/* Meta row */}
        <div className="flex items-center gap-2 mb-2.5 text-[10px] tracking-wider uppercase">
          <span className="text-ft-cyan">POLYMARKET</span>
          <span className="text-ft-text-dim px-1.5 py-0.5 border border-ft-border">
            {market.category.toUpperCase()}
          </span>
          {market.resolution_date && (
            <span className="text-ft-text-dim">
              {formatDate(market.resolution_date)}
            </span>
          )}
          {variant !== "mini" && <ChangeTag change={market.change_24h} />}
        </div>

        {/* Title */}
        <h3
          className={`font-headline font-semibold text-ft-text-primary mb-2.5 ${config.titleClass}`}
        >
          {market.headline}
        </h3>

        {/* Summary */}
        {shouldShowSummary && market.summary && (
          <p
            className={`text-xs text-ft-text-secondary leading-relaxed mb-3.5 ${
              variant === "compact"
                ? "line-clamp-2"
                : variant === "medium"
                  ? "line-clamp-2"
                  : ""
            }`}
          >
            {market.summary}
          </p>
        )}

        {/* Footer: probability + badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1">
            <span
              className={`font-display font-bold text-ft-green-bright leading-none ${config.probClass}`}
              style={{ textShadow: "0 0 15px rgba(0,255,65,0.3)" }}
            >
              {market.probability}
            </span>
            <span className="text-base text-ft-green-mid">%</span>
            <span className="text-[10px] text-ft-text-dim tracking-wider uppercase ml-2">
              likelihood
            </span>
          </div>
          <ConfidenceBadge probability={market.probability} />
        </div>

        {/* Probability bar */}
        {shouldShowProbBar && (
          <ProbabilityBar probability={market.probability} />
        )}
      </div>
    </a>
  );
}
