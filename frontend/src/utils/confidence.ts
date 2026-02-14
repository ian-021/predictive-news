import type { ConfidenceLevel } from "@/types/feed";

export function getConfidenceLevel(probability: number): ConfidenceLevel {
  if (probability >= 99) return { label: "Certain", class: "likely" };
  if (probability >= 90) return { label: "Very Likely", class: "likely" };
  if (probability >= 75) return { label: "Likely", class: "likely" };
  if (probability >= 40) return { label: "Uncertain", class: "uncertain" };
  if (probability >= 15) return { label: "Unlikely", class: "unlikely" };
  return { label: "Very Unlikely", class: "unlikely" };
}
