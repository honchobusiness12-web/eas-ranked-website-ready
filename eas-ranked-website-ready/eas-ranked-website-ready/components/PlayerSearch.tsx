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
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-sm">🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="w-full rounded-xl py-2.5 pl-9 pr-8 text-sm outline-none transition-all duration-200 backdrop-blur-sm"
          style={{ background: "rgba(6,43,69,0.75)", border: "1px solid rgba(0,207,255,0.22)", color: "#e0f7ff" }}
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setOpen(false); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 transition-colors hover:text-zinc-300 text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 rounded-xl overflow-hidden animate-scale-in" style={{ background: "rgba(4,30,48,0.97)", border: "1px solid rgba(0,207,255,0.22)", backdropFilter: "blur(20px)", boxShadow: "0 16px 48px rgba(0,0,0,0.40)" }}>
          {results.map((player) => (
            <button
              key={player.user_id}
              onClick={() => handleSelect(player)}
              className="group flex w-full items-center gap-3 px-3 py-2.5 text-left transition-all duration-200"
              style={{ borderBottom: "1px solid rgba(0,207,255,0.08)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,207,255,0.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <PlayerAvatar name={player.name} avatar={player.avatar_url} size="h-8 w-8" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate transition-colors" style={{ color: "#e0f7ff" }}>{player.name}</p>
                <p className="text-xs truncate" style={{ color: "rgba(168,255,246,0.50)" }}>{player.username || "—"}</p>
              </div>
              <RankBadge cr={Number(player.cr || 0)} size="sm" showLabel={false} />
              <span className="text-xs font-black" style={{ color: "#00CFFF" }}>{Number(player.cr).toLocaleString()}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
