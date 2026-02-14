"use client";

import { useEffect } from "react";

export default function FeedLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Override body styles that the old terminal layout needs but the editorial feed doesn't
    document.body.style.overflow = "auto";
    document.body.style.textTransform = "none";

    return () => {
      document.body.style.overflow = "";
      document.body.style.textTransform = "";
    };
  }, []);

  return <>{children}</>;
}
