"use client";

import type { FeedMeta } from "@/types/feed";

interface HeaderProps {
  meta: FeedMeta | null;
}

export default function Header({ meta }: HeaderProps) {
  return (
    <header className="sticky top-0 z-[100] border-b border-ft-border bg-ft-bg-panel px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div>
          <div
            className="font-display text-[28px] font-bold text-ft-green-bright tracking-[6px]"
            style={{
              textShadow:
                "0 0 20px rgba(0,255,65,0.4), 0 0 40px rgba(0,255,65,0.1)",
            }}
          >
            FTS
          </div>
          <div className="text-[10px] text-ft-text-dim tracking-[3px] uppercase">
            Terminal for News from the Future
          </div>
        </div>
      </div>
      <div className="flex items-center gap-5 text-[11px] text-ft-text-dim tracking-wider">
        <span className="text-ft-text-secondary">V2.4.1</span>
        <span className="text-ft-green-mid flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-ft-green-bright animate-pulse-dot" />
          SESSION: ACTIVE
        </span>
        <span>{meta?.total_markets ?? "..."} MARKETS</span>
      </div>
    </header>
  );
}
