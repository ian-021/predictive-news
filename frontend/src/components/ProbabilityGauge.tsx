"use client";

import { useMemo } from "react";

interface ProbabilityGaugeProps {
  probability: number; // 0 to 1
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function ProbabilityGauge({
  probability,
  size = "md",
  showLabel = true,
}: ProbabilityGaugeProps) {
  const percentage = Math.round(probability * 100);

  const color = useMemo(() => {
    if (probability < 0.3) return "var(--accent-red)";
    if (probability > 0.7) return "var(--accent-green)";
    return "var(--accent-yellow)";
  }, [probability]);

  const bgColor = useMemo(() => {
    if (probability < 0.3) return "var(--accent-red-bg)";
    if (probability > 0.7) return "var(--accent-green-bg)";
    return "var(--accent-yellow-bg)";
  }, [probability]);

  const heights = { sm: 4, md: 6, lg: 8 };
  const fontSizes = { sm: "0.75rem", md: "0.875rem", lg: "1rem" };
  const height = heights[size];

  return (
    <div style={{ width: "100%" }}>
      {showLabel && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 4,
          }}
        >
          <span
            style={{
              fontSize: size === "lg" ? "1.75rem" : fontSizes[size],
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
              color,
            }}
          >
            {percentage}%
          </span>
          <span
            style={{
              fontSize: "0.7rem",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Yes
          </span>
        </div>
      )}
      <div
        style={{
          width: "100%",
          height,
          backgroundColor: "var(--gauge-track)",
          borderRadius: "var(--radius-full)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: "100%",
            backgroundColor: color,
            borderRadius: "var(--radius-full)",
            transition: "width var(--transition-normal)",
          }}
        />
      </div>
    </div>
  );
}
