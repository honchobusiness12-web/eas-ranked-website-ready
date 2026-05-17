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

      {/* ── Hero — full-width immersive ── */}
      <section className="relative overflow-hidden rounded-2xl border border-white/[0.06]" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(79,142,247,0.10) 35%, rgba(168,85,247,0.12) 65%, rgba(6,182,212,0.07) 100%), #07071a" }}>
        {/* Animated background orbs */}
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full opacity-25 blur-3xl animate-float" style={{ background: "radial-gradient(circle, #7C3AED, transparent)" }} />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-72 w-72 rounded-full opacity-20 blur-3xl animate-float-delayed" style={{ background: "radial-gradient(circle, #4F8EF7, transparent)" }} />
        <div className="pointer-events-none absolute left-1/2 top-0 h-48 w-48 -translate-x-1/2 rounded-full opacity-10 blur-2xl animate-float" style={{ background: "radial-gradient(circle, #00D4FF, transparent)", animationDelay: "1.5s" }} />

        {/* Grid overlay */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.025]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />

        <div className="relative px-6 py-10 md:px-12 md:py-16 lg:py-20">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            {/* Left: copy */}
            <div className="flex-1 min-w-0">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-500/25 bg-purple-500/10 px-4 py-1.5 backdrop-blur-sm">
                <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                <p className="text-xs font-bold uppercase tracking-widest text-purple-300">Live Ranked System</p>
              </div>
              <h1 className="text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl md:text-6xl xl:text-7xl">
                <span className="hero-text-gradient">Climb the ranks.</span>
                <br />
                <span className="text-white/85">Own the arena.</span>
              </h1>
              <p className="mt-5 max-w-2xl text-sm text-zinc-400 leading-relaxed md:text-base lg:text-lg">
                Track CR, ranks, placements, MVPs, and live competitive activity — all powered by real-time data.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <SoundLink
                  href="/leaderboard"
                  soundType="success"
                  className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition-all duration-200 hover:scale-[1.03] hover:shadow-[0_8px_32px_rgba(124,58,237,0.55)] active:scale-[0.98]"
                  style={{ background: "linear-gradient(135deg, #7C3AED, #4F8EF7)" }}
                >
                  🏆 Leaderboard
                </SoundLink>
                <SoundLink href="/compare" soundType="success" className="inline-flex items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.05] px-6 py-3 text-sm font-bold text-zinc-300 backdrop-blur-sm transition-all duration-200 hover:border-white/[0.22] hover:bg-white/[0.09] hover:text-white hover:scale-[1.02]">
                  ⚔️ Compare
                </SoundLink>
                <SoundLink href="/players" soundType="success" className="inline-flex items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.05] px-6 py-3 text-sm font-bold text-zinc-300 backdrop-blur-sm transition-all duration-200 hover:border-white/[0.22] hover:bg-white/[0.09] hover:text-white hover:scale-[1.02]">
                  👥 Players
                </SoundLink>
                <SoundLink href="/ranks" soundType="success" className="inline-flex items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.05] px-6 py-3 text-sm font-bold text-zinc-300 backdrop-blur-sm transition-all duration-200 hover:border-white/[0.22] hover:bg-white/[0.09] hover:text-white hover:scale-[1.02]">
                  🏷️ Ranks
                </SoundLink>
              </div>
            </div>

            {/* Right: hero badge + season pill */}
            <div className="hidden lg:flex shrink-0 flex-col items-center gap-4">
              <div className="relative flex h-36 w-36 items-center justify-center rounded-3xl border border-purple-500/25 text-7xl animate-float backdrop-blur-sm" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(79,142,247,0.12))", boxShadow: "0 0 60px rgba(124,58,237,0.25), inset 0 1px 0 rgba(255,255,255,0.08)" }}>
                🏆
                <div className="absolute -inset-px rounded-3xl border border-purple-400/15" />
              </div>
              <div className="text-center">
                <p className="text-sm font-black summer-text-gradient uppercase tracking-widest">EAS Arena</p>
                <p className="text-[11px] text-zinc-600 mt-0.5">Competitive Ranked</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Quick stats — 2-3-6 responsive grid ── */}
      <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat title="Total Players" value={totalPlayers} note="Live database" color="purple" icon="👥" />
        <Stat title="Ranked" value={rankedPlayers} note="Fully ranked" color="lime" icon="🏆" />
        <Stat title="Placements" value={placementPlayers} note="In progress" color="yellow" icon="📋" />
        <Stat title="Avg CR" value={avgCr} note="All players" color="teal" icon="📊" />
        <Stat title="Total Matches" value={totalMatches} note="All time" color="orange" icon="⚔️" />
        <Stat title="Top Kills" value={topKills} note="Record holder" color="coral" icon="💀" />
      </section>

      {/* ── Main content grid: top players + sidebar ── */}
      <section className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_320px]">

        {/* Top players table — full width on mobile, flex on xl */}
        <div className="overflow-hidden rounded-2xl border border-white/[0.06] backdrop-blur-sm" style={{ background: "rgba(9,9,25,0.85)" }}>
          <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4" style={{ background: "linear-gradient(90deg, rgba(124,58,237,0.07), transparent)" }}>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/15 text-base">🏆</div>
              <div>
                <h2 className="text-base font-black tracking-tight">Top Players</h2>
                <p className="text-[11px] text-zinc-600">Ranked by CR</p>
              </div>
            </div>
            <SoundLink
              href="/leaderboard"
              soundType="success"
              className="rounded-xl border border-purple-500/25 bg-purple-500/10 px-4 py-2 text-xs font-bold text-purple-300 transition-all duration-200 hover:border-purple-400/40 hover:bg-purple-500/20 hover:text-purple-200"
            >
              Full Board →
            </SoundLink>
          </div>

          {/* Column headers */}
          <div className="hidden md:grid grid-cols-[52px_1fr_160px_100px] items-center border-b border-white/[0.04] px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-700">
            <span>#</span>
            <span>Player</span>
            <span>Rank</span>
            <span className="text-right">CR</span>
          </div>

          {players.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-3xl mb-3">🔍</p>
              <p className="text-sm text-zinc-500 font-semibold">No players found. Check DATABASE_URL in Railway.</p>
            </div>
          ) : (
            players.slice(0, 10).map((p: any, index: number) => (
              <SoundLink
                href={`/profile/${p.user_id}`}
                key={p.user_id}
                soundType="click"
                className="group grid grid-cols-[52px_1fr] md:grid-cols-[52px_1fr_160px_100px] items-center border-b border-white/[0.04] px-6 py-3.5 transition-all duration-200 hover:bg-purple-500/[0.05] last:border-0"
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
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate group-hover:text-white transition-colors">{p.name || "Unknown Player"}</p>
                    <p className="text-xs text-zinc-600 truncate">{p.username || "—"}</p>
                  </div>
                </div>
                <div className="hidden md:block">
                  <RankBadge cr={Number(p.cr || 0)} size="sm" />
                </div>
                <span className="hidden md:block text-right text-sm font-black text-purple-300 group-hover:text-purple-200 transition-colors">{(p.cr || 0).toLocaleString()}</span>
              </SoundLink>
            ))
          )}
        </div>

        {/* Right sidebar — season + recent activity */}
        <div className="flex flex-col gap-5">
          <SeasonCard season={currentSeason} />

          {/* Recent activity */}
          <div className="overflow-hidden rounded-2xl border border-white/[0.06] backdrop-blur-sm flex-1" style={{ background: "rgba(9,9,25,0.85)" }}>
            <div className="border-b border-white/[0.06] px-5 py-4" style={{ background: "linear-gradient(90deg, rgba(79,142,247,0.07), transparent)" }}>
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/15 text-sm">⚡</div>
                <div>
                  <h3 className="text-sm font-black">Recent Activity</h3>
                  <p className="text-[10px] text-zinc-600">Latest players</p>
                </div>
              </div>
            </div>
            <div className="px-3 py-2">
              {players.slice(0, 7).map((p: any) => (
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

      {/* ── Arena Statistics — full width ── */}
      <section className="mt-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/15 text-lg">📊</div>
          <div>
            <h2 className="text-xl font-black tracking-tight">Arena Statistics</h2>
            <p className="text-xs text-zinc-600">Live performance data</p>
          </div>
        </div>
        <DashboardStats players={players as any} />
      </section>

      {/* ── Premium upsell — full width, eye-catching ── */}
      <section className="mt-5">
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
      <div className="rounded-2xl border border-white/[0.06] p-5 backdrop-blur-sm" style={{ background: "rgba(9,9,25,0.85)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-700/40 text-sm">🏆</div>
            <div>
              <h3 className="text-sm font-black">Ranked Season</h3>
              <p className="text-[10px] text-zinc-600">No active season</p>
            </div>
          </div>
          <span className="rounded-full border border-zinc-700/50 bg-zinc-800/60 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Off Season
          </span>
        </div>
        <p className="text-xs text-zinc-600 leading-relaxed">Stay tuned for the next season announcement.</p>
      </div>
    );
  }

  const statusConfig = {
    active:   { badge: "border-green-500/30 bg-green-500/15 text-green-300",  label: "LIVE",     barColor: "from-green-500 via-emerald-400 to-teal-500", glow: "rgba(74,222,128,0.12)" },
    paused:   { badge: "border-yellow-500/30 bg-yellow-500/15 text-yellow-300", label: "PAUSED",  barColor: "from-yellow-500 to-amber-500",               glow: "rgba(250,204,21,0.10)" },
    ended:    { badge: "border-red-500/30 bg-red-500/15 text-red-300",         label: "ENDED",    barColor: "from-red-600 to-rose-600",                   glow: "rgba(248,113,113,0.10)" },
    upcoming: { badge: "border-blue-500/30 bg-blue-500/15 text-blue-300",      label: "UPCOMING", barColor: "from-blue-500 to-indigo-500",                glow: "rgba(96,165,250,0.10)" },
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
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] p-5 backdrop-blur-sm" style={{ background: "rgba(9,9,25,0.85)" }}>
      {/* Subtle glow */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl" style={{ background: `radial-gradient(ellipse at top right, ${cfg.glow}, transparent 60%)` }} />
      <div className="relative">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/15 text-sm">🏆</div>
            <h3 className="text-sm font-black truncate">{season.name}</h3>
          </div>
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
            <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
              <div
                className={`h-full rounded-full bg-gradient-to-r ${cfg.barColor} transition-all duration-700`}
                style={{ width: `${progressPct}%`, boxShadow: "0 0 8px rgba(168,85,247,0.4)" }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat card — redesigned with icon
// ---------------------------------------------------------------------------

function Stat({
  title,
  value,
  note,
  color = "coral",
  icon,
}: {
  title: string;
  value: number;
  note: string;
  color?: "coral" | "lime" | "yellow" | "teal" | "orange" | "purple" | "green" | "blue" | "red";
  icon?: string;
}) {
  const colorMap: Record<string, { text: string; glow: string; accent: string; iconBg: string }> = {
    coral:  { text: "text-red-400",    glow: "rgba(248,113,113,0.12)",  accent: "rgba(248,113,113,0.7)",  iconBg: "rgba(248,113,113,0.12)" },
    lime:   { text: "text-green-400",  glow: "rgba(74,222,128,0.12)",   accent: "rgba(74,222,128,0.7)",   iconBg: "rgba(74,222,128,0.12)" },
    yellow: { text: "text-yellow-400", glow: "rgba(250,204,21,0.12)",   accent: "rgba(250,204,21,0.7)",   iconBg: "rgba(250,204,21,0.12)" },
    teal:   { text: "text-cyan-400",   glow: "rgba(34,211,238,0.12)",   accent: "rgba(34,211,238,0.7)",   iconBg: "rgba(34,211,238,0.12)" },
    orange: { text: "text-orange-400", glow: "rgba(251,146,60,0.12)",   accent: "rgba(251,146,60,0.7)",   iconBg: "rgba(251,146,60,0.12)" },
    purple: { text: "text-purple-400", glow: "rgba(192,132,252,0.12)",  accent: "rgba(192,132,252,0.7)",  iconBg: "rgba(192,132,252,0.12)" },
    green:  { text: "text-green-400",  glow: "rgba(74,222,128,0.12)",   accent: "rgba(74,222,128,0.7)",   iconBg: "rgba(74,222,128,0.12)" },
    blue:   { text: "text-blue-400",   glow: "rgba(96,165,250,0.12)",   accent: "rgba(96,165,250,0.7)",   iconBg: "rgba(96,165,250,0.12)" },
    red:    { text: "text-red-400",    glow: "rgba(248,113,113,0.12)",  accent: "rgba(248,113,113,0.7)",  iconBg: "rgba(248,113,113,0.12)" },
  };
  const cm = colorMap[color] ?? colorMap.coral;

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-white/[0.06] p-4 transition-all duration-200 hover:border-white/[0.10] hover:scale-[1.02] hover:-translate-y-0.5 backdrop-blur-sm"
      style={{ background: "rgba(9,9,25,0.85)" }}
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl opacity-50 transition-opacity duration-200 group-hover:opacity-100" style={{ background: cm.accent }} />
      {/* Hover glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" style={{ background: `radial-gradient(ellipse at top, ${cm.glow}, transparent 70%)` }} />

      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{title}</p>
          <p className={`mt-1.5 text-2xl font-black tracking-tight ${cm.text}`} style={{ letterSpacing: "-0.03em" }}>{value.toLocaleString()}</p>
          <p className="mt-0.5 text-[10px] text-zinc-700">{note}</p>
        </div>
        {icon && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-base" style={{ background: cm.iconBg }}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
