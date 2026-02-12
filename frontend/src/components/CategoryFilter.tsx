"use client";

import type { CategorySlug } from "@/lib/types";

interface CategoryFilterProps {
  activeCategory: CategorySlug | null;
  onCategoryChange: (category: CategorySlug | null) => void;
}

const CATEGORIES: { slug: CategorySlug | null; label: string }[] = [
  { slug: null, label: "All" },
  { slug: "politics", label: "Politics" },
  { slug: "crypto", label: "Crypto" },
  { slug: "sports", label: "Sports" },
  { slug: "tech", label: "Tech" },
  { slug: "other", label: "Other" },
];

export function CategoryFilter({
  activeCategory,
  onCategoryChange,
}: CategoryFilterProps) {
  return (
    <div
      style={{
        display: "flex",
        gap: "var(--space-sm)",
        overflowX: "auto",
        paddingBottom: "var(--space-xs)",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      {CATEGORIES.map(({ slug, label }) => {
        const isActive = activeCategory === slug;
        return (
          <button
            key={slug ?? "all"}
            onClick={() => onCategoryChange(slug)}
            style={{
              padding: "6px 16px",
              borderRadius: "var(--radius-full)",
              fontSize: "0.8rem",
              fontWeight: 600,
              whiteSpace: "nowrap",
              transition: "all var(--transition-fast)",
              backgroundColor: isActive ? "var(--text-primary)" : "var(--bg-secondary)",
              color: isActive ? "var(--bg-primary)" : "var(--text-secondary)",
              border: isActive
                ? "1px solid var(--text-primary)"
                : "1px solid var(--border-primary)",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
