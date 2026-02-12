"use client";

import type { SortOption } from "@/lib/types";

interface SortToggleProps {
  activeSort: SortOption;
  onSortChange: (sort: SortOption) => void;
}

export function SortToggle({ activeSort, onSortChange }: SortToggleProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-xs)",
        backgroundColor: "var(--bg-secondary)",
        borderRadius: "var(--radius-sm)",
        padding: 2,
        border: "1px solid var(--border-subtle)",
      }}
    >
      <SortButton
        label="Most Interesting"
        isActive={activeSort === "interesting"}
        onClick={() => onSortChange("interesting")}
      />
      <SortButton
        label="Trending"
        isActive={activeSort === "trending"}
        onClick={() => onSortChange("trending")}
      />
    </div>
  );
}

function SortButton({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "5px 12px",
        borderRadius: "var(--radius-sm)",
        fontSize: "0.75rem",
        fontWeight: 500,
        transition: "all var(--transition-fast)",
        backgroundColor: isActive ? "var(--bg-card-hover)" : "transparent",
        color: isActive ? "var(--text-primary)" : "var(--text-muted)",
      }}
    >
      {label}
    </button>
  );
}
