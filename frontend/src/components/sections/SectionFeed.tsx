"use client";

import MarketCard from "@/components/cards/MarketCard";
import type { FeedSection } from "@/types/feed";

interface SectionFeedProps {
  section: FeedSection;
}

const gridColsMap: Record<number, string> = {
  2: "grid-cols-2 max-sm:grid-cols-1",
  3: "grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1",
  4: "grid-cols-4 max-md:grid-cols-2 max-sm:grid-cols-1",
};

export default function SectionFeed({ section }: SectionFeedProps) {
  if (section.markets.length === 0) return null;

  const gridCols = gridColsMap[section.grid_cols] ?? "grid-cols-2 max-sm:grid-cols-1";

  return (
    <div className="mb-7">
      <div
        className={`flex items-center gap-2 mb-3 pb-1.5 border-b border-ft-border text-[10px] tracking-[3px] uppercase ${
          section.type === "breaking" ? "text-ft-red" : "text-ft-text-dim"
        }`}
      >
        <span
          className={`w-1 h-1 inline-block ${
            section.type === "breaking"
              ? "bg-ft-red animate-pulse-dot"
              : "bg-ft-green-bright"
          }`}
        />
        {section.label}
      </div>
      <div className={`grid gap-4 ${gridCols}`}>
        {section.markets.map((m, i) => (
          <MarketCard
            key={m.id}
            market={m}
            variant={section.card_variant}
            animationDelay={0.05 + i * 0.05}
          />
        ))}
      </div>
    </div>
  );
}
