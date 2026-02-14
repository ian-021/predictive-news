"use client";

import { getConfidenceLevel } from "@/utils/confidence";
import type { ConfidenceClass } from "@/types/feed";

const classStyles: Record<ConfidenceClass, string> = {
  likely:
    "text-ft-green-bright border-ft-green-dim bg-[rgba(0,255,65,0.05)]",
  uncertain:
    "text-ft-amber border-ft-amber-dim bg-[rgba(255,176,0,0.05)]",
  unlikely:
    "text-ft-red border-ft-red-dim bg-[rgba(255,51,51,0.05)]",
};

interface ConfidenceBadgeProps {
  probability: number; // 0-100
}

export default function ConfidenceBadge({ probability }: ConfidenceBadgeProps) {
  const { label, class: cls } = getConfidenceLevel(probability);

  return (
    <span
      className={`inline-block text-[9px] tracking-wider uppercase px-1.5 py-0.5 font-semibold border ${classStyles[cls]}`}
    >
      {label}
    </span>
  );
}
