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
import PremiumUpsell from "@/components/PremiumUpsell";

type SortKey = "cr" | "wins" | "kills" | "mvp_count" | "matches";
const ITEMS_PER_PAGE = 25;

export default function LeaderboardPage() {
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("cr");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [rankFilter, setRankFilter] = useState<string>("all");
  const [winRateFilter, setWinRateFilter] = useState<string>("all");
  const [showPremiumFilters, setShowPremiumFilters] = useState(false);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((data) => {
        setPlayers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Filter by search + premium filters
  const filtered = useMemo(() => {
    let result = players;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) => p.name?.toLowerCase().includes(q) || p.username?.toLowerCase().includes(q)
      );
    }
    if (rankFilter !== "all") {
      result = result.filter((p) => {
        const cr = Number(p.cr || 0);
        if (rankFilter === "rookie") return cr < 400;
        if (rankFilter === "amateur") return cr >= 400 && cr < 700;
        if (rankFilter === "pro") return cr >= 700 && cr < 1000;
        if (rankFilter === "elite") return cr >= 1000 && cr < 1200;
        if (rankFilter === "allstar") return cr >= 1200 && cr < 1600;
        if (rankFilter === "superstar") return cr >= 1600 && cr < 2100;
        if (rankFilter === "remorseless") return cr >= 2100 && cr < 2750;
        if (rankFilter === "legend") return cr >= 2750 && cr < 3550;
        if (rankFilter === "unreal") return cr >= 3550 && cr < 4500;
        if (rankFilter === "hof") return cr >= 4500;
        return true;
      });
    }
    if (winRateFilter !== "all") {
      result = result.filter((p) => {
        const matches = Number(p.matches || 0);
        const wr = matches ? Math.round((Number(p.wins || 0) / matches) * 100) : 0;
        if (winRateFilter === "60plus") return wr >= 60;
        if (winRateFilter === "50to60") return wr >= 50 && wr < 60;
        if (winRateFilter === "below50") return wr < 50;
        return true;
      });
    }
    return result;
  }, [players, searchQuery, rankFilter, winRateFilter]);

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
            className="rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-4 py-2 font-bold hover:from-orange-400 hover:to-red-400 transition-all"
            onClick={() => { setLoading(true); window.location.reload(); }}
          >
            🔄 Refresh
          </SoundLink>
        </div>
      </div>

      {/* Premium filters */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => setShowPremiumFilters((v) => !v)}
            className="flex items-center gap-2 rounded-xl border border-yellow-600/40 bg-yellow-950/10 px-4 py-2 text-sm font-bold text-yellow-300 hover:bg-yellow-950/20 transition"
          >
            💎 Premium Filters {showPremiumFilters ? "▲" : "▼"}
          </button>
        </div>
        {showPremiumFilters && (
          <div className="rounded-2xl border border-yellow-700/30 bg-yellow-950/10 p-4 mb-3">
            <div className="flex flex-wrap gap-3">
              <div>
                <p className="text-xs text-zinc-500 mb-1.5 font-bold">Rank Tier</p>
                <select
                  value={rankFilter}
                  onChange={(e) => { setRankFilter(e.target.value); setPage(1); }}
                  className="rounded-xl border border-white/10 bg-[#0d0d14] px-3 py-2 text-sm text-white focus:border-yellow-600/60 focus:outline-none"
                >
                  <option value="all">All Ranks</option>
                  <option value="rookie">R1 Rookie</option>
                  <option value="amateur">R2 Amateur</option>
                  <option value="pro">R3 Pro</option>
                  <option value="elite">R4 Elite</option>
                  <option value="allstar">R5 All-Star</option>
                  <option value="superstar">R6 SuperStar</option>
                  <option value="remorseless">R7 Remorseless</option>
                  <option value="legend">R8 Legend</option>
                  <option value="unreal">R9 Unreal</option>
                  <option value="hof">R10 Hall Of Fame</option>
                </select>
              </div>
              <div>
                <p className="text-xs text-zinc-500 mb-1.5 font-bold">Win Rate</p>
                <select
                  value={winRateFilter}
                  onChange={(e) => { setWinRateFilter(e.target.value); setPage(1); }}
                  className="rounded-xl border border-white/10 bg-[#0d0d14] px-3 py-2 text-sm text-white focus:border-yellow-600/60 focus:outline-none"
                >
                  <option value="all">All Win Rates</option>
                  <option value="60plus">60%+ Win Rate</option>
                  <option value="50to60">50–60% Win Rate</option>
                  <option value="below50">Below 50%</option>
                </select>
              </div>
              {(rankFilter !== "all" || winRateFilter !== "all") && (
                <div className="flex items-end">
                  <button
                    onClick={() => { setRankFilter("all"); setWinRateFilter("all"); setPage(1); }}
                    className="rounded-xl border border-red-700/40 px-3 py-2 text-sm font-bold text-red-400 hover:bg-red-950/20 transition"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
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
                  ? "border-orange-500 bg-gradient-to-r from-orange-500 to-red-500 text-white"
                  : "border-white/10 bg-white/5 text-zinc-400 hover:border-orange-600 hover:text-white"
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
              <button onClick={() => handleSort("cr")} className="text-left hover:text-orange-300 transition">
                CR{sortIcon("cr")}
              </button>
              <button onClick={() => handleSort("wins")} className="text-left hover:text-orange-300 transition">
                W/L{sortIcon("wins")}
              </button>
              <button onClick={() => handleSort("kills")} className="text-left hover:text-orange-300 transition">
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
                      <span className="font-black text-orange-400">{p.cr || 0}</span>
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

          {/* Premium upsell */}
          <div className="mt-6">
            <PremiumUpsell
              compact
              message="Premium members get custom rank/win-rate filters, advanced analytics, and comparison history."
            />
          </div>
        </>
      )}
    </Shell>
  );
}
