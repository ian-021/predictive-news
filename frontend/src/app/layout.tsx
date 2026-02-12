import type { Metadata } from "next";
import { QueryProvider } from "@/providers/QueryProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Follow The Signal — Prediction Market News Feed",
  description:
    "See what's likely to happen based on real-money predictions from thousands of traders. Politics, crypto, sports, tech — powered by Polymarket data.",
  keywords: [
    "prediction markets",
    "polymarket",
    "predictions",
    "probability",
    "politics",
    "crypto",
    "sports",
    "tech",
  ],
  openGraph: {
    title: "Follow The Signal — Prediction Market News Feed",
    description:
      "See what's likely to happen based on real-money predictions from Polymarket.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
