"use client";

import ConfidenceBadge from "@/components/cards/ConfidenceBadge";
import type { StoryClusterData } from "@/types/feed";

interface StoryClusterProps {
  cluster: StoryClusterData;
}

export default function StoryCluster({ cluster }: StoryClusterProps) {
  if (cluster.markets.length === 0) return null;

  return (
    <div className="bg-ft-bg-card border border-ft-border p-5 mb-7 opacity-0 animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-[9px] tracking-[2px] uppercase bg-ft-amber text-ft-bg-deep px-2 py-0.5 font-bold">
          {cluster.tag}
        </span>
        <span className="font-headline text-sm font-semibold text-ft-amber">
          {cluster.title}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-3 max-md:grid-cols-2 max-sm:grid-cols-1">
        {cluster.markets.map((m) => (
          <a
            key={m.id}
            href={
              m.slug
                ? `https://polymarket.com/event/${m.slug}`
                : `/market/${m.id}`
            }
            target={m.slug ? "_blank" : undefined}
            rel={m.slug ? "noopener noreferrer" : undefined}
            className="p-3 border border-ft-border bg-ft-bg-panel transition-all duration-200 cursor-pointer hover:border-ft-border-bright hover:bg-ft-bg-hover"
          >
            <div className="text-[11px] text-ft-text-secondary mb-2 leading-snug">
              {m.headline}
            </div>
            <div
              className={`font-display text-[22px] font-bold leading-none ${
                m.probability >= 40
                  ? "text-ft-green-bright"
                  : "text-ft-amber"
              }`}
              style={{ textShadow: "0 0 10px rgba(0,255,65,0.2)" }}
            >
              {m.probability}%
            </div>
            <div className="text-[9px] text-ft-text-dim tracking-wider mt-0.5">
              <ConfidenceBadge probability={m.probability} />
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
