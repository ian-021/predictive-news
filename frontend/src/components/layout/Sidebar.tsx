"use client";

import MoversPanel from "@/components/sidebar/MoversPanel";
import ResolvedPanel from "@/components/sidebar/ResolvedPanel";
import SystemStatus from "@/components/sidebar/SystemStatus";
import type { EditorialMarket, FeedMeta } from "@/types/feed";

interface SidebarProps {
  movers: EditorialMarket[];
  resolved: EditorialMarket[];
  meta: FeedMeta | null;
}

export default function Sidebar({ movers, resolved, meta }: SidebarProps) {
  return (
    <aside className="w-[300px] sticky top-[70px] self-start max-lg:w-full max-lg:static">
      <MoversPanel markets={movers} />
      <ResolvedPanel markets={resolved} />
      <SystemStatus meta={meta} />
    </aside>
  );
}
