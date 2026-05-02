"use client";

import { useState, useEffect, useRef } from "react";
import PlayerAvatar from "@/components/PlayerAvatar";
import RankBadge from "@/components/RankBadge";
import { useTheme } from "@/components/ThemeProvider";

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
  const { theme } = useTheme();
  const isLight = theme === "light";

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
    <div ref={containerRef} className="relative w-full max-w-sm">
      <div className="relative">
        <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${isLight ? "text-[#7070a0]" : "text-zinc-500"}`}>🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className={`w-full rounded-xl border py-2.5 pl-9 pr-4 text-sm outline-none transition ${
            isLight
              ? "border-black/15 bg-white text-[#0f0f1a] placeholder-[#7070a0] shadow-sm focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20"
              : "border-white/10 bg-white/5 text-white placeholder-zinc-500 focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
          }`}
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setOpen(false); }}
            className={`absolute right-3 top-1/2 -translate-y-1/2 transition ${
              isLight ? "text-[#7070a0] hover:text-[#0f0f1a]" : "text-zinc-500 hover:text-white"
            }`}
          >
            ✕
          </button>
        )}
      </div>

      {open && (
        <div className={`absolute left-0 right-0 top-full z-30 mt-1 rounded-xl border overflow-hidden shadow-xl ${
          isLight
            ? "border-black/10 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
            : "border-white/10 bg-[#0d0d14] shadow-2xl"
        }`}>
          {results.map((player) => (
            <button
              key={player.user_id}
              onClick={() => handleSelect(player)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition border-b last:border-0 ${
                isLight
                  ? "border-black/6 hover:bg-purple-50 text-[#0f0f1a]"
                  : "border-white/5 hover:bg-white/5"
              }`}
            >
              <PlayerAvatar name={player.name} avatar={player.avatar_url} size="h-8 w-8" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{player.name}</p>
                <p className={`text-xs truncate ${isLight ? "text-[#7070a0]" : "text-zinc-500"}`}>{player.username || "No username"}</p>
              </div>
              <RankBadge cr={Number(player.cr || 0)} size="sm" showLabel={false} />
              <span className="text-sm font-black text-purple-600">{player.cr}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
