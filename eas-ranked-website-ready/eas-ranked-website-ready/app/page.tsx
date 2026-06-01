import Shell from "@/components/ServerShell";
import PlayerAvatar from "@/components/PlayerAvatar";
import SoundLink from "@/components/SoundLink";
import RankBadge from "@/components/RankBadge";
import DashboardStats from "@/components/DashboardStats";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import ActivityFeed from "@/components/ActivityFeed";
import { LiveScrimBadge } from "@/components/LiveScrimBadge";
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

      {/* Live scrim indicator */}
      <LiveScrimBadge />

      {/* ── Hero ── */}
      <section className="hero-section mb-6">
        {/* Animated background orbs */}
        <div
          className="glow-orb -right-32 -top-32 h-96 w-96 opacity-20 animate-float"
          style={{ background: "radial-gradient(circle, #7C3AED, transparent)" }}
        />
        <div
          className="glow-orb -left-20 -bottom-20 h-72 w-72 opacity-15 animate-float-delayed"
          style={{ background: "radial-gradient(circle, #4F8EF7, transparent)" }}
        />
        <div
          className="glow-orb left-1/2 top-0 h-48 w-48 -translate-x-1/2 opacity-10 animate-float"
          style={{ background: "radial-gradient(circle, #00D4FF, transparent)", animationDelay: "1.5s" }}
        />

        {/* Subtle grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative px-6 py-10 md:px-12 md:py-16 lg:py-20">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            {/* Left: copy */}
            <div className="flex-1 min-w-0">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-purple-500/25 bg-purple-500/10 px-4 py-1.5 backdrop-blur-sm animate-fadeInUp">
                <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                <p className="text-xs font-bold uppercase tracking-widest text-purple-300">Live Ranked System</p>
              </div>
              <h1 className="text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl md:text-6xl xl:text-7xl animate-fadeInUp delay-60">
                <span className="hero-text-gradient">Climb the ranks.</span>
                <br />
                <span className="text-white/85">Own the arena.</span>
              </h1>
              <p className="mt-5 max-w-2xl text-sm text-zinc-400 leading-relaxed md:text-base lg:text-lg animate-fadeInUp delay-120">
                Track CR, ranks, placements, MVPs, and live competitive activity — all powered by real-time data.
              </p>
              <div className="mt-8 flex flex-wrap gap-3 animate-fadeInUp delay-180">
                <SoundLink
                  href="/leaderboard"
                  soundType="success"
                  className="btn-press inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white hover:shadow-[0_8px_32px_rgba(124,58,237,0.55)]"
                  style={{ background: "linear-gradient(135deg, #7C3AED, #4F8EF7)" }}
                >
                  🏆 Leaderboard
                </SoundLink>
                <SoundLink
                  href="/compare"
                  soundType="success"
                  className="btn-press inline-flex items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.05] px-6 py-3 text-sm font-bold text-zinc-300 backdrop-blur-sm hover:border-white/[0.22] hover:bg-white/[0.09] hover:text-white"
                >
                  ⚔️ Compare
                </SoundLink>
                <SoundLink
                  href="/players"
                  soundType="success"
                  className="btn-press inline-flex items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.05] px-6 py-3 text-sm font-bold text-zinc-300 backdrop-blur-sm hover:border-white/[0.22] hover:bg-white/[0.09] hover:text-white"
                >
                  👥 Players
                </SoundLink>
                <SoundLink
                  href="/ranks"
                  soundType="success"
                  className="btn-press inline-flex items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.05] px-6 py-3 text-sm font-bold text-zinc-300 backdrop-blur-sm hover:border-white/[0.22] hover:bg-white/[0.09] hover:text-white"
                >
                  🏷️ Ranks
                </SoundLink>
              </div>
            </div>

            {/* Right: hero badge */}
            <div className="hidden lg:flex shrink-0 flex-col items-center gap-4">
              <div
                className="relative flex h-36 w-36 items-center justify-center rounded-3xl text-7xl animate-float backdrop-blur-sm"
                style={{
                  background: "linear-gradient(135deg, rgba(124,58,237,0.22), rgba(79,142,247,0.14))",
                  border: "1px solid rgba(168,85,247,0.28)",
                  boxShadow: "0 0 60px rgba(124,58,237,0.28), inset 0 1px 0 rgba(255,255,255,0.08)",
                }}
              >
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

      {/* ── Key metrics grid ── */}
      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard title="Total Players" value={totalPlayers} note="Live database" color="purple" icon="👥" delay={0} />
        <MetricCard title="Ranked"         value={rankedPlayers}    note="Fully ranked"  color="lime"   icon="🏆" delay={60} />
        <MetricCard title="Placements"     value={placementPlayers} note="In progress"   color="yellow" icon="📋" delay={120} />
        <MetricCard title="Avg CR"         value={avgCr}            note="All players"   color="teal"   icon="📊" delay={180} />
        <MetricCard title="Total Matches"  value={totalMatches}     note="All time"      color="orange" icon="⚔️" delay={240} />
        <MetricCard title="Top Kills"      value={topKills}         note="Record holder" color="coral"  icon="💀" delay={300} />
      </section>

      {/* ── Main content grid ── */}
      <section className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_320px]">

        {/* Top players table */}
        <div
          className="overflow-hidden rounded-2xl border border-white/[0.07] backdrop-blur-sm"
          style={{
            background: "rgba(10,10,28,0.85)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.04) inset",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4"
            style={{ background: "linear-gradient(90deg, rgba(124,58,237,0.08), transparent)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl text-base"
                style={{ background: "rgba(168,85,247,0.14)", border: "1px solid rgba(168,85,247,0.22)" }}
              >
                🏆
              </div>
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
            <div className="px-6 py-14 text-center">
              <div
                className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                🔍
              </div>
              <p className="text-sm text-zinc-400 font-semibold">No players found</p>
              <p className="mt-1 text-xs text-zinc-600">Check DATABASE_URL in Railway.</p>
            </div>
          ) : (
            players.slice(0, 10).map((p: any, index: number) => (
              <SoundLink
                href={`/profile/${p.user_id}`}
                key={p.user_id}
                soundType="click"
                className="table-row-stagger group grid grid-cols-[52px_1fr] md:grid-cols-[52px_1fr_160px_100px] items-center border-b border-white/[0.04] px-6 py-3.5 transition-all duration-150 hover:bg-purple-500/[0.04] last:border-0"
              >
                <span className="text-sm font-black">
                  {index === 0 ? (
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-base" style={{ background: "rgba(234,179,8,0.15)" }}>🥇</span>
                  ) : index === 1 ? (
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-base" style={{ background: "rgba(148,163,184,0.12)" }}>🥈</span>
                  ) : index === 2 ? (
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-base" style={{ background: "rgba(180,83,9,0.15)" }}>🥉</span>
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
                <span className="hidden md:block text-right text-sm font-black text-purple-300 group-hover:text-purple-200 transition-colors">
                  {(p.cr || 0).toLocaleString()}
                </span>
              </SoundLink>
            ))
          )}
        </div>

        {/* Right sidebar */}
        <div className="flex flex-col gap-5">
          <SeasonCard season={currentSeason} />

          {/* Activity Feed */}
          <div
            className="overflow-hidden rounded-2xl border border-white/[0.07] backdrop-blur-sm flex-1"
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
                  <p className="text-[10px] text-zinc-600">Recent match events</p>
                </div>
              </div>
            </div>
            <div className="px-3 py-2">
              <ActivityFeed players={players as any} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Arena Statistics ── */}
      <section className="mb-6">
        <div className="flex items-center gap-3 mb-5">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-lg"
            style={{ background: "rgba(6,182,212,0.14)", border: "1px solid rgba(6,182,212,0.22)" }}
          >
            📊
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight">Arena Statistics</h2>
            <p className="text-xs text-zinc-600">Live performance data across all players</p>
          </div>
        </div>
        <DashboardStats players={players as any} />
      </section>
    </Shell>
  );
}

// ---------------------------------------------------------------------------
// Season card
// ---------------------------------------------------------------------------

function SeasonCard({ season }: { season: import("@/lib/seasons").Season | null }) {
  if (!season) {
    return (
      <div
        className="rounded-2xl border border-white/[0.07] p-5 backdrop-blur-sm"
        style={{
          background: "rgba(10,10,28,0.85)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.04) inset",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              🏆
            </div>
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
    active:   { badge: "border-green-500/30 bg-green-500/15 text-green-300",   label: "LIVE",     barColor: "from-green-500 via-emerald-400 to-teal-500",  glow: "rgba(34,197,94,0.10)" },
    paused:   { badge: "border-yellow-500/30 bg-yellow-500/15 text-yellow-300", label: "PAUSED",   barColor: "from-yellow-500 to-amber-500",                 glow: "rgba(234,179,8,0.10)" },
    ended:    { badge: "border-red-500/30 bg-red-500/15 text-red-300",          label: "ENDED",    barColor: "from-red-600 to-rose-600",                     glow: "rgba(239,68,68,0.10)" },
    upcoming: { badge: "border-blue-500/30 bg-blue-500/15 text-blue-300",       label: "UPCOMING", barColor: "from-blue-500 to-indigo-500",                  glow: "rgba(79,142,247,0.10)" },
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
    <div
      className="relative overflow-hidden rounded-2xl border border-white/[0.07] p-5 backdrop-blur-sm card-hover-lift animate-fadeInUp"
      style={{
        background: "rgba(10,10,28,0.85)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.04) inset",
      }}
    >
      {/* Subtle glow */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{ background: `radial-gradient(ellipse at top right, ${cfg.glow}, transparent 60%)` }}
      />
      <div className="relative">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
              style={{ background: "rgba(168,85,247,0.14)", border: "1px solid rgba(168,85,247,0.22)" }}
            >
              🏆
            </div>
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
// Metric card — compact stat with icon and accent
// ---------------------------------------------------------------------------

function MetricCard({
  title,
  value,
  note,
  color = "coral",
  icon,
  delay = 0,
}: {
  title: string;
  value: number;
  note: string;
  color?: "coral" | "lime" | "yellow" | "teal" | "orange" | "purple" | "green" | "blue" | "red";
  icon?: string;
  delay?: number;
}) {
  const colorMap: Record<string, { text: string; glow: string; accent: string; iconBg: string; border: string; from: string; to: string }> = {
    coral:  { text: "text-rose-300",   glow: "rgba(244,63,94,0.09)",   accent: "rgba(244,63,94,0.7)",   iconBg: "rgba(244,63,94,0.13)",   border: "rgba(244,63,94,0.18)",   from: "#E11D48", to: "#FB7185" },
    lime:   { text: "text-lime-300",   glow: "rgba(132,204,22,0.09)",  accent: "rgba(132,204,22,0.7)",  iconBg: "rgba(132,204,22,0.13)",  border: "rgba(132,204,22,0.18)",  from: "#65A30D", to: "#A3E635" },
    yellow: { text: "text-yellow-300", glow: "rgba(234,179,8,0.09)",   accent: "rgba(234,179,8,0.7)",   iconBg: "rgba(234,179,8,0.13)",   border: "rgba(234,179,8,0.18)",   from: "#CA8A04", to: "#FDE047" },
    teal:   { text: "text-cyan-300",   glow: "rgba(6,182,212,0.09)",   accent: "rgba(6,182,212,0.7)",   iconBg: "rgba(6,182,212,0.13)",   border: "rgba(6,182,212,0.18)",   from: "#0891B2", to: "#22D3EE" },
    orange: { text: "text-orange-300", glow: "rgba(249,115,22,0.09)",  accent: "rgba(249,115,22,0.7)",  iconBg: "rgba(249,115,22,0.13)",  border: "rgba(249,115,22,0.18)",  from: "#EA580C", to: "#FB923C" },
    purple: { text: "text-purple-300", glow: "rgba(168,85,247,0.09)",  accent: "rgba(168,85,247,0.7)",  iconBg: "rgba(168,85,247,0.13)",  border: "rgba(168,85,247,0.18)",  from: "#7C3AED", to: "#A855F7" },
    green:  { text: "text-green-300",  glow: "rgba(34,197,94,0.09)",   accent: "rgba(34,197,94,0.7)",   iconBg: "rgba(34,197,94,0.13)",   border: "rgba(34,197,94,0.18)",   from: "#16A34A", to: "#4ADE80" },
    blue:   { text: "text-blue-300",   glow: "rgba(79,142,247,0.09)",  accent: "rgba(79,142,247,0.7)",  iconBg: "rgba(79,142,247,0.13)",  border: "rgba(79,142,247,0.18)",  from: "#3B82F6", to: "#60A5FA" },
    red:    { text: "text-red-300",    glow: "rgba(239,68,68,0.09)",   accent: "rgba(239,68,68,0.7)",   iconBg: "rgba(239,68,68,0.13)",   border: "rgba(239,68,68,0.18)",   from: "#DC2626", to: "#F87171" },
  };
  const cm = colorMap[color] ?? colorMap.coral;

  return (
    <div
      className="group relative overflow-hidden rounded-2xl p-5 card-hover-lift animate-fadeInUp backdrop-blur-sm"
      style={{
        background: "rgba(10,10,28,0.88)",
        border: `1px solid ${cm.border}`,
        animationDelay: `${delay}ms`,
      }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl opacity-60 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `linear-gradient(90deg, ${cm.from}, ${cm.to}, transparent)` }}
      />
      {/* Hover glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none"
        style={{ background: `radial-gradient(ellipse at top left, ${cm.glow}, transparent 65%)` }}
      />

      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none">{title}</p>
          <p
            className={`mt-2.5 text-2xl font-black stat-counter ${cm.text}`}
            style={{ letterSpacing: "-0.04em", lineHeight: 1.1, animationDelay: `${delay + 100}ms` }}
          >
            {value.toLocaleString()}
          </p>
          <p className="mt-1.5 text-[10px] text-zinc-600">{note}</p>
        </div>
        {icon && (
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-3"
            style={{ background: cm.iconBg, border: `1px solid ${cm.border}` }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
