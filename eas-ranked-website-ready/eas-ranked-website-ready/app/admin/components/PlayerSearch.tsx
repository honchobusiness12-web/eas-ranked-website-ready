"use client";

/**
 * app/admin/components/PlayerSearch.tsx
 *
 * Search input with debounced results dropdown.
 * Calls searchPlayers server action and surfaces results to parent via onSelect.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { searchPlayers, type PlayerSearchResult } from "@/lib/admin/actions";

interface Props {
  onSelect: (player: PlayerSearchResult) => void;
  disabled?: boolean;
}

export default function PlayerSearch({ onSelect, disabled }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const result = await searchPlayers(q.trim(), 10, 0);
      if (result.success && result.data) {
        setResults(result.data.players);
        setOpen(true);
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 350);
  }

  function handleSelect(player: PlayerSearchResult) {
    setQuery(player.name);
    setOpen(false);
    setResults([]);
    onSelect(player);
  }

  function handleClear() {
    setQuery("");
    setResults([]);
    setOpen(false);
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
          disabled={disabled}
          className="w-full rounded-2xl border-2 border-cyan-700/40 bg-zinc-900 px-4 py-3.5 pl-11 pr-10 text-base font-bold text-white placeholder-zinc-500 focus:border-cyan-400 focus:outline-none focus:shadow-[0_0_20px_rgba(0,212,255,0.20)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {loading && (
          <span className="absolute right-4 text-cyan-400 text-sm animate-spin font-black select-none">
            ⟳
          </span>
        )}
        {!loading && query && (
          <button
            onClick={handleClear}
            className="absolute right-4 text-zinc-400 hover:text-white text-base transition font-black"
            title="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl border-2 border-white/15 bg-zinc-900 shadow-[0_8px_40px_rgba(0,0,0,0.70)] overflow-hidden">
          <p className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 border-b border-white/8">
            {results.length} result{results.length !== 1 ? "s" : ""}
          </p>
          <div className="max-h-72 overflow-y-auto divide-y divide-white/5">
            {results.map((player) => (
              <button
                key={player.user_id}
                onClick={() => handleSelect(player)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.04] transition-colors"
              >
                {/* Avatar initials */}
                <div
                  className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-black text-xs text-black select-none"
                  style={{
                    background: "linear-gradient(135deg, #00FF88, #00D4FF)",
                  }}
                >
                  {(player.name || "?")
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm text-white truncate">
                    {player.name}
                  </p>
                  <p className="text-[10px] font-mono text-zinc-500 truncate">
                    {player.user_id}
                  </p>
                </div>

                <div className="flex-shrink-0 text-right">
                  <p className="text-xs font-black text-orange-400">
                    {player.cr.toLocaleString()} CR
                  </p>
                  <p className="text-[10px] text-zinc-600 font-bold">
                    {player.wins}W / {player.losses}L
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {open && results.length === 0 && !loading && query.trim() && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl border-2 border-white/10 bg-zinc-900 shadow-[0_8px_40px_rgba(0,0,0,0.60)] px-5 py-6 text-center">
          <p className="text-zinc-500 font-bold text-sm">
            No players found for &quot;{query}&quot;
          </p>
        </div>
      )}
    </div>
  );
}
