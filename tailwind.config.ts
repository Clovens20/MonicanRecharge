import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: { center: true, padding: "1rem" },
    extend: {
      colors: {
        landing: {
          ink: "#0A0E1A",
          mid: "#0D1B2A",
          purple: "#1A1035",
          accent: "#00D084",
          violet: "#7C3AED",
          muted: "#94A3B8",
          soft: "#F1F5F9",
        },
        brand: {
          ink: "#111827",
          green: "#10B981",
          gold: "#F59E0B",
          bg: "#F9FAFB",
          surface: "#FFFFFF",
        },
        border: "rgba(17, 24, 39, 0.1)",
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#EF4444",
      },
      fontFamily: {
        display: ["var(--font-jakarta)", "ui-sans-serif", "system-ui"],
        body: ["var(--font-inter)", "ui-sans-serif", "system-ui"],
        landing: ["var(--font-inter)", "ui-sans-serif", "system-ui"],
        "landing-display": ["var(--font-jakarta)", "ui-sans-serif", "system-ui"],
        "landing-stat": ["var(--font-space)", "ui-sans-serif", "system-ui"],
      },
      letterSpacing: {
        ultra: "0.2em",
      },
      backgroundImage: {
        "hero-radial":
          "radial-gradient(1200px 600px at 80% -10%, rgba(16,185,129,0.35), transparent 60%), radial-gradient(900px 500px at 0% 0%, rgba(245,158,11,0.18), transparent 70%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "landing-float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
        "landing-blob": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(24px, -18px) scale(1.06)" },
          "66%": { transform: "translate(-16px, 12px) scale(0.96)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out forwards",
        shimmer: "shimmer 2.4s linear infinite",
        "landing-float": "landing-float 3.2s ease-in-out infinite",
        "landing-blob": "landing-blob 18s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
