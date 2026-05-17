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
      {/* ── Page header ── */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-500/15 text-xl" style={{ border: "1px solid rgba(168,85,247,0.2)" }}>🏆</div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Leaderboard</h1>
              <p className="text-xs text-zinc-600 mt-0.5">
                {loading ? "Loading players…" : `${sorted.length.toLocaleString()} players ranked`}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={() => { setLoading(true); window.location.reload(); }}
          className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-zinc-400 transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.07] hover:text-white"
        >
          🔄 Refresh
        </button>
      </div>

      {/* ── Controls bar — search + sort + filters ── */}
      <div className="mb-4 rounded-2xl border border-white/[0.06] p-4 backdrop-blur-sm" style={{ background: "rgba(9,9,25,0.85)" }}>
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <PlayerSearch
              players={players}
              onSelect={handleSearch}
              placeholder="Search players…"
            />
          </div>

          {/* Sort buttons */}
          <div className="flex flex-wrap gap-1.5">
            {(["cr", "wins", "kills", "mvp_count", "matches"] as SortKey[]).map((key) => (
              <button
                key={key}
                onClick={() => handleSort(key)}
                className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition-all duration-200 ${
                  sortKey === key
                    ? "border-purple-500/40 bg-purple-500/15 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.2)]"
                    : "border-white/[0.07] bg-white/[0.04] text-zinc-500 hover:border-white/[0.12] hover:text-zinc-300"
                }`}
              >
                {key === "cr" ? "CR" : key === "mvp_count" ? "MVPs" : key.charAt(0).toUpperCase() + key.slice(1)}
                {sortIcon(key)}
              </button>
            ))}
          </div>

          {/* Premium filters toggle */}
          <button
            onClick={() => setShowPremiumFilters((v) => !v)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all duration-200 ${
              showPremiumFilters
                ? "border-yellow-500/30 bg-yellow-500/[0.10] text-yellow-300"
                : "border-white/[0.07] bg-white/[0.04] text-zinc-400 hover:border-yellow-500/25 hover:text-yellow-300"
            }`}
          >
            💎 Filters {showPremiumFilters ? "▲" : "▼"}
          </button>
        </div>

        {/* Premium filter panel */}
        {showPremiumFilters && (
          <div className="mt-4 pt-4 border-t border-white/[0.05] flex flex-wrap items-end gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-1.5">Rank Tier</p>
              <select
                value={rankFilter}
                onChange={(e) => { setRankFilter(e.target.value); setPage(1); }}
                className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white transition-all duration-200 focus:border-purple-500/40 focus:outline-none focus:ring-1 focus:ring-purple-500/20"
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
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-1.5">Win Rate</p>
              <select
                value={winRateFilter}
                onChange={(e) => { setWinRateFilter(e.target.value); setPage(1); }}
                className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white transition-all duration-200 focus:border-purple-500/40 focus:outline-none focus:ring-1 focus:ring-purple-500/20"
              >
                <option value="all">All Win Rates</option>
                <option value="60plus">60%+ Win Rate</option>
                <option value="50to60">50–60% Win Rate</option>
                <option value="below50">Below 50%</option>
              </select>
            </div>
            {(rankFilter !== "all" || winRateFilter !== "all") && (
              <button
                onClick={() => { setRankFilter("all"); setWinRateFilter("all"); setPage(1); }}
                className="rounded-xl border border-red-500/25 bg-red-500/[0.07] px-3 py-2 text-xs font-bold text-red-400 transition-all duration-200 hover:bg-red-500/[0.12] hover:text-red-300"
              >
                ✕ Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Table ── */}
      {loading ? (
        <SkeletonTable rows={10} />
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-white/[0.06] backdrop-blur-sm" style={{ background: "rgba(9,9,25,0.85)" }}>
            {/* Column headers */}
            <div className="hidden md:grid grid-cols-[56px_1fr_160px_100px_130px_80px] items-center border-b border-white/[0.06] px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-700" style={{ background: "linear-gradient(90deg, rgba(124,58,237,0.05), transparent)" }}>
              <span>#</span>
              <span>Player</span>
              <span>Rank</span>
              <button onClick={() => handleSort("cr")} className="text-left transition-colors hover:text-purple-400">
                CR{sortIcon("cr")}
              </button>
              <button onClick={() => handleSort("wins")} className="text-left transition-colors hover:text-purple-400">
                W / L{sortIcon("wins")}
              </button>
              <button onClick={() => handleSort("kills")} className="text-left transition-colors hover:text-purple-400">
                Kills{sortIcon("kills")}
              </button>
            </div>

            {sorted.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="text-4xl mb-4">🔍</p>
                <p className="text-zinc-400 text-base font-black">No players match your search</p>
                <p className="text-zinc-600 text-sm mt-1">Try adjusting your filters</p>
              </div>
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
                    className="group grid grid-cols-[56px_1fr] md:grid-cols-[56px_1fr_160px_100px_130px_80px] items-center border-b border-white/[0.04] px-6 py-4 transition-all duration-200 hover:bg-purple-500/[0.05] last:border-0"
                  >
                    <span className="text-xs font-black">
                      {globalIndex === 0 ? (
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-yellow-500/15 text-base">🥇</span>
                      ) : globalIndex === 1 ? (
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-400/10 text-base">🥈</span>
                      ) : globalIndex === 2 ? (
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-orange-700/15 text-base">🥉</span>
                      ) : (
                        <span className="text-xs font-black text-zinc-700">#{globalIndex + 1}</span>
                      )}
                    </span>
                    <div className="flex items-center gap-3 min-w-0">
                      <PlayerAvatar name={p.name} avatar={p.avatar_url} size="h-9 w-9" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate group-hover:text-white transition-colors">{p.name}</p>
                        <p className="text-xs text-zinc-600 truncate">{p.username || "—"}</p>
                      </div>
                    </div>
                    <div className="hidden md:block">
                      <RankBadge cr={Number(p.cr || 0)} size="sm" />
                    </div>
                    <div className="hidden md:flex items-center">
                      <span className="text-sm font-black text-purple-300 group-hover:text-purple-200 transition-colors">{(p.cr || 0).toLocaleString()}</span>
                    </div>
                    <div className="hidden md:flex items-center gap-1.5 text-xs">
                      <span className="text-green-400 font-bold">{p.wins || 0}W</span>
                      <span className="text-zinc-700">/</span>
                      <span className="text-red-400">{p.losses || 0}L</span>
                      <span className="rounded-md bg-white/[0.04] px-1.5 py-0.5 text-zinc-500 font-medium">{winRate}%</span>
                    </div>
                    <span className="hidden md:block text-xs font-bold text-zinc-500 group-hover:text-zinc-400 transition-colors">{(p.kills || 0).toLocaleString()}</span>
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

          <div className="mt-5">
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
