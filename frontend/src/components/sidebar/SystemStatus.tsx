"use client";

import type { FeedMeta } from "@/types/feed";

interface SystemStatusProps {
  meta: FeedMeta | null;
}

export default function SystemStatus({ meta }: SystemStatusProps) {
  const sources = meta?.sources_status ?? {};

  return (
    <div className="bg-ft-bg-card border border-ft-border p-4">
      <div className="text-[10px] tracking-[2px] uppercase text-ft-amber mb-3 pb-2 border-b border-ft-border">
        System Status
      </div>
      <div className="text-[11px] text-ft-text-secondary leading-[1.8]">
        {Object.entries(sources).map(([source, status]) => {
          const isHealthy =
            status === "connected" || status === "healthy";
          const color = isHealthy ? "text-ft-green-bright" : "text-ft-amber";
          return (
            <div key={source}>
              <span className={color}>&#9679;</span>{" "}
              {source.toUpperCase()}: {status.toUpperCase()}
            </div>
          );
        })}
        {Object.keys(sources).length === 0 && (
          <div>
            <span className="text-ft-green-bright">&#9679;</span> POLYMARKET:
            CONNECTED
          </div>
        )}
        <div className="text-ft-text-dim mt-2">
          MARKETS: {meta?.total_markets ?? "..."} ACTIVE
        </div>
        {meta?.last_sync && (
          <div className="text-ft-text-dim">
            LAST SYNC:{" "}
            {new Date(meta.last_sync).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })}
          </div>
        )}
      </div>
    </div>
  );
}
