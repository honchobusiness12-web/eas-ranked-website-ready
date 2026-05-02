"use client";

import { useState, useMemo } from "react";
import { useEffect } from "react";
import Shell from "@/components/Shell";
import PlayerAvatar from "@/components/PlayerAvatar";
import SoundLink from "@/components/SoundLink";
import RankBadge from "@/components/RankBadge";
import TrendingIndicator from "@/components/TrendingIndicator";
import Pagination from "@/components/Pagination";
import PlayerSearch from "@/components/PlayerSearch";
import { SkeletonTable } from "@/components/LoadingSkeleton";

type SortKey = "cr" | "wins" | "kills" | "mvp_count" | "matches";
const ITEMS_PER_PAGE = 25;

export default function LeaderboardPage() {
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("cr");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((data) => {
        setPlayers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Filter by search
  const filtered = useMemo(() => {
    if (!searchQuery) return players;
    const q = searchQuery.toLowerCase();
    return players.filter(
      (p) => p.name?.toLowerCase().includes(q) || p.username?.toLowerCase().includes(q)
    );
  }, [players, searchQuery]);

  // Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const va = Number(a[sortKey] || 0);
      const vb = Number(b[sortKey] || 0);
      return sortDir === "desc" ? vb - va : va - vb;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
  const paginated = sorted.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(1);
  }

  function handleSearch(p: any) {
    setSearchQuery(p.name);
    setPage(1);
  }

  const sortIcon = (key: SortKey) =>
    sortKey === key ? (sortDir === "desc" ? " ↓" : " ↑") : "";

  return (
    <Shell>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black">🏆 Leaderboard</h1>
          <p className="mt-1 text-zinc-400">
            {loading ? "Loading…" : `${sorted.length} players`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
<SoundLink
            href="/leaderboard"
            soundType="click"
            className="rounded-xl bg-purple-600 px-4 py-2 font-bold hover:bg-purple-500"
            onClick={() => { setLoading(true); window.location.reload(); }}
          >
            🔄 Refresh
          </SoundLink>
        </div>
      </div>

      {/* Search + sort controls */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <PlayerSearch
          players={players}
          onSelect={handleSearch}
          placeholder="Search players…"
        />
        <div className="flex flex-wrap gap-2 ml-auto">
          {(["cr", "wins", "kills", "mvp_count", "matches"] as SortKey[]).map((key) => (
            <button
              key={key}
              onClick={() => handleSort(key)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                sortKey === key
                  ? "border-purple-600 bg-purple-600 text-white"
                  : "border-white/10 bg-white/5 text-zinc-400 hover:border-purple-700 hover:text-white"
              }`}
            >
              {key === "cr" ? "CR" : key === "mvp_count" ? "MVPs" : key.charAt(0).toUpperCase() + key.slice(1)}
              {sortIcon(key)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <SkeletonTable rows={10} />
      ) : (
        <>
          <div className="rounded-2xl border border-white/10 bg-[#0d0d14] overflow-hidden">
            {/* Column headers */}
            <div className="hidden md:grid grid-cols-[60px_1fr_160px_100px_100px_80px] items-center border-b border-white/10 px-6 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500">
              <span>#</span>
              <span>Player</span>
              <span>Rank</span>
              <button onClick={() => handleSort("cr")} className="text-left hover:text-purple-300 transition">
                CR{sortIcon("cr")}
              </button>
              <button onClick={() => handleSort("wins")} className="text-left hover:text-purple-300 transition">
                W/L{sortIcon("wins")}
              </button>
              <button onClick={() => handleSort("kills")} className="text-left hover:text-purple-300 transition">
                Kills{sortIcon("kills")}
              </button>
            </div>

            {sorted.length === 0 ? (
              <p className="p-6 text-zinc-400">No players match your search.</p>
            ) : (
              paginated.map((p: any, i: number) => {
                const globalIndex = (page - 1) * ITEMS_PER_PAGE + i;
                const matches = Number(p.matches || 0);
                const winRate = matches ? Math.round((Number(p.wins || 0) / matches) * 100) : 0;
                return (
                  <SoundLink
                    href={`/profile/${p.user_id}`}
                    key={p.user_id}
                    soundType="click"
                    className="grid grid-cols-[50px_1fr] md:grid-cols-[60px_1fr_160px_100px_100px_80px] items-center border-b border-white/10 px-6 py-4 hover:bg-white/5 transition"
                  >
                    <span className="text-sm font-black text-zinc-400">
                      {globalIndex === 0 ? "🥇" : globalIndex === 1 ? "🥈" : globalIndex === 2 ? "🥉" : `#${globalIndex + 1}`}
                    </span>
                    <div className="flex items-center gap-3 min-w-0">
                      <PlayerAvatar name={p.name} avatar={p.avatar_url} />
                      <div className="min-w-0">
                        <p className="font-black truncate">{p.name}</p>
                        <p className="text-xs text-zinc-500 truncate">{p.username || "No username"}</p>
                      </div>
                    </div>
                    <div className="hidden md:block">
                      <RankBadge cr={Number(p.cr || 0)} size="sm" />
                    </div>
                    <div className="hidden md:flex items-center gap-2">
                      <span className="font-black text-purple-400">{p.cr || 0}</span>
                      <TrendingIndicator delta={0} />
                    </div>
                    <div className="hidden md:block text-sm text-zinc-400">
                      <span className="text-green-400 font-bold">{p.wins || 0}W</span>
                      <span className="text-zinc-600"> / </span>
                      <span className="text-red-400">{p.losses || 0}L</span>
                      <span className="ml-1 text-xs text-zinc-600">({winRate}%)</span>
                    </div>
                    <span className="hidden md:block text-sm font-bold text-zinc-300">{p.kills || 0}</span>
                  </SoundLink>
                );
              })
            )}
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            itemsPerPage={ITEMS_PER_PAGE}
            totalItems={sorted.length}
          />
        </>
      )}
    </Shell>
  );
}
