"use client";

import { useRef, useEffect } from "react";
import type { PlayerRow } from "../_actions";

interface Props {
  query: string;
  results: PlayerRow[];
  isSearching: boolean;
  isOpen: boolean;
  selectedId?: string | null;
  onQueryChange: (q: string) => void;
  onSelect: (player: PlayerRow) => void;
  onClose: () => void;
  onClear: () => void;
}

export function PlayerSearch({
  query,
  results,
  isSearching,
  isOpen,
  selectedId,
  onQueryChange,
  onSelect,
  onClose,
  onClear,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative flex items-center">
        <span className="absolute left-4 text-zinc-500 pointer-events-none">
          🔍
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search by name or Discord ID…"
          className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-10 text-sm text-white placeholder-zinc-600 focus:border-red-600/50 focus:outline-none transition"
        />
        {isSearching && (
          <span className="absolute right-4 animate-pulse text-xs text-zinc-500">
            …
          </span>
        )}
        {!isSearching && query && (
          <button
            onClick={onClear}
            className="absolute right-4 text-zinc-500 hover:text-zinc-300 text-xs transition"
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-[#0d0d14] shadow-2xl">
          {results.map((player) => (
            <button
              key={player.user_id}
              onMouseDown={() => onSelect(player)}
              className={`flex w-full items-center gap-3 border-b border-white/5 px-4 py-3 text-left transition last:border-0 hover:bg-white/[0.07] ${
                selectedId === player.user_id ? "bg-white/[0.05]" : ""
              }`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-base">
                👤
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">
                  {player.name}
                </p>
                <p className="truncate font-mono text-[10px] text-zinc-500">
                  {player.user_id}
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <span className="text-xs font-black text-orange-400">
                  {player.cr.toLocaleString()} CR
                </span>
                {player.blacklisted && (
                  <span className="rounded-md border border-red-700/40 bg-red-950/40 px-1.5 py-0.5 text-[10px] font-black text-red-400">
                    BANNED
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && results.length === 0 && query.trim() && !isSearching && (
        <div className="absolute z-40 mt-2 w-full rounded-xl border border-white/10 bg-[#0d0d14] px-4 py-3 text-sm text-zinc-500 shadow-2xl">
          No players found for &quot;{query}&quot;
        </div>
      )}
    </div>
  );
}
