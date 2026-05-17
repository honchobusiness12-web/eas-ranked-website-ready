import Shell from "@/components/ServerShell";
import PlayerAvatar from "@/components/PlayerAvatar";
import SoundLink from "@/components/SoundLink";
import RankBadge from "@/components/RankBadge";
import DashboardStats from "@/components/DashboardStats";
import PremiumUpsell from "@/components/PremiumUpsell";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import { syncPlayersFromDB } from "@/lib/cache";
import { getCurrentSeason, type Season } from "@/lib/seasons";

export const revalidate = 30;

async function getPlayers() {
  return syncPlayersFromDB();
}

async function fetchCurrentSeason(): Promise<Season | null> {
  try {
    return await getCurrentSeason();
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const [players, currentSeason] = await Promise.all([
    getPlayers(),
    fetchCurrentSeason(),
  ]);

  const totalPlayers = players.length;
  const rankedPlayers = players.filter((p: any) => p.ranked).length;
  const placementPlayers = players.filter((p: any) => p.registered && !p.ranked).length;
  const totalMatches = players.reduce((sum: number, p: any) => sum + Number(p.matches || 0), 0);
  const avgCr = players.length
    ? Math.round(players.reduce((sum: number, p: any) => sum + Number(p.cr || 0), 0) / players.length)
    : 0;
  const topKills = players.reduce((max: number, p: any) => Math.max(max, Number(p.kills || 0)), 0);

  return (
    <Shell>
      {/* Live announcements */}
      <AnnouncementBanner />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden rounded-3xl border border-purple-500/10 px-6 py-10 md:px-10 md:py-14" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(79,142,247,0.08) 40%, rgba(168,85,247,0.10) 70%, rgba(6,182,212,0.06) 100%), #07071a" }}>
        {/* Floating orbs */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full opacity-20 blur-3xl animate-float" style={{ background: "radial-gradient(circle, #7C3AED, transparent)" }} />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-60 w-60 rounded-full opacity-15 blur-3xl animate-float-delayed" style={{ background: "radial-gradient(circle, #4F8EF7, transparent)" }} />
        <div className="pointer-events-none absolute right-1/3 top-1/2 h-40 w-40 rounded-full opacity-10 blur-2xl animate-float" style={{ background: "radial-gradient(circle, #00D4FF, transparent)", animationDelay: "1s" }} />

        {/* Subtle grid overlay */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

        <div className="relative flex items-center justify-between gap-8">
          <div className="min-w-0 flex-1">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" />
              <p className="text-xs font-bold uppercase tracking-widest text-purple-300">Live Ranked System</p>
            </div>
            <h1 className="text-4xl font-black leading-[1.1] tracking-tight md:text-6xl">
              <span className="hero-text-gradient">Climb the ranks.</span>
              <br />
              <span className="text-white/90">Own the arena.</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm text-zinc-400 leading-relaxed md:text-base">
              Track CR, ranks, placements, MVPs, and live competitive activity — powered by PostgreSQL.
            </p>
            <div className="mt-7 flex flex-wrap gap-2.5">
              <SoundLink
                href="/leaderboard"
                soundType="success"
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-glow-purple transition-all duration-200 hover:scale-[1.03] hover:shadow-[0_8px_30px_rgba(124,58,237,0.55)] active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg, #7C3AED, #4F8EF7)" }}
              >
                <span className="relative z-10">🏆 Leaderboard</span>
              </SoundLink>
              <SoundLink href="/compare" soundType="success" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-5 py-2.5 text-sm font-bold text-zinc-300 backdrop-blur-sm transition-all duration-200 hover:border-white/20 hover:bg-white/[0.09] hover:text-white hover:scale-[1.02]">
                ⚔️ Compare
              </SoundLink>
              <SoundLink href="/players" soundType="success" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-5 py-2.5 text-sm font-bold text-zinc-300 backdrop-blur-sm transition-all duration-200 hover:border-white/20 hover:bg-white/[0.09] hover:text-white hover:scale-[1.02]">
                👥 Players
              </SoundLink>
              <SoundLink href="/ranks" soundType="success" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-5 py-2.5 text-sm font-bold text-zinc-300 backdrop-blur-sm transition-all duration-200 hover:border-white/20 hover:bg-white/[0.09] hover:text-white hover:scale-[1.02]">
                🏷️ Ranks
              </SoundLink>
            </div>
          </div>
          {/* Hero badge */}
          <div className="hidden lg:flex shrink-0 flex-col items-center gap-3">
            <div className="relative flex h-28 w-28 items-center justify-center rounded-3xl border border-purple-500/20 bg-purple-500/10 text-6xl shadow-glow-purple animate-float backdrop-blur-sm">
              🏆
              <div className="absolute -inset-px rounded-3xl border border-purple-400/20" />
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-purple-300 uppercase tracking-widest">EAS Arena</p>
              <p className="text-[10px] text-zinc-600">Season Active</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Quick stats ── */}
      <section className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Stat title="Total Players" value={totalPlayers} note="Live database" color="purple" />
        <Stat title="Ranked" value={rankedPlayers} note="Fully ranked" color="lime" />
        <Stat title="Placements" value={placementPlayers} note="7 matches to rank" color="yellow" />
        <Stat title="Avg CR" value={avgCr} note="Across all players" color="teal" />
        <Stat title="Total Matches" value={totalMatches} note="All time" color="orange" />
        <Stat title="Top Kills" value={topKills} note="Single player record" color="coral" />
      </section>

      {/* ── Top players + sidebar ── */}
      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">
        {/* Top players table */}
        <div className="overflow-hidden rounded-2xl border border-white/[0.06] backdrop-blur-sm" style={{ background: "rgba(11,11,31,0.8)" }}>
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4" style={{ background: "linear-gradient(90deg, rgba(124,58,237,0.06), transparent)" }}>
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/15 text-sm">🏆</div>
              <h2 className="text-base font-black tracking-tight">Top Players</h2>
            </div>
            <SoundLink
              href="/leaderboard"
              soundType="success"
              className="rounded-lg border border-purple-500/25 bg-purple-500/10 px-3 py-1.5 text-xs font-bold text-purple-300 transition-all duration-200 hover:border-purple-400/40 hover:bg-purple-500/20 hover:text-purple-200"
            >
              Full Board →
            </SoundLink>
          </div>

          {players.length === 0 ? (
            <p className="px-5 py-8 text-sm text-zinc-500">No players found. Check DATABASE_URL in Railway.</p>
          ) : (
            players.slice(0, 10).map((p: any, index: number) => (
              <SoundLink
                href={`/profile/${p.user_id}`}
                key={p.user_id}
                soundType="click"
                className="group grid grid-cols-[48px_1fr_auto_88px] items-center border-b border-white/[0.04] px-5 py-3.5 transition-all duration-200 hover:bg-purple-500/[0.04] last:border-0"
              >
                <span className="text-sm font-black">
                  {index === 0 ? (
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-yellow-500/15 text-base">🥇</span>
                  ) : index === 1 ? (
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-400/10 text-base">🥈</span>
                  ) : index === 2 ? (
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-orange-700/15 text-base">🥉</span>
                  ) : (
                    <span className="text-xs font-black text-zinc-600 pl-1">#{index + 1}</span>
                  )}
                </span>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <PlayerAvatar name={p.name} avatar={p.avatar_url} size="h-9 w-9" />
                    {index < 3 && <div className="absolute -inset-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: index === 0 ? "rgba(234,179,8,0.2)" : index === 1 ? "rgba(161,161,170,0.15)" : "rgba(194,120,60,0.15)", filter: "blur(4px)" }} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate group-hover:text-white transition-colors">{p.name || "Unknown Player"}</p>
                    <p className="text-xs text-zinc-600 truncate">{p.username || "—"}</p>
                  </div>
                </div>
                <RankBadge cr={Number(p.cr || 0)} size="sm" />
                <span className="text-right text-sm font-black text-purple-300 group-hover:text-purple-200 transition-colors">{(p.cr || 0).toLocaleString()}</span>
              </SoundLink>
            ))
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          <SeasonCard season={currentSeason} />

          {/* Recent activity */}
          <div className="overflow-hidden rounded-2xl border border-white/[0.06] backdrop-blur-sm" style={{ background: "rgba(11,11,31,0.8)" }}>
            <div className="border-b border-white/[0.06] px-5 py-4" style={{ background: "linear-gradient(90deg, rgba(79,142,247,0.06), transparent)" }}>
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/15 text-xs">⚡</div>
                <h3 className="text-sm font-black">Recent Activity</h3>
              </div>
            </div>
            <div className="px-3 py-2">
              {players.slice(0, 6).map((p: any) => (
                <SoundLink
                  href={`/profile/${p.user_id}`}
                  key={p.user_id}
                  soundType="click"
                  className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-all duration-200 hover:bg-white/[0.04]"
                >
                  <PlayerAvatar name={p.name} avatar={p.avatar_url} size="h-8 w-8" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate group-hover:text-white transition-colors">{p.name || "Unknown Player"}</p>
                    <p className="text-xs text-zinc-600">{(p.cr || 0).toLocaleString()} CR · {p.wins || 0}W</p>
                  </div>
                  <RankBadge cr={Number(p.cr || 0)} size="sm" showLabel={false} />
                </SoundLink>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Arena Statistics ── */}
      <section className="mt-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500/15 text-base">📊</div>
          <h2 className="text-lg font-black tracking-tight">Arena Statistics</h2>
        </div>
        <DashboardStats players={players as any} />
      </section>

      {/* ── Premium upsell ── */}
      <section className="mt-4">
        <PremiumUpsell />
      </section>
    </Shell>
  );
}

// ---------------------------------------------------------------------------
// Season card — shows live season data from DB
// ---------------------------------------------------------------------------

function SeasonCard({ season }: { season: import("@/lib/seasons").Season | null }) {
  if (!season) {
    return (
      <div className="rounded-2xl border border-white/[0.06] p-5 backdrop-blur-sm" style={{ background: "rgba(11,11,31,0.8)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-700/40 text-xs">🏆</div>
            <h3 className="text-sm font-black">Ranked Season</h3>
          </div>
          <span className="rounded-full border border-zinc-700/50 bg-zinc-800/60 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Off Season
          </span>
        </div>
        <p className="text-xs text-zinc-500 leading-relaxed">No ranked season is currently running. Stay tuned for the next announcement.</p>
      </div>
    );
  }

  const statusConfig = {
    active:   { badge: "border-green-500/30 bg-green-500/15 text-green-300",  label: "LIVE",     barColor: "from-green-500 via-emerald-400 to-teal-500" },
    paused:   { badge: "border-yellow-500/30 bg-yellow-500/15 text-yellow-300", label: "PAUSED",  barColor: "from-yellow-500 to-amber-500" },
    ended:    { badge: "border-red-500/30 bg-red-500/15 text-red-300",         label: "ENDED",    barColor: "from-red-600 to-rose-600" },
    upcoming: { badge: "border-blue-500/30 bg-blue-500/15 text-blue-300",      label: "UPCOMING", barColor: "from-blue-500 to-indigo-500" },
  };
  const cfg = statusConfig[season.status] ?? statusConfig.upcoming;

  let daysNote = "";
  if (season.end_date && season.status === "active") {
    const daysLeft = Math.max(0, Math.round((new Date(season.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    daysNote = `${daysLeft}d left`;
  }

  let progressPct = 0;
  if (season.start_date && season.end_date) {
    const start = new Date(season.start_date).getTime();
    const end = new Date(season.end_date).getTime();
    const now = Date.now();
    if (end > start) {
      progressPct = Math.round((Math.max(0, Math.min(now - start, end - start)) / (end - start)) * 100);
    }
  }

  return (
    <div className="rounded-2xl border border-white/[0.06] p-5 backdrop-blur-sm" style={{ background: "rgba(11,11,31,0.8)" }}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="text-sm font-black truncate">{season.name}</h3>
        <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cfg.badge}`}>
          {cfg.label}
        </span>
      </div>
      {season.description && (
        <p className="text-xs text-zinc-500 mb-3 line-clamp-2 leading-relaxed">{season.description}</p>
      )}
      {season.start_date && season.end_date && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-zinc-600 mb-2">
            <span>{progressPct}% complete</span>
            {daysNote && <span className="font-semibold text-purple-400">⏳ {daysNote}</span>}
          </div>
          <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
            <div
              className={`h-full rounded-full bg-gradient-to-r ${cfg.barColor} transition-all duration-700 shadow-sm`}
              style={{ width: `${progressPct}%`, boxShadow: "0 0 8px rgba(168,85,247,0.4)" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function Stat({
  title,
  value,
  note,
  color = "coral",
}: {
  title: string;
  value: number;
  note: string;
  color?: "coral" | "lime" | "yellow" | "teal" | "orange" | "purple" | "green" | "blue" | "red";
}) {
  const colorMap: Record<string, { text: string; glow: string; accent: string }> = {
    coral:  { text: "text-red-400",    glow: "rgba(248,113,113,0.15)",  accent: "rgba(248,113,113,0.6)" },
    lime:   { text: "text-green-400",  glow: "rgba(74,222,128,0.15)",   accent: "rgba(74,222,128,0.6)" },
    yellow: { text: "text-yellow-400", glow: "rgba(250,204,21,0.15)",   accent: "rgba(250,204,21,0.6)" },
    teal:   { text: "text-cyan-400",   glow: "rgba(34,211,238,0.15)",   accent: "rgba(34,211,238,0.6)" },
    orange: { text: "text-orange-400", glow: "rgba(251,146,60,0.15)",   accent: "rgba(251,146,60,0.6)" },
    purple: { text: "text-purple-400", glow: "rgba(192,132,252,0.15)",  accent: "rgba(192,132,252,0.6)" },
    green:  { text: "text-green-400",  glow: "rgba(74,222,128,0.15)",   accent: "rgba(74,222,128,0.6)" },
    blue:   { text: "text-blue-400",   glow: "rgba(96,165,250,0.15)",   accent: "rgba(96,165,250,0.6)" },
    red:    { text: "text-red-400",    glow: "rgba(248,113,113,0.15)",  accent: "rgba(248,113,113,0.6)" },
  };
  const cm = colorMap[color] ?? colorMap.coral;

  return (
    <div
      className="group relative overflow-hidden rounded-xl border border-white/[0.06] px-4 py-4 transition-all duration-200 hover:border-white/[0.10] hover:scale-[1.02] hover:-translate-y-0.5 backdrop-blur-sm"
      style={{ background: "rgba(11,11,31,0.8)" }}
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-xl opacity-60 transition-opacity duration-200 group-hover:opacity-100" style={{ background: cm.accent }} />
      {/* Subtle glow on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" style={{ background: `radial-gradient(ellipse at top, ${cm.glow}, transparent 70%)` }} />

      <div className="relative">
        <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">{title}</p>
        <p className={`mt-1.5 text-2xl font-black tracking-tight ${cm.text}`} style={{ letterSpacing: "-0.03em" }}>{value.toLocaleString()}</p>
        <p className="mt-0.5 text-[11px] text-zinc-600">{note}</p>
      </div>
    </div>
  );
}
