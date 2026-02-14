"use client";

import type { EditorialMarket } from "@/types/feed";

interface ResolvedPanelProps {
  markets: EditorialMarket[];
}

export default function ResolvedPanel({ markets }: ResolvedPanelProps) {
  return (
    <div className="bg-ft-bg-card border border-ft-border p-4 mb-4">
      <div className="text-[10px] tracking-[2px] uppercase text-ft-amber mb-3 pb-2 border-b border-ft-border">
        Recently Resolved
      </div>
      {markets.map((m) => {
        const isYes = m.probability >= 50;
        return (
          <div
            key={m.id}
            className="flex items-center justify-between py-2 border-b border-ft-green-ghost last:border-b-0 cursor-pointer hover:bg-ft-bg-hover transition-colors"
          >
            <span className="text-[11px] text-ft-text-secondary flex-1 mr-2.5 overflow-hidden text-ellipsis whitespace-nowrap">
              {m.headline}
            </span>
            <span
              className={`text-[11px] font-semibold whitespace-nowrap ${isYes ? "text-ft-green-bright" : "text-ft-red"}`}
            >
              {isYes ? "\u2713 YES" : "\u2717 NO"}
            </span>
          </div>
        );
      })}
      {markets.length === 0 && (
        <div className="text-[11px] text-ft-text-dim py-2">
          No recent resolutions
        </div>
      )}
    </div>
  );
}
