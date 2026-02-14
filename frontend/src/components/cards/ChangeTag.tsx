"use client";

interface ChangeTagProps {
  change: number | null; // signed percentage points
}

export default function ChangeTag({ change }: ChangeTagProps) {
  if (change === null || change === 0) return null;

  const isUp = change > 0;
  const absChange = Math.abs(Math.round(change));
  const isHot = absChange >= 20;

  let colorClasses: string;
  if (isHot) {
    colorClasses =
      "text-ft-amber border-ft-amber-dim bg-[rgba(255,176,0,0.05)]";
  } else if (isUp) {
    colorClasses =
      "text-ft-green-bright border-ft-green-dim bg-[rgba(0,255,65,0.05)]";
  } else {
    colorClasses =
      "text-ft-red border-ft-red-dim bg-[rgba(255,51,51,0.05)]";
  }

  const arrow = isUp ? "\u25B2" : "\u25BC";
  const sign = isUp ? "+" : "-";

  return (
    <span
      className={`text-[11px] font-semibold px-2 py-0.5 border ${colorClasses}`}
    >
      {arrow} {sign}
      {absChange}% 24H
    </span>
  );
}
