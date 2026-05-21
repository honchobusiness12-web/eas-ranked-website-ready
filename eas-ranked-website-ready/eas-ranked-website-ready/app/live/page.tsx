import Shell from "@/components/ServerShell";
import ActivityFeed from "@/components/ActivityFeed";
import PageHeader from "@/components/PageHeader";
import SoundLink from "@/components/SoundLink";
import PlayerAvatar from "@/components/PlayerAvatar";
import RankBadge from "@/components/RankBadge";
import { syncPlayersFromDB } from "@/lib/cache";
import { pool } from "@/lib/db";

export const revalidate = 15;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActiveScrim {
  scrim_id: string;
  scrim_type: string;
  league_host_name: string;
  player_count: number;
  start_time: string;
}

// ---------------------------------------------------------------------------
// Data fetchers
// ---------------------------------------------------------------------------

async function getActiveScrims(): Promise<ActiveScrim[]> {
  try {
    const result = await pool.query(
      `SELECT scrim_id, scrim_type, league_host_name, player_count, start_time
       FROM scrim_sessions
       WHERE status = 'active'
         AND start_time > NOW() - INTERVAL '30 minutes'
       ORDER BY start_time DESC`
    );
    return result.rows as ActiveScrim[];
  } catch {
    return [];
  }
}

async function getRecentRankedActivity() {
  try {
    const result = await pool.query(
      `SELECT
         COALESCE(data->>'display_name', data->>'username', 'Unknown') AS name,
         data->>'avatar_url' AS avatar_url,
         user_id,
         COALESCE((data->>'cr')::int, 0) AS cr,
         COALESCE((data->>'wins')::int, 0) AS wins,
         COALESCE((data->>'losses')::int, 0) AS losses,
         COALESCE((data->>'matches')::int, 0) AS matches
       FROM players
       WHERE COALESCE((data->>'ranked')::boolean, false) = true
         AND COALESCE((data->>'blacklisted')::boolean, false) = false
       ORDER BY cr DESC
       LIMIT 10`
    );
    return result.rows;
  } catch {
    return [];
  }
}

async function getRecentPlacements() {
  try {
    const result = await pool.query(
      `SELECT
         COALESCE(data->>'display_name', data->>'username', 'Unknown') AS name,
         data->>'avatar_url' AS avatar_url,
         user_id,
         COALESCE((data->>'placement_matches')::int, 0) AS placement_matches
       FROM players
       WHERE COALESCE((data->>'registered')::boolean, false) = true
         AND COALESCE((data->>'ranked')::boolean, false) = false
         AND COALESCE((data->>'blacklisted')::boolean, false) = false
       ORDER BY (data->>'placement_matches')::int DESC NULLS LAST
       LIMIT 8`
    );
    return result.rows;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function LivePage() {
  const [scrims, players, rankedActivity, placements] = await Promise.all([
    getActiveScrims(),
    syncPlayersFromDB(),
    getRecentRankedActivity(),
    getRecentPlacements(),
  ]);

  const hasAnything = scrims.length > 0 || players.length > 0;

  return (
    <Shell>
      <PageHeader
        icon="🔴"
        title="Live"
        description="Active scrims, recent ranked activity, and placement progress — updated every 15 seconds."
        iconAccent="red"
        actions={
          scrims.length > 0 ? (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
              <span className="text-xs font-bold text-red-300">
                {scrims.length} scrim{scrims.length !== 1 ? "s" : ""} live
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.04] px-4 py-2">
              <span className="h-2 w-2 rounded-full bg-zinc-600" />
              <span className="text-xs text-zinc-500">No active scrims</span>
            </div>
          )
        }
      />

      {/* ── Active Scrims ── */}
      <section className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-500/15 text-base">🎮</div>
          <div>
            <h2 className="text-base font-black">Active Scrims</h2>
            <p className="text-[11px] text-zinc-600">Sessions started in the last 30 minutes</p>
          </div>
        </div>

        {scrims.length === 0 ? (
          <div
            className="rounded-2xl border border-white/[0.06] p-8 text-center backdrop-blur-sm"
            style={{ background: "rgba(9,9,25,0.85)" }}
          >
            <p className="text-3xl mb-3">😴</p>
            <p className="text-sm font-bold text-zinc-400">No active scrims right now</p>
            <p className="text-xs text-zinc-600 mt-1">
              Scrims appear here when a session is started by a host. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {scrims.map((scrim) => {
              const minutesElapsed = Math.floor(
                (Date.now() - new Date(scrim.start_time).getTime()) / 60000
              );
              const isRanked = scrim.scrim_type === "ranked";
              return (
                <div
                  key={scrim.scrim_id}
                  className="relative overflow-hidden rounded-2xl border border-red-500/30 bg-red-950/10 p-5 backdrop-blur-sm"
                >
                  {/* Pulsing live dot */}
                  <div className="absolute top-4 right-4 flex items-center gap-1.5">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-red-400">Live</span>
                  </div>

                  <div className="mb-3">
                    <p className="text-sm font-black text-white">
                      {isRanked ? "🏆 Ranked Scrim" : "📋 Placement Scrim"}
                    </p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Hosted by <span className="font-bold text-zinc-300">{scrim.league_host_name}</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-white/[0.04] px-3 py-2 text-center">
                      <p className="text-lg font-black text-white">{scrim.player_count}</p>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-600">Players</p>
                    </div>
                    <div className="rounded-xl bg-white/[0.04] px-3 py-2 text-center">
                      <p className="text-lg font-black text-red-400">{minutesElapsed}m</p>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-600">Elapsed</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Main grid: Activity + Ranked + Placements ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">

        {/* Left: Recent Activity Feed */}
        <div className="space-y-5">
          <div
            className="overflow-hidden rounded-2xl border border-white/[0.06] backdrop-blur-sm"
            style={{ background: "rgba(9,9,25,0.85)" }}
          >
            <div
              className="border-b border-white/[0.06] px-5 py-4"
              style={{ background: "linear-gradient(90deg, rgba(79,142,247,0.07), transparent)" }}
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/15 text-sm">⚡</div>
                <div>
                  <h3 className="text-sm font-black">Live Activity</h3>
                  <p className="text-[10px] text-zinc-600">Recent match events from all players</p>
                </div>
              </div>
            </div>
            <div className="px-3 py-2">
              <ActivityFeed players={players as any} />
            </div>
          </div>

          {/* Placement Progress */}
          <div
            className="overflow-hidden rounded-2xl border border-white/[0.06] backdrop-blur-sm"
            style={{ background: "rgba(9,9,25,0.85)" }}
          >
            <div
              className="border-b border-white/[0.06] px-5 py-4"
              style={{ background: "linear-gradient(90deg, rgba(251,146,60,0.07), transparent)" }}
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/15 text-sm">📋</div>
                <div>
                  <h3 className="text-sm font-black">Placement Progress</h3>
                  <p className="text-[10px] text-zinc-600">Players completing placement matches</p>
                </div>
              </div>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {placements.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <p className="text-2xl mb-2">✅</p>
                  <p className="text-xs text-zinc-500 font-medium">No players in placements right now.</p>
                </div>
              ) : (
                placements.map((p: any) => {
                  const pct = Math.min(100, Math.round((Number(p.placement_matches) / 7) * 100));
                  return (
                    <SoundLink
                      key={p.user_id}
                      href={`/profile/${p.user_id}`}
                      soundType="click"
                      className="flex items-center gap-3 px-5 py-3 transition-all duration-200 hover:bg-white/[0.03]"
                    >
                      <PlayerAvatar name={p.name} avatar={p.avatar_url} size="h-8 w-8" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-zinc-300 truncate">{p.name}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-white/[0.06]">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-yellow-500 transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-orange-400 shrink-0">
                            {p.placement_matches}/7
                          </span>
                        </div>
                      </div>
                    </SoundLink>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right: Top Ranked Players */}
        <div>
          <div
            className="overflow-hidden rounded-2xl border border-white/[0.06] backdrop-blur-sm"
            style={{ background: "rgba(9,9,25,0.85)" }}
          >
            <div
              className="border-b border-white/[0.06] px-5 py-4"
              style={{ background: "linear-gradient(90deg, rgba(124,58,237,0.07), transparent)" }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/15 text-sm">🏆</div>
                  <div>
                    <h3 className="text-sm font-black">Top Ranked</h3>
                    <p className="text-[10px] text-zinc-600">Highest CR players</p>
                  </div>
                </div>
                <SoundLink
                  href="/leaderboard"
                  soundType="click"
                  className="text-[10px] font-bold text-purple-400 hover:text-purple-300 transition-colors"
                >
                  Full board →
                </SoundLink>
              </div>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {rankedActivity.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <p className="text-2xl mb-2">🔍</p>
                  <p className="text-xs text-zinc-500 font-medium">No ranked players found.</p>
                </div>
              ) : (
                rankedActivity.map((p: any, idx: number) => (
                  <SoundLink
                    key={p.user_id}
                    href={`/profile/${p.user_id}`}
                    soundType="click"
                    className="group flex items-center gap-3 px-4 py-3 transition-all duration-200 hover:bg-purple-500/[0.04]"
                  >
                    <span className="w-5 shrink-0 text-center text-xs font-black text-zinc-600">
                      {idx + 1}
                    </span>
                    <PlayerAvatar name={p.name} avatar={p.avatar_url} size="h-8 w-8" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-zinc-300 truncate group-hover:text-white transition-colors">
                        {p.name}
                      </p>
                      <RankBadge cr={Number(p.cr)} size="xs" />
                    </div>
                    <span className="shrink-0 text-sm font-black text-purple-300">
                      {Number(p.cr).toLocaleString()}
                    </span>
                  </SoundLink>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Empty state — nothing at all */}
      {!hasAnything && (
        <div
          className="mt-5 rounded-2xl border border-white/[0.06] p-12 text-center backdrop-blur-sm"
          style={{ background: "rgba(9,9,25,0.85)" }}
        >
          <p className="text-5xl mb-4">🌙</p>
          <h2 className="text-xl font-black text-zinc-300">Nothing live right now</h2>
          <p className="mt-2 text-sm text-zinc-500">
            Check back when a scrim is running or players are active.
          </p>
          <SoundLink
            href="/"
            soundType="click"
            className="mt-5 inline-block rounded-xl border border-white/[0.10] px-6 py-2.5 text-sm font-bold text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200 transition-all"
          >
            ← Back to Dashboard
          </SoundLink>
        </div>
      )}
    </Shell>
  );
}
