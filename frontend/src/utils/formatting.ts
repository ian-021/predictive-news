export function formatProbability(price: number): number {
  return Math.round(price * 100);
}

export function formatChange(change: number | null): string {
  if (change === null || change === 0) return "0%";
  const sign = change > 0 ? "+" : "";
  return `${sign}${Math.round(change)}%`;
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const months = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

export function formatVolume(volume: number): string {
  if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `$${(volume / 1_000).toFixed(0)}K`;
  return `$${volume.toFixed(0)}`;
}
