"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { searchPlayers, type PlayerResult } from "@/app/admin/actions";

interface PlayerSearchProps {
  onSelect: (player: PlayerResult) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function PlayerSearch({
  onSelect,
  placeholder = "Search by player name or Discord ID…",
  disabled = false,
}: PlayerSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const { players } = await searchPlayers(trimmed);
      setResults(players);
      setOpen(players.length > 0);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleInput(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => runSearch(value), 300);
  }

  function handleSelect(player: PlayerResult) {
    setQuery(player.name);
    setResults([]);
    setOpen(false);
    onSelect(player);
  }

  function handleClear() {
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative flex items-center">
        <span className="absolute left-4 text-zinc-500 pointer-events-none select-none">🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-10 text-sm text-white placeholder-zinc-600 focus:border-cyan-600/50 focus:outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {loading && (
          <span className="absolute right-4 text-xs text-zinc-500 animate-pulse">…</span>
        )}
        {!loading && query && (
          <button
            onClick={handleClear}
            className="absolute right-4 text-zinc-500 hover:text-zinc-300 text-xs transition"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-[#0d0d14] shadow-2xl">
          {results.map((player) => (
            <button
              key={player.user_id}
              onMouseDown={() => handleSelect(player)}
              className="flex w-full items-center gap-3 border-b border-white/5 px-4 py-3 text-left transition last:border-0 hover:bg-white/[0.07]"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-black text-zinc-400">
                {player.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{player.name}</p>
                <p className="truncate font-mono text-[10px] text-zinc-500">{player.user_id}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs font-black text-orange-400">{player.cr.toLocaleString()} CR</p>
                {player.premium_expires_at && new Date(player.premium_expires_at) > new Date() ? (
                  <span className="text-[10px] font-black text-yellow-400">⭐ PREMIUM</span>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      )}

      {open && results.length === 0 && query.trim() && !loading && (
        <div className="absolute z-40 mt-2 w-full rounded-xl border border-white/10 bg-[#0d0d14] px-4 py-3 text-sm text-zinc-500 shadow-2xl">
          No players found for &quot;{query}&quot;
        </div>
      )}
    </div>
  );
}
