"use client";

import { useState, useEffect, useRef } from "react";
import PlayerAvatar from "@/components/PlayerAvatar";
import RankBadge from "@/components/RankBadge";

interface Player {
  user_id: string;
  name: string;
  username?: string | null;
  avatar_url?: string | null;
  cr: number;
  wins: number;
  losses: number;
  kills: number;
  matches: number;
  mvp_count: number;
  ranked: boolean;
}

interface PlayerSearchProps {
  players: Player[];
  onSelect?: (player: Player) => void;
  placeholder?: string;
  /** If true, navigates to /profile/[userId] on select */
  navigateOnSelect?: boolean;
}

export default function PlayerSearch({
  players,
  onSelect,
  placeholder = "Search players…",
  navigateOnSelect = false,
}: PlayerSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Player[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (!query.trim()) {
        setResults([]);
        setOpen(false);
        return;
      }
      const q = query.toLowerCase();
      const filtered = players
        .filter(
          (p) =>
            p.name?.toLowerCase().includes(q) ||
            p.username?.toLowerCase().includes(q)
        )
        .slice(0, 8);
      setResults(filtered);
      setOpen(filtered.length > 0);
    }, 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, players]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(player: Player) {
    setQuery(player.name);
    setOpen(false);
    if (onSelect) onSelect(player);
    if (navigateOnSelect) {
      window.location.href = `/profile/${player.user_id}`;
    }
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-xs">
      <div className="relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-8 pr-8 text-sm text-white placeholder-zinc-600 outline-none focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/30 transition-colors"
          aria-label="Search players"
          aria-autocomplete="list"
          aria-expanded={open}
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setOpen(false); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white transition-colors text-xs"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {open && (
        <div
          className="absolute left-0 right-0 top-full z-30 mt-1 rounded-xl border border-white/[0.08] bg-[#0d0d14] shadow-2xl overflow-hidden"
          role="listbox"
        >
          {results.map((player) => (
            <button
              key={player.user_id}
              onClick={() => handleSelect(player)}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-white/[0.05] transition-colors border-b border-white/[0.04] last:border-0"
              role="option"
            >
              <PlayerAvatar name={player.name} avatar={player.avatar_url} size="h-7 w-7" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-xs truncate leading-tight">{player.name}</p>
                <p className="text-[10px] text-zinc-600 truncate">{player.username || "—"}</p>
              </div>
              <RankBadge cr={Number(player.cr || 0)} size="sm" showLabel={false} />
              <span className="text-xs font-black text-orange-400">{player.cr}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
