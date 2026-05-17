import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          coral:   "#FF6B6B",
          orange:  "#FF9F43",
          yellow:  "#FFD93D",
          teal:    "#00D4FF",
          blue:    "#0099FF",
          lime:    "#00FF88",
          bg:      "#05050b",
          surface: "#0d0d14",
          nav:     "#07070f",
        },
      },
      spacing: {
        "4.5": "1.125rem",
        "13":  "3.25rem",
        "15":  "3.75rem",
        "18":  "4.5rem",
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "1rem" }],
      },
      lineHeight: {
        tight:  "1.2",
        snug:   "1.35",
        normal: "1.5",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.25rem",
      },
      transitionDuration: {
        "150": "150ms",
        "250": "250ms",
      },
      animation: {
        "slide-in":      "slide-in 0.25s ease-out both",
        "fade-in":       "fade-in 0.3s ease-out both",
        "sun-pulse":     "sun-pulse 4s ease-in-out infinite",
        "wave":          "wave 3s ease-in-out infinite",
        "premium-glow":  "premium-glow 2.5s ease-in-out infinite",
        "shimmer":       "shimmer 1.6s infinite linear",
      },
      keyframes: {
        "slide-in": {
          from: { opacity: "0", transform: "translateX(16px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "sun-pulse": {
          "0%, 100%": { opacity: "0.28", transform: "scale(1) rotate(0deg)" },
          "50%":      { opacity: "0.38", transform: "scale(1.06) rotate(8deg)" },
        },
        "wave": {
          "0%":   { transform: "translateX(0) scaleY(1)" },
          "50%":  { transform: "translateX(-12px) scaleY(1.04)" },
          "100%": { transform: "translateX(0) scaleY(1)" },
        },
        "premium-glow": {
          "0%, 100%": { boxShadow: "0 0 8px rgba(255,215,0,0.3), 0 0 20px rgba(255,159,67,0.15)" },
          "50%":      { boxShadow: "0 0 16px rgba(255,215,0,0.5), 0 0 40px rgba(255,159,67,0.25)" },
        },
        "shimmer": {
          "0%":   { backgroundPosition: "-800px 0" },
          "100%": { backgroundPosition: "800px 0" },
        },
      },
      boxShadow: {
        "glow-orange": "0 0 20px rgba(255,159,67,0.25)",
        "glow-teal":   "0 0 20px rgba(0,212,255,0.25)",
        "card":        "0 2px 8px rgba(0,0,0,0.4)",
      },
      screens: {
        xs: "375px",
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1440px",
      },
    },
  },
  plugins: [],
};
export default config;

