"use client";

import { useTheme } from "@/components/ThemeProvider";
import { useSounds } from "@/components/SoundProvider";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const { click } = useSounds();

  function handleClick() {
    click();
    toggle();
  }

  const isLight = theme === "light";

  return (
    <button
      onClick={handleClick}
      title={isLight ? "Switch to dark mode" : "Switch to light mode"}
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
      className={`flex h-9 w-9 items-center justify-center rounded-xl border text-lg transition ${
        isLight
          ? "border-black/12 bg-black/5 text-[#0f0f1a] hover:border-purple-600 hover:bg-purple-100"
          : "border-white/10 bg-white/5 hover:border-purple-600 hover:bg-purple-950/40"
      }`}
    >
      {isLight ? "🌙" : "☀️"}
    </button>
  );
}
