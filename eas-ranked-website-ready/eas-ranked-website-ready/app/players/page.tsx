"use client";

import { useState, useMemo, useEffect } from "react";
import Shell from "@/components/Shell";
import PlayerAvatar from "@/components/PlayerAvatar";
import SoundLink from "@/components/SoundLink";
import RankBadge from "@/components/RankBadge";
import { SkeletonCardsGrid } from "@/components/LoadingSkeleton";
import Pagination from "@/components/Pagination";
import { getAchievements, getUnlockedCount } from "@/lib/achievements";

const ITEMS_PER_PAGE = 18;

type FilterRank = "all" | "ranked" | "placement" | "unregistered";

export default function PlayersPage() {
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterRank>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((data) => {
        setPlayers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = players;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) => p.name?.toLowerCase().includes(q) || p.username?.toLowerCase().includes(q)
      );
    }
    if (filter === "ranked") list = list.filter((p) => p.ranked);
    if (filter === "placement") list = list.filter((p) => p.registered && !p.ranked);
    if (filter === "unregistered") list = list.filter((p) => !p.registered);
    return list;
  }, [players, search, filter]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  function handleFilterChange(f: FilterRank) {
    setFilter(f);
    setPage(1);
  }

  return (
    <Shell>
      {/* ── Page header ── */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl text-xl" style={{ background: "rgba(0,207,255,0.14)", border: "1px solid rgba(0,207,255,0.25)" }}>👥</div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Players</h1>
            <p className="text-xs text-zinc-600 mt-0.5">
              {loading ? "Loading…" : `${filtered.length.toLocaleString()} players`}
            </p>
          </div>
        </div>
      </div>

      {/* ── Search + filters bar ── */}
      <div className="mb-5 rounded-2xl p-4 backdrop-blur-sm" style={{ border: "1px solid rgba(0,207,255,0.18)", background: "rgba(6,43,69,0.80)" }}>
        <div className="flex flex-wrap items-center gap-3">
          {/* Search input */}
          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-sm pointer-events-none">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name or username…"
              className="w-full rounded-xl py-2.5 pl-9 pr-4 text-sm outline-none transition-all duration-200 backdrop-blur-sm"
              style={{ background: "rgba(6,43,69,0.75)", border: "1px solid rgba(0,207,255,0.22)", color: "#e0f7ff" }}
            />
          </div>

          {/* Filter pills */}
          <div className="flex flex-wrap gap-1.5">
            {(["all", "ranked", "placement", "unregistered"] as FilterRank[]).map((f) => (
              <button
                key={f}
                onClick={() => handleFilterChange(f)}
                className="rounded-xl px-3 py-1.5 text-xs font-bold capitalize transition-all duration-200"
                style={filter === f
                  ? { border: "1px solid rgba(0,207,255,0.40)", background: "rgba(0,207,255,0.15)", color: "#00CFFF", boxShadow: "0 0 12px rgba(0,207,255,0.15)" }
                  : { border: "1px solid rgba(168,255,246,0.12)", background: "rgba(168,255,246,0.04)", color: "rgba(168,255,246,0.55)" }}
              >
                {f === "all" ? "All Players" : f === "ranked" ? "Ranked" : f === "placement" ? "Placements" : "Unregistered"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <SkeletonCardsGrid count={12} />
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] py-20 text-center backdrop-blur-sm" style={{ background: "rgba(9,9,25,0.85)" }}>
          <p className="text-4xl mb-4">🔍</p>
          <p className="text-base font-black text-zinc-400">No players found</p>
          <p className="mt-1 text-sm text-zinc-600">Try adjusting your search or filter</p>
        </div>
      ) : (
        <>
          {/* Responsive grid: 1 → 2 → 3 → 4 columns */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {paginated.map((p: any) => {
              const achievements = getAchievements(p);
              const unlockedCount = getUnlockedCount(p);
              const matches = Number(p.matches || 0);
              const winRate = matches ? Math.round((Number(p.wins || 0) / matches) * 100) : 0;

              return (
                <SoundLink
                  href={`/profile/${p.user_id}`}
                  key={p.user_id}
                  soundType="click"
                  className="group relative overflow-hidden rounded-2xl border border-white/[0.06] p-5 backdrop-blur-sm transition-all duration-200 hover:border-purple-500/25 hover:scale-[1.015] hover:-translate-y-0.5"
                  style={{ background: "rgba(9,9,25,0.85)" }}
                >
                  {/* Hover glow */}
                  <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: "radial-gradient(ellipse at top left, rgba(168,85,247,0.07), transparent 60%)" }} />
                  {/* Top accent */}
                  <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: "linear-gradient(90deg, rgba(168,85,247,0.8), rgba(79,142,247,0.6), transparent)" }} />

                  {/* Player header */}
                  <div className="relative flex items-center gap-3 mb-4">
                    <PlayerAvatar name={p.name} avatar={p.avatar_url} size="h-11 w-11" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate group-hover:text-white transition-colors">{p.name}</p>
                      <p className="text-xs text-zinc-600 truncate">{p.username || "—"}</p>
                    </div>
                    {p.ranked && <RankBadge cr={Number(p.cr || 0)} size="sm" showLabel={false} />}
                  </div>

                  {/* Stats grid */}
                  <div className="relative grid grid-cols-4 gap-2 text-center">
                    <Mini label="CR" value={(p.cr || 0).toLocaleString()} highlight />
                    <Mini label="Wins" value={p.wins || 0} />
                    <Mini label="Kills" value={(p.kills || 0).toLocaleString()} />
                    <Mini label="Win%" value={`${winRate}%`} />
                  </div>

                  {/* Achievement preview */}
                  <div className="relative mt-3 pt-3 border-t border-white/[0.04] flex items-center justify-between">
                    <div className="flex gap-0.5">
                      {achievements
                        .filter((a) => a.unlocked)
                        .slice(0, 5)
                        .map((a) => (
                          <span key={a.id} title={a.name} className="text-sm">
                            {a.icon}
                          </span>
                        ))}
                      {unlockedCount === 0 && (
                        <span className="text-[10px] text-zinc-700">No achievements yet</span>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-600 font-medium">
                      {unlockedCount}/{achievements.length} 🏅
                    </span>
                  </div>
                </SoundLink>
              );
            })}
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            itemsPerPage={ITEMS_PER_PAGE}
            totalItems={filtered.length}
          />
        </>
      )}
    </Shell>
  );
}

function Mini({ label, value, highlight }: { label: string; value: any; highlight?: boolean }) {
  return (
    <div className="rounded-xl px-2 py-2.5 transition-colors" style={{ border: "1px solid rgba(0,207,255,0.12)", background: "rgba(0,207,255,0.05)" }}>
      <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "rgba(168,255,246,0.50)" }}>{label}</p>
      <p className="text-xs font-black mt-0.5" style={{ color: highlight ? "#00CFFF" : "rgba(168,255,246,0.80)" }}>{value}</p>
    </div>
  );
}
