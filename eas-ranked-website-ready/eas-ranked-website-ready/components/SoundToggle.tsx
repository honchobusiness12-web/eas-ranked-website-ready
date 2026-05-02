"use client";

import { useSounds } from "@/components/SoundProvider";
import { useTheme } from "@/components/ThemeProvider";

export default function SoundToggle() {
  const { enabled, toggle, click } = useSounds();
  const { theme } = useTheme();
  const isLight = theme === "light";

  function handleClick() {
    click();
    toggle();
  }

  return (
    <button
      onClick={handleClick}
      title={enabled ? "Mute sounds" : "Unmute sounds"}
      aria-label={enabled ? "Mute sounds" : "Unmute sounds"}
      className={`flex h-9 w-9 items-center justify-center rounded-xl border text-lg transition ${
        isLight
          ? "border-black/12 bg-black/5 text-[#0f0f1a] hover:border-purple-600 hover:bg-purple-100"
          : "border-white/10 bg-white/5 hover:border-purple-600 hover:bg-purple-950/40"
      }`}
    >
      {enabled ? "🔊" : "🔇"}
    </button>
  );
}
