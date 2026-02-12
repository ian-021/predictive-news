"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "polynews:onboarding_dismissed";

const EXAMPLE_CARDS = [
  {
    question: "Will the incumbent party win the next presidential election?",
    probability: 0.42,
    category: "Politics",
  },
  {
    question: "Will Bitcoin exceed $100K by end of year?",
    probability: 0.68,
    category: "Crypto",
  },
  {
    question: "Will the underdog win the championship finals?",
    probability: 0.24,
    category: "Sports",
  },
];

export function OnboardingOverlay() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (!dismissed) {
        setShow(true);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // fallback: use sessionStorage
      try {
        sessionStorage.setItem(STORAGE_KEY, "true");
      } catch {
        // ignore
      }
    }
  };

  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(8px)",
        padding: "var(--space-md)",
      }}
    >
      <div
        style={{
          backgroundColor: "var(--bg-secondary)",
          borderRadius: "var(--radius-lg)",
          maxWidth: 520,
          width: "100%",
          padding: "var(--space-xl)",
          border: "1px solid var(--border-primary)",
          animation: "fadeIn 0.4s ease",
        }}
      >
        {/* Logo / title */}
        <div style={{ textAlign: "center", marginBottom: "var(--space-xl)" }}>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              marginBottom: "var(--space-sm)",
            }}
          >
            <span style={{ color: "var(--accent-green)" }}>Poly</span>News
          </h1>
          <p
            style={{
              fontSize: "0.95rem",
              color: "var(--text-secondary)",
              lineHeight: 1.5,
              maxWidth: 400,
              margin: "0 auto",
            }}
          >
            See what&apos;s likely to happen based on real-money predictions
            from thousands of traders.
          </p>
        </div>

        {/* Example cards */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-sm)",
            marginBottom: "var(--space-xl)",
          }}
        >
          {EXAMPLE_CARDS.map((card) => (
            <div
              key={card.question}
              style={{
                backgroundColor: "var(--bg-card)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-md)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "var(--space-md)",
              }}
            >
              <div style={{ flex: 1 }}>
                <span
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--text-muted)",
                  }}
                >
                  {card.category}
                </span>
                <p
                  style={{
                    fontSize: "0.85rem",
                    marginTop: 2,
                    color: "var(--text-primary)",
                    lineHeight: 1.4,
                  }}
                >
                  {card.question}
                </p>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  fontSize: "1.1rem",
                  color:
                    card.probability < 0.3
                      ? "var(--accent-red)"
                      : card.probability > 0.7
                      ? "var(--accent-green)"
                      : "var(--accent-yellow)",
                  minWidth: 52,
                  textAlign: "right",
                }}
              >
                {Math.round(card.probability * 100)}%
              </div>
            </div>
          ))}
        </div>

        <p
          style={{
            fontSize: "0.8rem",
            color: "var(--text-muted)",
            textAlign: "center",
            marginBottom: "var(--space-lg)",
            lineHeight: 1.5,
          }}
        >
          Probabilities come from Polymarket, where people bet real money on
          outcomes. Higher percentages mean the crowd thinks it&apos;s more likely
          to happen.
        </p>

        <button
          onClick={dismiss}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "var(--radius-md)",
            fontSize: "0.95rem",
            fontWeight: 600,
            backgroundColor: "var(--accent-green)",
            color: "#000",
            transition: "opacity var(--transition-fast)",
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.opacity = "0.9";
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.opacity = "1";
          }}
        >
          Explore Predictions
        </button>
      </div>
    </div>
  );
}
