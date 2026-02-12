/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: "#0A0A0A",
          panel: "#111111",
          line: "#1E3322",
          green: "#00FF41",
          amber: "#FFB000",
          red: "#FF3333",
        },
      },
      boxShadow: {
        glow: "0 0 8px rgba(0, 255, 65, 0.35)",
      },
      animation: {
        flicker: "flicker 5s linear infinite",
        cursor: "cursor-blink 1.1s steps(1, end) infinite",
        pulseSoft: "pulse-soft 1.8s ease-in-out infinite",
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
      },
    },
  },
  plugins: [],
};
