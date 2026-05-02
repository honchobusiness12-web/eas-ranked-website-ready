"use client";

import { useState, useMemo, useEffect } from "react";
import Shell from "@/components/Shell";
import PlayerAvatar from "@/components/PlayerAvatar";
import SoundLink from "@/components/SoundLink";
import RankBadge from "@/components/RankBadge";
import { SkeletonCardsGrid } from "@/components/LoadingSkeleton";
import Pagination from "@/components/Pagination";
import { getAchievements, getUnlockedCount } from "@/lib/achievements";
import { useTheme } from "@/components/ThemeProvider";

const ITEMS_PER_PAGE = 18;

type FilterRank = "all" | "ranked" | "placement" | "unregistered";

export default function PlayersPage() {
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterRank>("all");
  const [page, setPage] = useState(1);
  const { theme } = useTheme();
  const isLight = theme === "light";

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
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black">👥 Players</h1>
          <p className={`mt-2 ${isLight ? "text-[#7070a0]" : "text-zinc-400"}`}>
            {loading ? "Loading…" : `${filtered.length} players`}
          </p>
        </div>
      </div>

      {/* Search + filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative">
          <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${isLight ? "text-[#7070a0]" : "text-zinc-500"}`}>🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or username…"
            className={`rounded-xl border py-2.5 pl-9 pr-4 text-sm outline-none transition w-64 ${
              isLight
                ? "border-black/15 bg-white text-[#0f0f1a] placeholder-[#7070a0] shadow-sm focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20"
                : "border-white/10 bg-white/5 text-white placeholder-zinc-500 focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
            }`}
          />
        </div>
        <div className="flex gap-2">
          {(["all", "ranked", "placement", "unregistered"] as FilterRank[]).map((f) => (
            <button
              key={f}
              onClick={() => handleFilterChange(f)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-bold capitalize transition ${
                filter === f
                  ? "border-purple-600 bg-purple-600 text-white"
                  : isLight
                    ? "border-black/12 bg-white text-[#3d3d5c] shadow-sm hover:border-purple-500 hover:text-purple-700"
                    : "border-white/10 bg-white/5 text-zinc-400 hover:border-purple-700 hover:text-white"
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
        <div className={`rounded-2xl border p-12 text-center ${
          isLight ? "border-black/10 bg-white shadow-sm" : "border-white/10 bg-[#0d0d14]"
        }`}>
          <p className="text-4xl mb-3">🔍</p>
          <p className={`text-xl font-black ${isLight ? "text-[#7070a0]" : "text-zinc-400"}`}>No players found</p>
          <p className={`mt-2 text-sm ${isLight ? "text-[#9090b8]" : "text-zinc-600"}`}>Try adjusting your search or filter</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
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
                  className={`rounded-2xl border p-5 transition group ${
                    isLight
                      ? "border-black/10 bg-white shadow-sm hover:border-purple-400 hover:shadow-md"
                      : "border-white/10 bg-[#0d0d14] hover:border-purple-700"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <PlayerAvatar name={p.name} avatar={p.avatar_url} />
                    <div className="flex-1 min-w-0">
                      <p className="text-lg font-black truncate">{p.name}</p>
                      <p className={`text-xs truncate ${isLight ? "text-[#7070a0]" : "text-zinc-500"}`}>{p.username || "No username saved"}</p>
                    </div>
                    {p.ranked && <RankBadge cr={Number(p.cr || 0)} size="sm" showLabel={false} />}
                  </div>

                  <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                    <Mini label="CR" value={p.cr || 0} highlight isLight={isLight} />
                    <Mini label="Wins" value={p.wins || 0} isLight={isLight} />
                    <Mini label="Kills" value={p.kills || 0} isLight={isLight} />
                    <Mini label="Win%" value={`${winRate}%`} isLight={isLight} />
                  </div>

                  {/* Achievement preview */}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex gap-1">
                      {achievements
                        .filter((a) => a.unlocked)
                        .slice(0, 5)
                        .map((a) => (
                          <span key={a.id} title={a.name} className="text-base">
                            {a.icon}
                          </span>
                        ))}
                      {unlockedCount === 0 && (
                        <span className={`text-xs ${isLight ? "text-[#9090b8]" : "text-zinc-600"}`}>No achievements yet</span>
                      )}
                    </div>
                    <span className={`text-xs ${isLight ? "text-[#9090b8]" : "text-zinc-600"}`}>
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

function Mini({ label, value, highlight, isLight }: { label: string; value: any; highlight?: boolean; isLight?: boolean }) {
  return (
    <div className={`rounded-xl p-2 ${isLight ? "bg-[#f0f0f7]" : "bg-white/5"}`}>
      <p className={`text-xs ${isLight ? "text-[#7070a0]" : "text-zinc-500"}`}>{label}</p>
      <p className={`font-black text-sm ${highlight ? (isLight ? "text-purple-600" : "text-purple-400") : (isLight ? "text-[#0f0f1a]" : "")}`}>{value}</p>
    </div>
  );
}
