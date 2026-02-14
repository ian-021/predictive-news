"use client";

import { useState, useEffect } from "react";

interface CategoryTab {
  slug: string;
  label: string;
  count: number;
}

interface NavBarProps {
  categories: CategoryTab[];
  selected: string | null;
  onSelect: (slug: string | null) => void;
}

const DEFAULT_TABS: CategoryTab[] = [
  { slug: "all", label: "All", count: 0 },
  { slug: "politics", label: "Politics", count: 0 },
  { slug: "crypto", label: "Crypto", count: 0 },
  { slug: "sports", label: "Sports", count: 0 },
  { slug: "tech", label: "Tech", count: 0 },
  { slug: "other", label: "Other", count: 0 },
];

export default function NavBar({ categories, selected, onSelect }: NavBarProps) {
  // Merge counts from categories prop into default tabs
  const tabs = DEFAULT_TABS.map((tab) => {
    if (tab.slug === "all") {
      return {
        ...tab,
        count: categories.reduce((sum, c) => sum + c.count, 0),
      };
    }
    const found = categories.find((c) => c.slug === tab.slug);
    return { ...tab, count: found?.count ?? 0 };
  });

  const [timeStr, setTimeStr] = useState("");

  useEffect(() => {
    const months = [
      "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
      "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
    ];
    const now = new Date();
    setTimeStr(`${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`);
  }, []);

  return (
    <nav className="flex items-center gap-1.5 px-6 py-2.5 border-b border-ft-border bg-ft-bg-panel flex-wrap">
      {tabs.map((tab) => {
        const isActive =
          (tab.slug === "all" && selected === null) ||
          tab.slug === selected;

        return (
          <button
            key={tab.slug}
            onClick={() => onSelect(tab.slug === "all" ? null : tab.slug)}
            className={`
              px-3.5 py-1.5 font-body text-[11px] tracking-wider uppercase
              border transition-all duration-200 cursor-pointer
              ${
                isActive
                  ? "text-ft-green-bright border-ft-green-dim bg-ft-green-ghost"
                  : "text-ft-text-secondary border-transparent hover:text-ft-green-mid hover:border-ft-border-bright"
              }
            `}
          >
            {tab.label}
            <span className="text-ft-text-dim text-[10px] ml-1">
              {tab.count}
            </span>
          </button>
        );
      })}
      <div className="ml-auto text-[11px] text-ft-text-dim">{timeStr}</div>
    </nav>
  );
}
