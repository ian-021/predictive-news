"use client";

import MarketCard from "@/components/cards/MarketCard";
import type { HeroSection } from "@/types/feed";

interface BreakingHeroProps {
  hero: HeroSection;
}

export default function BreakingHero({ hero }: BreakingHeroProps) {
  if (!hero.primary) return null;

  return (
    <div className="mb-7">
      <div className="flex items-center gap-2 mb-3 pb-1.5 border-b border-ft-border text-[10px] tracking-[3px] uppercase text-ft-red">
        <span className="w-1 h-1 bg-ft-red inline-block animate-pulse-dot" />
        Breaking &middot; Biggest Movers
      </div>
      <div className="grid grid-cols-[1.4fr_1fr] gap-4 max-md:grid-cols-1">
        <MarketCard
          market={hero.primary}
          variant="hero"
          animationDelay={0.05}
        />
        <div className="flex flex-col gap-4">
          {hero.secondary.map((m, i) => (
            <MarketCard
              key={m.id}
              market={m}
              variant="medium"
              animationDelay={0.1 + i * 0.05}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
