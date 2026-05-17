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
      {/* ── Header ── */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">👥 Players</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            {loading ? "Loading…" : `${filtered.length.toLocaleString()} players`}
          </p>
        </div>
      </div>

      {/* ── Search + filters ── */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-sm">🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or username…"
            className="rounded-lg border border-white/[0.07] bg-white/[0.04] py-2 pl-9 pr-4 text-sm text-white placeholder-zinc-600 outline-none focus:border-orange-500/50 focus:bg-white/[0.06] transition-colors w-56"
          />
        </div>
        <div className="flex gap-1.5">
          {(["all", "ranked", "placement", "unregistered"] as FilterRank[]).map((f) => (
            <button
              key={f}
              onClick={() => handleFilterChange(f)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-bold capitalize transition-colors ${
                filter === f
                  ? "border-orange-500/50 bg-orange-500/20 text-orange-300"
                  : "border-white/[0.07] bg-white/[0.04] text-zinc-500 hover:border-white/[0.15] hover:text-zinc-300"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <SkeletonCardsGrid count={9} />
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d18] py-16 text-center">
          <p className="text-3xl mb-3">🔍</p>
          <p className="text-base font-black text-zinc-400">No players found</p>
          <p className="mt-1 text-xs text-zinc-600">Try adjusting your search or filter</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
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
                  className="rounded-2xl border border-white/[0.07] bg-[#0d0d18] p-4 hover:border-white/[0.14] hover:bg-[#111120] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <PlayerAvatar name={p.name} avatar={p.avatar_url} size="h-10 w-10" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{p.name}</p>
                      <p className="text-xs text-zinc-600 truncate">{p.username || "—"}</p>
                    </div>
                    {p.ranked && <RankBadge cr={Number(p.cr || 0)} size="sm" showLabel={false} />}
                  </div>

                  <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                    <Mini label="CR" value={(p.cr || 0).toLocaleString()} highlight />
                    <Mini label="Wins" value={p.wins || 0} />
                    <Mini label="Kills" value={(p.kills || 0).toLocaleString()} />
                    <Mini label="Win%" value={`${winRate}%`} />
                  </div>

                  {/* Achievement preview */}
                  <div className="mt-3 flex items-center justify-between">
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
                    <span className="text-[10px] text-zinc-600">
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
    <div className="rounded-lg bg-white/[0.04] px-2 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">{label}</p>
      <p className={`text-xs font-black mt-0.5 ${highlight ? "text-orange-400" : "text-white"}`}>{value}</p>
    </div>
  );
}
