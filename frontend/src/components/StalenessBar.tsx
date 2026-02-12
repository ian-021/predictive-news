"use client";

import { useHealth } from "@/hooks/useMarkets";

export function StalenessBar() {
  const { data: health } = useHealth();

  if (!health) return null;

  const isStale =
    health.staleness_minutes !== null && health.staleness_minutes > 30;

  if (!isStale) return null;

  const lastIngestion = health.last_ingestion
    ? new Date(health.last_ingestion).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "unknown";

  return (
    <div
      style={{
        backgroundColor: "var(--accent-yellow-bg)",
        borderBottom: "1px solid var(--accent-yellow)",
        padding: "var(--space-sm) var(--space-md)",
        textAlign: "center",
        fontSize: "0.8rem",
        color: "var(--accent-yellow)",
      }}
    >
      We&apos;re having trouble updating. Showing latest available data from{" "}
      {lastIngestion}.
    </div>
  );
}
