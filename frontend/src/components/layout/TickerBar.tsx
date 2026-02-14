"use client";

import type { TickerItem } from "@/types/feed";

interface TickerBarProps {
  items: TickerItem[];
}

export default function TickerBar({ items }: TickerBarProps) {
  if (items.length === 0) return null;

  // Duplicate items for seamless loop
  const doubled = [...items, ...items];

  return (
    <div className="bg-ft-bg-deep border-b border-ft-border py-2 overflow-hidden whitespace-nowrap">
      <div className="inline-block animate-ticker-scroll text-[11px] tracking-wide">
        {doubled.map((item, i) => (
          <span key={i} className="inline mr-10">
            <span className="text-ft-text-secondary">{item.label}</span>{" "}
            <span
              className={`font-bold ${item.change >= 0 ? "text-ft-green-bright" : "text-ft-red"}`}
            >
              {item.change >= 0 ? "\u25B2" : "\u25BC"}
              {item.change >= 0 ? "+" : ""}
              {Math.round(item.change)}% &rarr; {Math.round(item.probability)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
