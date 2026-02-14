"use client";

import { useState } from "react";
import Header from "./Header";
import TickerBar from "./TickerBar";
import NavBar from "./NavBar";
import Sidebar from "./Sidebar";
import BreakingHero from "@/components/sections/BreakingHero";
import StoryCluster from "@/components/sections/StoryCluster";
import SectionFeed from "@/components/sections/SectionFeed";
import { useEditorialFeed } from "@/hooks/useEditorialFeed";

export default function AppShell() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { data: feed, isLoading, error } = useEditorialFeed(selectedCategory);

  // Category counts from feed meta or empty
  const categoryTabs = feed
    ? [
        { slug: "politics", label: "Politics", count: 0 },
        { slug: "crypto", label: "Crypto", count: 0 },
        { slug: "sports", label: "Sports", count: 0 },
        { slug: "tech", label: "Tech", count: 0 },
        { slug: "other", label: "Other", count: 0 },
      ]
    : [];

  return (
    <div className="min-h-screen bg-ft-bg-deep text-ft-text-primary font-body text-[13px] leading-normal editorial-scanline">
      <Header meta={feed?.meta ?? null} />
      <TickerBar items={feed?.ticker ?? []} />
      <NavBar
        categories={categoryTabs}
        selected={selectedCategory}
        onSelect={setSelectedCategory}
      />

      <div className="max-w-[1440px] mx-auto px-6 py-5">
        {isLoading && (
          <div className="flex items-center justify-center py-20 text-ft-text-dim text-sm">
            <div className="spinner mr-3" />
            Loading editorial feed...
          </div>
        )}

        {error && (
          <div className="text-ft-red text-sm py-10 text-center">
            Failed to load feed: {(error as Error).message}
          </div>
        )}

        {feed && (
          <div className="grid grid-cols-[1fr_300px] gap-6 items-start max-lg:grid-cols-1">
            {/* Main content */}
            <div>
              <BreakingHero hero={feed.hero} />

              {feed.clusters.map((cluster) => (
                <StoryCluster key={cluster.id} cluster={cluster} />
              ))}

              {feed.sections.map((section, i) => (
                <SectionFeed key={i} section={section} />
              ))}
            </div>

            {/* Sidebar */}
            <Sidebar
              movers={feed.movers}
              resolved={feed.recently_resolved}
              meta={feed.meta}
            />
          </div>
        )}
      </div>
    </div>
  );
}
