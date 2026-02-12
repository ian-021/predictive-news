"use client";

import { useState } from "react";

interface HeaderProps {
  activeTab: "feed" | "bookmarks";
  onTabChange: (tab: "feed" | "bookmarks") => void;
  onHelpClick: () => void;
}

export function Header({ activeTab, onTabChange, onHelpClick }: HeaderProps) {
  return (
    <header
      style={{
        borderBottom: "1px solid var(--border-subtle)",
        backgroundColor: "var(--bg-primary)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        className="container"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          height: 56,
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
          <h1
            style={{
              fontSize: "1.15rem",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            <span style={{ color: "var(--accent-green)" }}>Poly</span>
            <span style={{ color: "var(--text-primary)" }}>News</span>
          </h1>
          <span
            style={{
              fontSize: "0.65rem",
              color: "var(--text-muted)",
              display: "none",
            }}
            className="header-tagline"
          >
            Live probability data from Polymarket
          </span>
        </div>

        {/* Tabs */}
        <nav style={{ display: "flex", gap: "var(--space-xs)" }}>
          <TabButton
            label="Feed"
            isActive={activeTab === "feed"}
            onClick={() => onTabChange("feed")}
          />
          <TabButton
            label="My Questions"
            isActive={activeTab === "bookmarks"}
            onClick={() => onTabChange("bookmarks")}
          />
          <button
            onClick={onHelpClick}
            title="What is FTM?"
            aria-label="Help"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: "var(--radius-full)",
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "var(--text-muted)",
              border: "1px solid var(--border-primary)",
              marginLeft: "var(--space-sm)",
            }}
          >
            ?
          </button>
        </nav>
      </div>

      {/* Tagline bar (desktop) */}
      <div
        style={{
          borderTop: "1px solid var(--border-subtle)",
          padding: "var(--space-xs) 0",
          textAlign: "center",
        }}
      >
        <span
          style={{
            fontSize: "0.7rem",
            color: "var(--text-muted)",
            letterSpacing: "0.02em",
          }}
        >
          Live probability data from Polymarket
        </span>
      </div>
    </header>
  );
}

function TabButton({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 14px",
        borderRadius: "var(--radius-sm)",
        fontSize: "0.8rem",
        fontWeight: 500,
        transition: "all var(--transition-fast)",
        backgroundColor: isActive ? "var(--bg-card)" : "transparent",
        color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
      }}
    >
      {label}
    </button>
  );
}
