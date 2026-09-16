import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          DEFAULT: "#0A0A0B",
          panel: "#111113",
          raised: "#151518",
          border: "rgba(255,255,255,0.08)",
          borderStrong: "rgba(255,255,255,0.14)",
        },
        ink: {
          DEFAULT: "#EDEDEF",
          muted: "#9A9AA2",
          faint: "#68686F",
        },
        accent: {
          DEFAULT: "#4F7CFF",
          hover: "#6B8FFF",
          muted: "rgba(79,124,255,0.14)",
        },
        good: "#3FBF7F",
        warn: "#E0A93E",
        bad: "#E5584C",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "14px",
        control: "10px",
      },
      spacing: {
        "4.5": "1.125rem",
      },
      boxShadow: {
        subtle: "0 1px 2px rgba(0,0,0,0.3)",
        panel: "0 4px 24px rgba(0,0,0,0.24)",
      },
      keyframes: {
        "fade-in": { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        "scan-pulse": {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out",
        "scan-pulse": "scan-pulse 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
