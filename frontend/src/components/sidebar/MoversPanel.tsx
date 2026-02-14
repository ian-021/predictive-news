"use client";

import type { EditorialMarket } from "@/types/feed";

interface MoversPanelProps {
  markets: EditorialMarket[];
}

export default function MoversPanel({ markets }: MoversPanelProps) {
  return (
    <div className="bg-ft-bg-card border border-ft-border p-4 mb-4">
      <div className="text-[10px] tracking-[2px] uppercase text-ft-amber mb-3 pb-2 border-b border-ft-border">
        &#9650; Biggest Movers &middot; 24H
      </div>
      {markets.map((m) => {
        const change = m.change_24h ?? 0;
        const isUp = change >= 0;
        return (
          <div
            key={m.id}
            className="flex items-center justify-between py-2 border-b border-ft-green-ghost last:border-b-0 cursor-pointer hover:bg-ft-bg-hover transition-colors"
          >
            <span className="text-[11px] text-ft-text-secondary flex-1 mr-2.5 overflow-hidden text-ellipsis whitespace-nowrap">
              {m.headline}
            </span>
            <span
              className={`text-[11px] font-semibold whitespace-nowrap ${isUp ? "text-ft-green-bright" : "text-ft-red"}`}
            >
              {isUp ? "\u25B2" : "\u25BC"}
              {isUp ? "+" : ""}
              {Math.round(change)}%
            </span>
            <span className="text-[11px] text-ft-text-dim ml-2 min-w-[32px] text-right">
              {m.probability}%
            </span>
          </div>
        );
      })}
      {markets.length === 0 && (
        <div className="text-[11px] text-ft-text-dim py-2">
          No significant movers
        </div>
      )}
    </div>
  );
}
