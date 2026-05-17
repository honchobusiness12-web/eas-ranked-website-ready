import Shell from "@/components/ServerShell";
import PlayerAvatar from "@/components/PlayerAvatar";
import SoundLink from "@/components/SoundLink";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { syncPlayersFromDB } from "@/lib/cache";

export const revalidate = 30;

async function getAllPlayers() {
  return syncPlayersFromDB();
}

export default async function PlacementsPage() {
  const allPlayers = await getAllPlayers();
  const players = allPlayers.filter((p: any) => p.registered && !p.ranked);

  const totalPlayers = players.length;
  const avgProgress =
    totalPlayers > 0
      ? Math.round(
          players.reduce(
            (sum: number, p: any) =>
              sum + Math.min(100, Math.round((Number(p.placement_matches || 0) / 7) * 100)),
            0
          ) / totalPlayers
        )
      : 0;

  return (
    <Shell>
      <PageHeader
        icon="📋"
        title="Placements"
        description="Players currently completing their 7 placement matches to earn a rank."
        iconAccent="orange"
        actions={
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.04] px-4 py-2">
            <span className="text-xs text-zinc-500">In placements:</span>
            <span className="text-sm font-black text-orange-400">{totalPlayers}</span>
          </div>
        }
      />

      {/* Quick stats */}
      {totalPlayers > 0 && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div
            className="rounded-2xl border border-white/[0.06] p-4 backdrop-blur-sm"
            style={{ background: "rgba(9,9,25,0.85)" }}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
              In Placements
            </p>
            <p className="mt-1.5 text-2xl font-black text-orange-400">{totalPlayers}</p>
            <p className="mt-0.5 text-[10px] text-zinc-700">Active players</p>
          </div>
          <div
            className="rounded-2xl border border-white/[0.06] p-4 backdrop-blur-sm"
            style={{ background: "rgba(9,9,25,0.85)" }}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
              Avg Progress
            </p>
            <p className="mt-1.5 text-2xl font-black text-yellow-400">{avgProgress}%</p>
            <p className="mt-0.5 text-[10px] text-zinc-700">Across all players</p>
          </div>
          <div
            className="rounded-2xl border border-white/[0.06] p-4 backdrop-blur-sm sm:block hidden"
            style={{ background: "rgba(9,9,25,0.85)" }}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
              Matches Required
            </p>
            <p className="mt-1.5 text-2xl font-black text-purple-400">7</p>
            <p className="mt-0.5 text-[10px] text-zinc-700">To earn a rank</p>
          </div>
        </div>
      )}

      {/* Player list */}
      {players.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No players in placements"
          description="All registered players have completed their placement matches and earned a rank."
          action={
            <SoundLink
              href="/leaderboard"
              soundType="success"
              className="inline-flex items-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 px-5 py-2.5 text-sm font-bold text-purple-300 transition-all duration-200 hover:bg-purple-500/20 hover:text-purple-200"
            >
              🏆 View Leaderboard
            </SoundLink>
          }
        />
      ) : (
        <div
          className="overflow-hidden rounded-2xl border border-white/[0.06] backdrop-blur-sm"
          style={{ background: "rgba(9,9,25,0.85)" }}
        >
          {/* Column headers */}
          <div
            className="hidden sm:grid grid-cols-[1fr_120px_160px] items-center border-b border-white/[0.06] px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-700"
            style={{ background: "linear-gradient(90deg, rgba(251,146,60,0.05), transparent)" }}
          >
            <span>Player</span>
            <span className="text-center">Progress</span>
            <span className="text-right">Matches Done</span>
          </div>

          {players.map((p: any) => {
            const done = Number(p.placement_matches || 0);
            const percent = Math.min(100, Math.round((done / 7) * 100));
            const isNearDone = done >= 5;
            const isDone = done >= 7;

            return (
              <SoundLink
                href={`/profile/${p.user_id}`}
                key={p.user_id}
                soundType="click"
                className="group block border-b border-white/[0.04] px-6 py-4 transition-all duration-200 hover:bg-orange-500/[0.04] last:border-0"
              >
                <div className="flex flex-col gap-3 sm:grid sm:grid-cols-[1fr_120px_160px] sm:items-center sm:gap-0">
                  {/* Player info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <PlayerAvatar name={p.name} avatar={p.avatar_url} size="h-10 w-10" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate group-hover:text-white transition-colors">
                        {p.name}
                      </p>
                      <p className="text-xs text-zinc-600 truncate">
                        {p.username || "—"}
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="sm:px-4">
                    <div
                      className="h-2 w-full rounded-full overflow-hidden"
                      style={{ background: "rgba(255,255,255,0.05)" }}
                    >
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          isDone
                            ? "bg-gradient-to-r from-green-500 to-emerald-400"
                            : isNearDone
                            ? "bg-gradient-to-r from-yellow-500 to-orange-400"
                            : "bg-gradient-to-r from-orange-500 to-yellow-500"
                        }`}
                        style={{
                          width: `${percent}%`,
                          boxShadow: isNearDone
                            ? "0 0 8px rgba(251,146,60,0.5)"
                            : undefined,
                        }}
                      />
                    </div>
                    <p className="mt-1 text-center text-[10px] font-bold text-zinc-600">
                      {percent}%
                    </p>
                  </div>

                  {/* Match count */}
                  <div className="flex items-center justify-between sm:justify-end gap-2">
                    <span className="text-xs text-zinc-600 sm:hidden">Matches:</span>
                    <div className="flex items-center gap-1.5">
                      {Array.from({ length: 7 }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-2.5 w-2.5 rounded-sm transition-colors ${
                            i < done
                              ? isDone
                                ? "bg-green-500"
                                : isNearDone
                                ? "bg-yellow-500"
                                : "bg-orange-500"
                              : "bg-white/[0.06]"
                          }`}
                        />
                      ))}
                      <span
                        className={`ml-1 text-xs font-black ${
                          isDone
                            ? "text-green-400"
                            : isNearDone
                            ? "text-yellow-400"
                            : "text-orange-400"
                        }`}
                      >
                        {done}/7
                      </span>
                    </div>
                  </div>
                </div>
              </SoundLink>
            );
          })}
        </div>
      )}

      {/* Footer note */}
      <div className="mt-5 rounded-2xl border border-white/[0.04] bg-white/[0.02] px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="text-base mt-0.5">💡</span>
          <p className="text-xs text-zinc-600 leading-relaxed">
            Players must complete <span className="font-bold text-zinc-400">7 placement matches</span> before
            receiving their starting rank. Placement results determine your initial CR and rank tier.
            Visit the{" "}
            <SoundLink href="/guide" soundType="click" className="text-purple-400 hover:text-purple-300 font-bold transition-colors">
              How Ranked Works
            </SoundLink>{" "}
            guide for more details.
          </p>
        </div>
      </div>
    </Shell>
  );
}
