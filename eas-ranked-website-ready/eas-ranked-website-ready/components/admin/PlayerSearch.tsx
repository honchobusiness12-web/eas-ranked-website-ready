"use client";

import { useRef, useEffect } from "react";
import { LoadingSpinner } from "@/components/admin/LoadingSpinner";

// ---------------------------------------------------------------------------
// PlayerSearch — debounced search input
// ---------------------------------------------------------------------------

interface PlayerSearchProps {
  value: string;
  onChange: (query: string) => void;
  loading?: boolean;
  placeholder?: string;
  /** Debounce delay in ms. Defaults to 300. */
  debounceMs?: number;
}

export function PlayerSearch({
  value,
  onChange,
  loading = false,
  placeholder = "Search by name or Discord ID…",
  debounceMs = 300,
}: PlayerSearchProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(q), debounceMs);
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
        🔍
      </div>
      <input
        type="text"
        defaultValue={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full rounded-2xl border-2 border-white/10 bg-zinc-900/60 pl-10 pr-12 py-3.5 text-sm font-bold text-white placeholder-zinc-600 focus:border-cyan-500/60 focus:outline-none focus:ring-0 transition"
        aria-label="Search players"
      />
      {loading && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <LoadingSpinner size="sm" label="" />
        </div>
      )}
    </div>
  );
}
