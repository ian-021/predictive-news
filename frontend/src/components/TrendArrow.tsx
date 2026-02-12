"use client";

interface TrendArrowProps {
  delta: number | null;
  threshold?: number;
  showValue?: boolean;
}

export function TrendArrow({
  delta,
  threshold = 0.05,
  showValue = true,
}: TrendArrowProps) {
  if (delta === null || delta === undefined || Math.abs(delta) < 0.001) {
    return null;
  }

  // Only show if delta exceeds threshold
  const absDelta = Math.abs(delta);
  if (absDelta < threshold) return null;

  const isUp = delta > 0;
  const color = isUp ? "var(--accent-green)" : "var(--accent-red)";
  const arrow = isUp ? "\u2191" : "\u2193";
  const percentChange = Math.round(absDelta * 100);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        fontSize: "0.75rem",
        fontWeight: 600,
        fontFamily: "var(--font-mono)",
        color,
        padding: "2px 6px",
        borderRadius: "var(--radius-sm)",
        backgroundColor: isUp ? "var(--accent-green-bg)" : "var(--accent-red-bg)",
      }}
    >
      {arrow}
      {showValue && `${percentChange}%`}
    </span>
  );
}
