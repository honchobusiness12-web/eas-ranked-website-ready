import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          0: "#05050b",
          1: "#08080f",
          2: "#0d0d18",
          3: "#111120",
        },
        brand: {
          coral:  "#FF6B6B",
          orange: "#FF9F43",
          yellow: "#FFD93D",
          teal:   "#00D4FF",
          blue:   "#0099FF",
          lime:   "#00FF88",
        },
      },
      spacing: {
        "4.5": "1.125rem",
        "13": "3.25rem",
        "15": "3.75rem",
        "18": "4.5rem",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      fontSize: {
        "2xs": ["0.65rem", { lineHeight: "1rem" }],
      },
      maxWidth: {
        "8xl": "88rem",
        "9xl": "96rem",
      },
      transitionDuration: {
        "150": "150ms",
      },
      animation: {
        "fade-in": "fade-in 0.35s ease-out both",
        "slide-in": "slide-in 0.25s ease-out both",
        "sun-pulse": "sun-pulse 4s ease-in-out infinite",
        "wave": "wave 3s ease-in-out infinite",
        "premium-glow": "premium-glow 2.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
