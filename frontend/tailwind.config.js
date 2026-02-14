/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        terminal: {
          // Legacy tokens (keep for existing components)
          bg: "#0A0A0A",
          panel: "#111111",
          line: "#1E3322",
          green: "#00FF41",
          amber: "#FFB000",
          red: "#FF3333",
        },
        // Editorial redesign tokens
        ft: {
          bg: {
            deep: "#0a0e0a",
            panel: "#0d120d",
            card: "#111611",
            hover: "#161c16",
          },
          green: {
            bright: "#00ff41",
            mid: "#00cc33",
            dim: "#00802b",
            faint: "#1a3a1a",
            ghost: "#0d1f0d",
          },
          amber: {
            DEFAULT: "#ffb000",
            dim: "#cc8800",
          },
          red: {
            DEFAULT: "#ff3333",
            dim: "#cc2222",
          },
          cyan: "#00e5ff",
          text: {
            primary: "#c8e6c8",
            secondary: "#7a9a7a",
            dim: "#4a6a4a",
          },
          border: {
            DEFAULT: "#1a2e1a",
            bright: "#2a4a2a",
          },
        },
      },
      fontFamily: {
        display: ['"Space Mono"', "monospace"],
        headline: ['"JetBrains Mono"', "monospace"],
        body: ['"IBM Plex Mono"', "monospace"],
      },
      boxShadow: {
        glow: "0 0 8px rgba(0, 255, 65, 0.35)",
        "glow-green": "0 0 10px rgba(0,255,65,0.3)",
        "glow-bar": "0 0 6px rgba(0,255,65,0.3)",
      },
      animation: {
        flicker: "flicker 5s linear infinite",
        cursor: "cursor-blink 1.1s steps(1, end) infinite",
        pulseSoft: "pulse-soft 1.8s ease-in-out infinite",
        "ticker-scroll": "ticker-scroll 60s linear infinite",
        "fade-in": "fadeIn 0.5s ease forwards",
        "pulse-dot": "pulse-dot 2s infinite",
      },
      keyframes: {
        flicker: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.985" },
        },
        "cursor-blink": {
          "0%, 49%": { opacity: "1" },
          "50%, 100%": { opacity: "0" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "1" },
        },
        "ticker-scroll": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        fadeIn: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1", boxShadow: "0 0 4px #00ff41" },
          "50%": { opacity: "0.5", boxShadow: "0 0 8px #00ff41" },
        },
      },
    },
  },
  plugins: [],
};
