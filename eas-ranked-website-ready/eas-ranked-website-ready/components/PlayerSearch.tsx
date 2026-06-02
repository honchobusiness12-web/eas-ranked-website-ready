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
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "rgba(0,207,255,0.6)" }}>🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl py-2.5 pl-9 pr-8 text-sm outline-none transition-all duration-200 player-search-input"
          style={{
            background: "rgba(5,35,55,0.85)",
            border: "1px solid rgba(0,207,255,0.25)",
            color: "#e2f4ff",
            caretColor: "#00CFFF",
          }}
          onFocus={(e) => {
            e.currentTarget.style.border = "1px solid rgba(0,207,255,0.55)";
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,207,255,0.10)";
            if (results.length > 0) setOpen(true);
          }}
          onBlur={(e) => {
            e.currentTarget.style.border = "1px solid rgba(0,207,255,0.25)";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setOpen(false); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs transition-colors"
            style={{ color: "rgba(168,255,246,0.45)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#e2f4ff")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(168,255,246,0.45)")}
          >
            ✕
          </button>
        )}
      </div>

      {open && (
        <div
          className="absolute left-0 right-0 top-full mt-2 rounded-xl overflow-y-auto animate-scale-in"
          style={{
            zIndex: 9999,
            background: "rgba(5,35,55,0.96)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(0,207,255,0.25)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 0 16px rgba(0,207,255,0.12)",
            maxHeight: "280px",
          }}
        >
          {results.map((player) => (
            <button
              key={player.user_id}
              onClick={() => handleSelect(player)}
              className="group flex w-full items-center gap-3 px-3 py-2.5 text-left transition-all duration-200"
              style={{ borderBottom: "1px solid rgba(0,207,255,0.08)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,207,255,0.12)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <PlayerAvatar name={player.name} avatar={player.avatar_url} size="h-8 w-8" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate transition-colors" style={{ color: "#e2f4ff" }}>{player.name}</p>
                <p className="text-xs truncate" style={{ color: "rgba(168,255,246,0.70)" }}>{player.username || "—"}</p>
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
