"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { searchPlayers } from "@/lib/admin/actions";
import type { PlayerSearchResult } from "@/lib/admin/actions";
import LoadingSpinner from "@/components/admin/LoadingSpinner";

interface PlayerSearchProps {
  onSelect: (player: PlayerSearchResult) => void;
  selectedPlayerId?: string | null;
}

/**
 * Search input with a live results dropdown.
 * Calls the searchPlayers server action on each keystroke (debounced 300ms).
 * Clicking a result fires onSelect with the full player object.
 */
export default function PlayerSearch({
  onSelect,
  selectedPlayerId,
}: PlayerSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await searchPlayers(q);
      if (result.success && result.data) {
        setResults(result.data);
        setOpen(true);
      } else {
        setError(result.error ?? "Search failed");
        setResults([]);
      }
    } catch {
      setError("An unexpected error occurred");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  }

  function handleSelect(player: PlayerSearchResult) {
    setQuery(player.name);
    setOpen(false);
    onSelect(player);
  }

  function handleClear() {
    setQuery("");
    setResults([]);
    setOpen(false);
    setError(null);
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input */}
      <div className="relative flex items-center">
        <span className="absolute left-4 text-lg text-cyan-400 pointer-events-none select-none">
          🔍
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search by player name or Discord ID…"
          className="w-full rounded-2xl border-2 border-cyan-700/40 bg-zinc-900 px-4 py-3.5 pl-11 pr-10 text-base font-bold text-white placeholder-zinc-500 focus:border-cyan-400 focus:outline-none focus:shadow-[0_0_20px_rgba(0,212,255,0.20)] transition-all"
          autoComplete="off"
          spellCheck={false}
        />
        <div className="absolute right-4">
          {loading ? (
            <LoadingSpinner size="sm" />
          ) : query ? (
            <button
              onClick={handleClear}
              className="text-zinc-400 hover:text-white transition font-black text-base"
              aria-label="Clear search"
            >
              ✕
            </button>
          ) : null}
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="mt-2 text-xs font-bold text-red-400 pl-1">{error}</p>
      )}

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl border-2 border-white/15 bg-zinc-900 shadow-[0_8px_40px_rgba(0,0,0,0.70)] overflow-hidden max-h-80 overflow-y-auto">
          {results.map((player) => {
            const isSelected = player.user_id === selectedPlayerId;
            return (
              <button
                key={player.user_id}
                onClick={() => handleSelect(player)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left border-b border-white/5 last:border-0 transition-all hover:bg-white/[0.04] active:scale-[0.99] ${
                  isSelected ? "bg-cyan-950/30" : ""
                }`}
              >
                {/* Avatar initials */}
                <div
                  className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-black text-xs text-black select-none"
                  style={{
                    background: "linear-gradient(135deg, #00FF88, #00D4FF)",
                  }}
                >
                  {player.name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2) || "??"}
                </div>

                {/* Name + ID */}
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm text-white truncate">
                    {player.name}
                  </p>
                  <p className="text-[10px] font-mono text-zinc-500 truncate">
                    {player.user_id}
                  </p>
                </div>

                {/* CR */}
                <div className="flex-shrink-0 text-right">
                  <p className="text-xs font-black text-cyan-300">
                    {player.cr} CR
                  </p>
                  {player.premium && (
                    <p className="text-[10px] text-yellow-400 font-bold">⭐</p>
                  )}
                </div>

                {isSelected && (
                  <span className="flex-shrink-0 text-cyan-400 text-sm">✓</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {open && !loading && results.length === 0 && query.trim() && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl border-2 border-white/10 bg-zinc-900 shadow-xl px-5 py-6 text-center">
          <p className="text-sm font-bold text-zinc-500">
            No players found for &quot;{query}&quot;
          </p>
        </div>
      )}
    </div>
  );
}
