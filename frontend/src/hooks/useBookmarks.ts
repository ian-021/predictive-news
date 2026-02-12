"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "polynews:bookmarks";

function getStoredBookmarks(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function setStoredBookmarks(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // localStorage unavailable
  }
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<string[]>([]);

  useEffect(() => {
    setBookmarks(getStoredBookmarks());
  }, []);

  const toggleBookmark = useCallback((marketId: string) => {
    setBookmarks((prev) => {
      const next = prev.includes(marketId)
        ? prev.filter((id) => id !== marketId)
        : [...prev, marketId];
      setStoredBookmarks(next);
      return next;
    });
  }, []);

  const isBookmarked = useCallback(
    (marketId: string) => bookmarks.includes(marketId),
    [bookmarks]
  );

  return { bookmarks, toggleBookmark, isBookmarked };
}
