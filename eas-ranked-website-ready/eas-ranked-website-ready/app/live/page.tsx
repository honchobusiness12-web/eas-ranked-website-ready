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
            <div
              className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2"
              style={{ boxShadow: "0 0 16px rgba(239,68,68,0.08)" }}
            >
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
      <section className="mb-6">
        <div className="flex items-center gap-2.5 mb-4">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl text-base"
            style={{ background: "rgba(239,68,68,0.14)", border: "1px solid rgba(239,68,68,0.22)" }}
          >
            🎮
          </div>
          <div>
            <h2 className="text-base font-black">Active Scrims</h2>
            <p className="text-[11px] text-zinc-600">Sessions started in the last 30 minutes</p>
          </div>
        </div>

        {scrims.length === 0 ? (
          <div
            className="rounded-2xl border border-white/[0.06] p-10 text-center backdrop-blur-sm"
            style={{
              background: "rgba(10,10,28,0.80)",
              boxShadow: "0 4px 24px rgba(0,0,0,0.25), 0 1px 0 rgba(255,255,255,0.04) inset",
            }}
          >
            <div
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              😴
            </div>
            <p className="text-sm font-bold text-zinc-300">No active scrims right now</p>
            <p className="text-xs text-zinc-600 mt-1.5 max-w-xs mx-auto leading-relaxed">
              Scrims appear here when a session is started by a host. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {scrims.map((scrim, idx) => {
              const minutesElapsed = Math.floor(
                (Date.now() - new Date(scrim.start_time).getTime()) / 60000
              );
              const isRanked = scrim.scrim_type === "ranked";
              return (
                <div
                  key={scrim.scrim_id}
                  className="scrim-live-card p-5 animate-fadeInUp"
                  style={{ animationDelay: `${idx * 80}ms` }}
                >
                  {/* Top accent */}
                  <div className="neon-line-red mb-4" />

                  {/* Live indicator */}
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-black text-white">
                      {isRanked ? "🏆 Ranked Scrim" : "📋 Placement Scrim"}
                    </p>
                    <div className="flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-wider text-red-400">Live</span>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-400 mb-4">
                    Hosted by <span className="font-bold text-zinc-200">{scrim.league_host_name}</span>
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <div
                      className="rounded-xl px-3 py-2.5 text-center"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <p className="text-xl font-black text-white">{scrim.player_count}</p>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-600 mt-0.5">Players</p>
                    </div>
                    <div
                      className="rounded-xl px-3 py-2.5 text-center"
                      style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}
                    >
                      <p className="text-xl font-black text-red-400">{minutesElapsed}m</p>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-600 mt-0.5">Elapsed</p>
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

        {/* Left: Recent Activity Feed + Placement Progress */}
        <div className="space-y-5">

          {/* Live Activity */}
          <div
            className="overflow-hidden rounded-2xl border border-white/[0.07] backdrop-blur-sm"
            style={{
              background: "rgba(10,10,28,0.85)",
              boxShadow: "0 4px 24px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.04) inset",
            }}
          >
            <div
              className="border-b border-white/[0.06] px-5 py-4"
              style={{ background: "linear-gradient(90deg, rgba(79,142,247,0.08), transparent)" }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
                  style={{ background: "rgba(79,142,247,0.14)", border: "1px solid rgba(79,142,247,0.22)" }}
                >
                  ⚡
                </div>
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
            className="overflow-hidden rounded-2xl border border-white/[0.07] backdrop-blur-sm"
            style={{
              background: "rgba(10,10,28,0.85)",
              boxShadow: "0 4px 24px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.04) inset",
            }}
          >
            <div
              className="border-b border-white/[0.06] px-5 py-4"
              style={{ background: "linear-gradient(90deg, rgba(249,115,22,0.08), transparent)" }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
                  style={{ background: "rgba(249,115,22,0.14)", border: "1px solid rgba(249,115,22,0.22)" }}
                >
                  📋
                </div>
                <div>
                  <h3 className="text-sm font-black">Placement Progress</h3>
                  <p className="text-[10px] text-zinc-600">Players completing placement matches</p>
                </div>
              </div>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {placements.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <div
                    className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl text-xl"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                  >
                    ✅
                  </div>
                  <p className="text-xs text-zinc-500 font-medium">No players in placements right now.</p>
                </div>
              ) : (
                placements.map((p: any, idx: number) => {
                  const done = Number(p.placement_matches);
                  return (
                    <SoundLink
                      key={p.user_id}
                      href={`/profile/${p.user_id}`}
                      soundType="click"
                      className="activity-row flex items-center gap-3 px-5 py-3.5 transition-all duration-150 hover:bg-orange-500/[0.04]"
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <PlayerAvatar name={p.name} avatar={p.avatar_url} size="h-8 w-8" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-zinc-300 truncate">{p.name}</p>
                        {/* Pip track */}
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <div className="placement-track flex-1">
                            {Array.from({ length: 7 }).map((_, i) => (
                              <div
                                key={i}
                                className={`placement-pip-v2 ${i < done ? "done" : "pending"}`}
                              />
                            ))}
                          </div>
                          <span className="text-[10px] font-bold text-orange-400 shrink-0 tabular-nums">
                            {done}/7
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
            className="overflow-hidden rounded-2xl border border-white/[0.07] backdrop-blur-sm"
            style={{
              background: "rgba(10,10,28,0.85)",
              boxShadow: "0 4px 24px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.04) inset",
            }}
          >
            <div
              className="border-b border-white/[0.06] px-5 py-4"
              style={{ background: "linear-gradient(90deg, rgba(124,58,237,0.08), transparent)" }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
                    style={{ background: "rgba(168,85,247,0.14)", border: "1px solid rgba(168,85,247,0.22)" }}
                  >
                    🏆
                  </div>
                  <div>
                    <h3 className="text-sm font-black">Top Ranked</h3>
                    <p className="text-[10px] text-zinc-600">Highest CR players</p>
                  </div>
                </div>
                <SoundLink
                  href="/leaderboard"
                  soundType="click"
                  className="text-[10px] font-bold text-purple-400 hover:text-purple-300 transition-colors rounded-lg border border-purple-500/20 bg-purple-500/[0.07] px-2.5 py-1.5"
                >
                  Full board →
                </SoundLink>
              </div>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {rankedActivity.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <div
                    className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl text-xl"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                  >
                    🔍
                  </div>
                  <p className="text-xs text-zinc-500 font-medium">No ranked players found.</p>
                </div>
              ) : (
                rankedActivity.map((p: any, idx: number) => (
                  <SoundLink
                    key={p.user_id}
                    href={`/profile/${p.user_id}`}
                    soundType="click"
                    className="activity-row group flex items-center gap-3 px-4 py-3 transition-all duration-150 hover:bg-purple-500/[0.04]"
                    style={{ animationDelay: `${idx * 40}ms` }}
                  >
                    <span className="w-6 shrink-0 text-center">
                      {idx === 0 ? (
                        <span className="text-base">🥇</span>
                      ) : idx === 1 ? (
                        <span className="text-base">🥈</span>
                      ) : idx === 2 ? (
                        <span className="text-base">🥉</span>
                      ) : (
                        <span className="text-xs font-black text-zinc-600">#{idx + 1}</span>
                      )}
                    </span>
                    <PlayerAvatar name={p.name} avatar={p.avatar_url} size="h-8 w-8" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-zinc-300 truncate group-hover:text-white transition-colors">
                        {p.name}
                      </p>
                      <RankBadge cr={Number(p.cr)} size="sm" />
                    </div>
                    <span className="shrink-0 text-sm font-black text-purple-300 tabular-nums">
                      {Number(p.cr).toLocaleString()}
                    </span>
                  </SoundLink>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {!hasAnything && (
        <div
          className="mt-6 rounded-2xl border border-white/[0.06] p-14 text-center backdrop-blur-sm"
          style={{
            background: "rgba(10,10,28,0.80)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.25), 0 1px 0 rgba(255,255,255,0.04) inset",
          }}
        >
          <div
            className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl text-4xl"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            🌙
          </div>
          <h2 className="text-xl font-black text-zinc-200">Nothing live right now</h2>
          <p className="mt-2 text-sm text-zinc-500 max-w-sm mx-auto leading-relaxed">
            Check back when a scrim is running or players are active.
          </p>
          <SoundLink
            href="/"
            soundType="click"
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/[0.10] bg-white/[0.04] px-6 py-2.5 text-sm font-bold text-zinc-400 hover:bg-white/[0.07] hover:text-zinc-200 transition-all duration-200"
          >
            ← Back to Dashboard
          </SoundLink>
        </div>
      )}
    </Shell>
  );
}
