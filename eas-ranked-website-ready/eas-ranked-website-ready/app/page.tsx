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

      {/* ── Premium Hero Section ── */}
      <section className="hero-section-v2 mb-7 gpu-accelerate">
        {/* Animated gradient overlay */}
        <div className="pointer-events-none absolute inset-0 rounded-[1.5rem]" style={{
          background: "linear-gradient(135deg, rgba(124,58,237,0.22) 0%, rgba(79,142,247,0.12) 35%, rgba(168,85,247,0.16) 65%, rgba(6,182,212,0.08) 100%)",
          backgroundSize: "300% 300%",
        }} />

        {/* Floating orbs */}
        <div className="glow-orb animate-orb pointer-events-none"
          style={{ right: "-80px", top: "-80px", width: "380px", height: "380px", opacity: 0.22,
            background: "radial-gradient(circle, rgba(124,58,237,0.8), transparent 70%)" }} />
        <div className="glow-orb animate-orb-2 pointer-events-none"
          style={{ left: "-60px", bottom: "-60px", width: "300px", height: "300px", opacity: 0.16,
            background: "radial-gradient(circle, rgba(79,142,247,0.8), transparent 70%)" }} />
        <div className="glow-orb animate-orb-3 pointer-events-none"
          style={{ left: "45%", top: "-40px", width: "200px", height: "200px", opacity: 0.12,
            background: "radial-gradient(circle, rgba(6,182,212,0.8), transparent 70%)" }} />

        {/* Floating particles */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[1.5rem]">
          {[
            { cls: "animate-particle",   top: "15%", left: "8%",  size: 4, color: "rgba(168,85,247,0.6)" },
            { cls: "animate-particle-2", top: "70%", left: "15%", size: 3, color: "rgba(79,142,247,0.5)" },
            { cls: "animate-particle-3", top: "25%", left: "85%", size: 5, color: "rgba(6,182,212,0.5)" },
            { cls: "animate-particle-4", top: "60%", left: "75%", size: 3, color: "rgba(168,85,247,0.4)" },
            { cls: "animate-particle-5", top: "40%", left: "50%", size: 4, color: "rgba(255,159,67,0.4)" },
          ].map((p, i) => (
            <div key={i} className={`absolute rounded-full ${p.cls}`}
              style={{ top: p.top, left: p.left, width: p.size, height: p.size, background: p.color }} />
          ))}
        </div>

        {/* Subtle grid */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.025] rounded-[1.5rem]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }} />

        {/* Accent lines */}
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-[1px] rounded-t-[1.5rem]"
          style={{ background: "linear-gradient(90deg, transparent, rgba(168,85,247,0.5), rgba(79,142,247,0.4), transparent)" }} />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[1px] rounded-b-[1.5rem]"
          style={{ background: "linear-gradient(90deg, transparent, rgba(79,142,247,0.2), transparent)" }} />

        <div className="relative px-6 py-10 md:px-12 md:py-16 lg:py-20">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            {/* Left: copy */}
            <div className="flex-1 min-w-0">
              {/* Live badge */}
              <div className="mb-5 inline-flex items-center gap-2.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 backdrop-blur-sm animate-hero-reveal"
                style={{ boxShadow: "0 0 20px rgba(168,85,247,0.1)" }}>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
                </span>
                <p className="text-xs font-bold uppercase tracking-widest text-purple-300">Live Ranked System</p>
              </div>

              {/* Headline */}
              <h1 className="text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl md:text-6xl xl:text-7xl">
                <span className="block animate-hero-reveal-2" style={{ animationDelay: "0.08s" }}>
                  <span className="hero-text-gradient">Climb the ranks.</span>
                </span>
                <span className="block text-white/85 animate-hero-reveal-3" style={{ animationDelay: "0.18s" }}>
                  Own the arena.
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-sm text-zinc-400 leading-relaxed md:text-base lg:text-lg animate-hero-reveal-4"
                style={{ animationDelay: "0.28s" }}>
                Track CR, ranks, placements, MVPs, and live competitive activity — all powered by real-time data.
              </p>

              {/* CTA buttons */}
              <div className="mt-8 flex flex-wrap gap-3 animate-fadeInUp delay-300">
                <SoundLink
                  href="/leaderboard"
                  soundType="success"
                  className="btn-premium-primary press-feedback"
                >
                  🏆 Leaderboard
                </SoundLink>
                <SoundLink
                  href="/compare"
                  soundType="success"
                  className="btn-press press-feedback inline-flex items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.05] px-6 py-3 text-sm font-bold text-zinc-300 backdrop-blur-sm transition-all duration-200 hover:border-purple-500/30 hover:bg-purple-500/[0.08] hover:text-white hover:shadow-[0_4px_20px_rgba(168,85,247,0.15)]"
                >
                  ⚔️ Compare
                </SoundLink>
                <SoundLink
                  href="/players"
                  soundType="success"
                  className="btn-press press-feedback inline-flex items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.05] px-6 py-3 text-sm font-bold text-zinc-300 backdrop-blur-sm transition-all duration-200 hover:border-blue-500/30 hover:bg-blue-500/[0.08] hover:text-white hover:shadow-[0_4px_20px_rgba(79,142,247,0.15)]"
                >
                  👥 Players
                </SoundLink>
                <SoundLink
                  href="/ranks"
                  soundType="success"
                  className="btn-press press-feedback inline-flex items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.05] px-6 py-3 text-sm font-bold text-zinc-300 backdrop-blur-sm transition-all duration-200 hover:border-white/[0.22] hover:bg-white/[0.09] hover:text-white"
                >
                  🏷️ Ranks
                </SoundLink>
              </div>
            </div>

            {/* Right: hero badge */}
            <div className="hidden lg:flex shrink-0 flex-col items-center gap-5 animate-fadeInUp delay-240">
              <div className="relative">
                {/* Outer glow ring */}
                <div className="absolute -inset-4 rounded-[2rem] opacity-30 animate-glow-border"
                  style={{ background: "radial-gradient(circle, rgba(168,85,247,0.3), transparent 70%)" }} />
                <div
                  className="relative flex h-40 w-40 items-center justify-center rounded-[1.75rem] text-7xl animate-float backdrop-blur-sm"
                  style={{
                    background: "linear-gradient(135deg, rgba(124,58,237,0.25), rgba(79,142,247,0.16))",
                    border: "1px solid rgba(168,85,247,0.32)",
                    boxShadow: "0 0 60px rgba(124,58,237,0.3), 0 0 120px rgba(168,85,247,0.12), inset 0 1px 0 rgba(255,255,255,0.1)",
                  }}
                >
                  🏆
                  {/* Inner shimmer */}
                  <div className="absolute inset-0 rounded-[1.75rem] overflow-hidden">
                    <div className="absolute inset-0 opacity-20"
                      style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%, rgba(255,255,255,0.05) 100%)" }} />
                  </div>
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-black summer-text-gradient uppercase tracking-widest animate-text-shimmer">EAS Arena</p>
                <p className="text-[11px] text-zinc-600 mt-1 tracking-wide">Competitive Ranked</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Quick Stats Grid ── */}
      <section className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard title="Total Players" value={totalPlayers} note="Live database" color="purple" icon="👥" delay={0} />
        <MetricCard title="Ranked"         value={rankedPlayers}    note="Fully ranked"  color="lime"   icon="🏆" delay={60} />
        <MetricCard title="Placements"     value={placementPlayers} note="In progress"   color="yellow" icon="📋" delay={120} />
        <MetricCard title="Avg CR"         value={avgCr}            note="All players"   color="teal"   icon="📊" delay={180} />
        <MetricCard title="Total Matches"  value={totalMatches}     note="All time"      color="orange" icon="⚔️" delay={240} />
        <MetricCard title="Top Kills"      value={topKills}         note="Record holder" color="coral"  icon="💀" delay={300} />
      </section>

      {/* ── Main 3-column content grid ── */}
      <section className="mb-7 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]">

        {/* ── Featured Leaderboard ── */}
        <div
          className="glass-card-premium gradient-border-animated overflow-hidden animate-card-entrance"
          style={{ animationDelay: "0.1s" }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4"
            style={{ background: "linear-gradient(90deg, rgba(124,58,237,0.10), rgba(79,142,247,0.04), transparent)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="icon-wrap flex h-10 w-10 items-center justify-center rounded-xl text-lg"
                style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.2), rgba(79,142,247,0.12))", border: "1px solid rgba(168,85,247,0.25)", boxShadow: "0 0 16px rgba(168,85,247,0.1)" }}
              >
                🏆
              </div>
              <div>
                <h2 className="text-base font-black tracking-tight">Top Players</h2>
                <p className="text-[11px] text-zinc-500">Ranked by Competitive Rating</p>
              </div>
            </div>
            <SoundLink
              href="/leaderboard"
              soundType="success"
              className="press-feedback rounded-xl border border-purple-500/25 bg-purple-500/10 px-4 py-2 text-xs font-bold text-purple-300 transition-all duration-250 hover:border-purple-400/45 hover:bg-purple-500/20 hover:text-purple-200 hover:shadow-[0_4px_16px_rgba(168,85,247,0.2)]"
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
            <div className="px-6 py-16 text-center">
              <div
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl animate-float"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                🔍
              </div>
              <p className="text-sm text-zinc-400 font-semibold">No players found</p>
              <p className="mt-1.5 text-xs text-zinc-600">Check DATABASE_URL in Railway.</p>
            </div>
          ) : (
            players.slice(0, 10).map((p: any, index: number) => (
              <SoundLink
                href={`/profile/${p.user_id}`}
                key={p.user_id}
                soundType="click"
                className="lb-row-premium table-row-stagger group grid grid-cols-[52px_1fr] md:grid-cols-[52px_1fr_160px_100px] items-center border-b border-white/[0.04] px-6 py-3.5 last:border-0"
              >
                <span className="text-sm font-black">
                  {index === 0 ? (
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-lg animate-badge-entrance" style={{ background: "rgba(234,179,8,0.18)", boxShadow: "0 0 12px rgba(234,179,8,0.2)" }}>🥇</span>
                  ) : index === 1 ? (
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-lg animate-badge-entrance" style={{ background: "rgba(148,163,184,0.14)", animationDelay: "45ms" }}>🥈</span>
                  ) : index === 2 ? (
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-lg animate-badge-entrance" style={{ background: "rgba(180,83,9,0.18)", animationDelay: "90ms" }}>🥉</span>
                  ) : (
                    <span className="text-xs font-black text-zinc-600 pl-1.5 tabular-nums">#{index + 1}</span>
                  )}
                </span>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="player-avatar-wrap relative shrink-0">
                    <PlayerAvatar name={p.name} avatar={p.avatar_url} size="h-9 w-9" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate transition-colors duration-200 group-hover:text-white">{p.name || "Unknown Player"}</p>
                    <p className="text-xs text-zinc-600 truncate">{p.username || "—"}</p>
                  </div>
                </div>
                <div className="hidden md:block">
                  <RankBadge cr={Number(p.cr || 0)} size="sm" />
                </div>
                <span className="hidden md:block text-right text-sm font-black tabular-nums text-purple-300 transition-colors duration-200 group-hover:text-purple-200">
                  {(p.cr || 0).toLocaleString()}
                </span>
              </SoundLink>
            ))
          )}
        </div>

        {/* ── Right column: Season + Activity ── */}
        <div className="flex flex-col gap-5">
          <SeasonCard season={currentSeason} />

          {/* Live Activity Feed */}
          <div
            className="glass-card-premium gradient-border-animated overflow-hidden flex-1 animate-card-entrance"
            style={{ animationDelay: "0.2s" }}
          >
            <div
              className="border-b border-white/[0.06] px-5 py-4"
              style={{ background: "linear-gradient(90deg, rgba(79,142,247,0.10), rgba(6,182,212,0.04), transparent)" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="icon-wrap flex h-8 w-8 items-center justify-center rounded-lg text-sm"
                    style={{ background: "linear-gradient(135deg, rgba(79,142,247,0.2), rgba(6,182,212,0.12))", border: "1px solid rgba(79,142,247,0.25)", boxShadow: "0 0 12px rgba(79,142,247,0.1)" }}
                  >
                    ⚡
                  </div>
                  <div>
                    <h3 className="text-sm font-black">Live Activity</h3>
                    <p className="text-[10px] text-zinc-500">Recent match events</p>
                  </div>
                </div>
                {/* Live pulse indicator */}
                <div className="flex items-center gap-1.5 rounded-full border border-green-500/25 bg-green-500/10 px-2.5 py-1">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-400" />
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-green-400">Live</span>
                </div>
              </div>
            </div>
            <div className="px-3 py-2 scroll-premium" style={{ maxHeight: "360px", overflowY: "auto" }}>
              <ActivityFeed players={players as any} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Arena Statistics ── */}
      <section className="mb-6">
        <div className="section-header-premium animate-fadeInUp delay-300">
          <div
            className="icon-wrap flex h-10 w-10 items-center justify-center rounded-xl text-lg"
            style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.2), rgba(79,142,247,0.12))", border: "1px solid rgba(6,182,212,0.25)", boxShadow: "0 0 16px rgba(6,182,212,0.1)" }}
          >
            📊
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight">Arena Statistics</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Live performance data across all players</p>
          </div>
        </div>
        <DashboardStats players={players as any} />
      </section>
    </Shell>
  );
}

// ---------------------------------------------------------------------------
// Season card — premium redesign
// ---------------------------------------------------------------------------

function SeasonCard({ season }: { season: import("@/lib/seasons").Season | null }) {
  if (!season) {
    return (
      <div
        className="season-card-premium glass-card-premium gradient-border-animated p-5 animate-card-entrance"
        style={{ animationDelay: "0.15s" }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className="icon-wrap flex h-8 w-8 items-center justify-center rounded-lg text-sm"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              🏆
            </div>
            <div>
              <h3 className="text-sm font-black">Ranked Season</h3>
              <p className="text-[10px] text-zinc-500">No active season</p>
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
    active:   {
      badge: "border-green-500/30 bg-green-500/12 text-green-300",
      label: "LIVE",
      barGradient: "linear-gradient(90deg, #22c55e, #10b981, #06b6d4)",
      glow: "rgba(34,197,94,0.12)",
      glowStrong: "rgba(34,197,94,0.25)",
      accentLine: "linear-gradient(90deg, rgba(34,197,94,0.8), rgba(16,185,129,0.6), transparent)",
      pulsing: true,
    },
    paused:   {
      badge: "border-yellow-500/30 bg-yellow-500/12 text-yellow-300",
      label: "PAUSED",
      barGradient: "linear-gradient(90deg, #eab308, #f59e0b)",
      glow: "rgba(234,179,8,0.12)",
      glowStrong: "rgba(234,179,8,0.2)",
      accentLine: "linear-gradient(90deg, rgba(234,179,8,0.8), rgba(245,158,11,0.5), transparent)",
      pulsing: false,
    },
    ended:    {
      badge: "border-red-500/30 bg-red-500/12 text-red-300",
      label: "ENDED",
      barGradient: "linear-gradient(90deg, #ef4444, #f43f5e)",
      glow: "rgba(239,68,68,0.10)",
      glowStrong: "rgba(239,68,68,0.18)",
      accentLine: "linear-gradient(90deg, rgba(239,68,68,0.8), rgba(244,63,94,0.5), transparent)",
      pulsing: false,
    },
    upcoming: {
      badge: "border-blue-500/30 bg-blue-500/12 text-blue-300",
      label: "UPCOMING",
      barGradient: "linear-gradient(90deg, #3b82f6, #6366f1)",
      glow: "rgba(79,142,247,0.10)",
      glowStrong: "rgba(79,142,247,0.2)",
      accentLine: "linear-gradient(90deg, rgba(79,142,247,0.8), rgba(99,102,241,0.5), transparent)",
      pulsing: false,
    },
  };
  const cfg = statusConfig[season.status] ?? statusConfig.upcoming;

  let daysLeft = 0;
  if (season.end_date && season.status === "active") {
    daysLeft = Math.max(0, Math.round((new Date(season.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
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
      className="season-card-premium glass-card-premium gradient-border-animated p-5 animate-card-entrance"
      style={{ animationDelay: "0.15s" }}
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-[1.25rem] animate-accent-grow"
        style={{ background: cfg.accentLine }} />

      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 rounded-[1.25rem]"
        style={{ background: `radial-gradient(ellipse at top right, ${cfg.glow}, transparent 65%)` }} />

      <div className="relative">
        {/* Header row */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className="icon-wrap flex h-8 w-8 items-center justify-center rounded-lg text-sm"
              style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.2), rgba(79,142,247,0.12))", border: "1px solid rgba(168,85,247,0.25)", boxShadow: "0 0 12px rgba(168,85,247,0.1)" }}
            >
              🏆
            </div>
            <h3 className="text-sm font-black truncate">{season.name}</h3>
          </div>
          <span className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cfg.badge}`}>
            {cfg.pulsing && (
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-400" />
              </span>
            )}
            {cfg.label}
          </span>
        </div>

        {season.description && (
          <p className="text-xs text-zinc-500 mb-3 line-clamp-2 leading-relaxed">{season.description}</p>
        )}

        {/* Progress section */}
        {season.start_date && season.end_date && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-500 font-medium">{progressPct}% complete</span>
              {daysLeft > 0 && (
                <span className="font-bold text-purple-400 flex items-center gap-1">
                  <span className="text-[10px]">⏳</span>
                  {daysLeft}d remaining
                </span>
              )}
            </div>
            {/* Premium progress bar */}
            <div className="season-progress-premium">
              <div
                className="fill"
                style={{
                  width: `${progressPct}%`,
                  background: cfg.barGradient,
                  boxShadow: `0 0 10px ${cfg.glowStrong}`,
                }}
              />
            </div>
            {/* Milestone markers */}
            <div className="flex justify-between px-0.5">
              {[25, 50, 75].map((milestone) => (
                <div key={milestone} className="flex flex-col items-center gap-0.5">
                  <div className={`h-1 w-px ${progressPct >= milestone ? "bg-purple-400/60" : "bg-white/10"} transition-colors duration-500`} />
                  <span className={`text-[8px] font-bold ${progressPct >= milestone ? "text-purple-400/60" : "text-zinc-700"} transition-colors duration-500`}>{milestone}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Metric card — premium redesign with stat-pop animation
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
  const colorMap: Record<string, { text: string; glow: string; iconBg: string; border: string; from: string; to: string; shadow: string }> = {
    coral:  { text: "text-rose-300",   glow: "rgba(244,63,94,0.10)",   iconBg: "linear-gradient(135deg, rgba(244,63,94,0.18), rgba(251,113,133,0.10))",   border: "rgba(244,63,94,0.20)",   from: "#E11D48", to: "#FB7185", shadow: "rgba(244,63,94,0.25)" },
    lime:   { text: "text-lime-300",   glow: "rgba(132,204,22,0.10)",  iconBg: "linear-gradient(135deg, rgba(132,204,22,0.18), rgba(163,230,53,0.10))",   border: "rgba(132,204,22,0.20)",  from: "#65A30D", to: "#A3E635", shadow: "rgba(132,204,22,0.25)" },
    yellow: { text: "text-yellow-300", glow: "rgba(234,179,8,0.10)",   iconBg: "linear-gradient(135deg, rgba(234,179,8,0.18), rgba(253,224,71,0.10))",    border: "rgba(234,179,8,0.20)",   from: "#CA8A04", to: "#FDE047", shadow: "rgba(234,179,8,0.25)" },
    teal:   { text: "text-cyan-300",   glow: "rgba(6,182,212,0.10)",   iconBg: "linear-gradient(135deg, rgba(6,182,212,0.18), rgba(34,211,238,0.10))",    border: "rgba(6,182,212,0.20)",   from: "#0891B2", to: "#22D3EE", shadow: "rgba(6,182,212,0.25)" },
    orange: { text: "text-orange-300", glow: "rgba(249,115,22,0.10)",  iconBg: "linear-gradient(135deg, rgba(249,115,22,0.18), rgba(251,146,60,0.10))",   border: "rgba(249,115,22,0.20)",  from: "#EA580C", to: "#FB923C", shadow: "rgba(249,115,22,0.25)" },
    purple: { text: "text-purple-300", glow: "rgba(168,85,247,0.10)",  iconBg: "linear-gradient(135deg, rgba(168,85,247,0.18), rgba(196,139,253,0.10))",  border: "rgba(168,85,247,0.20)",  from: "#7C3AED", to: "#A855F7", shadow: "rgba(168,85,247,0.25)" },
    green:  { text: "text-green-300",  glow: "rgba(34,197,94,0.10)",   iconBg: "linear-gradient(135deg, rgba(34,197,94,0.18), rgba(74,222,128,0.10))",    border: "rgba(34,197,94,0.20)",   from: "#16A34A", to: "#4ADE80", shadow: "rgba(34,197,94,0.25)" },
    blue:   { text: "text-blue-300",   glow: "rgba(79,142,247,0.10)",  iconBg: "linear-gradient(135deg, rgba(79,142,247,0.18), rgba(96,165,250,0.10))",   border: "rgba(79,142,247,0.20)",  from: "#3B82F6", to: "#60A5FA", shadow: "rgba(79,142,247,0.25)" },
    red:    { text: "text-red-300",    glow: "rgba(239,68,68,0.10)",   iconBg: "linear-gradient(135deg, rgba(239,68,68,0.18), rgba(248,113,113,0.10))",   border: "rgba(239,68,68,0.20)",   from: "#DC2626", to: "#F87171", shadow: "rgba(239,68,68,0.25)" },
  };
  const cm = colorMap[color] ?? colorMap.coral;

  return (
    <div
      className="stat-card-premium group animate-card-entrance gpu-accelerate"
      style={{
        background: "rgba(10,10,28,0.88)",
        border: `1px solid ${cm.border}`,
        padding: "1.25rem",
        animationDelay: `${delay}ms`,
        boxShadow: `0 4px 20px rgba(0,0,0,0.3)`,
      }}
    >
      {/* Top accent line */}
      <div
        className="accent-line"
        style={{ background: `linear-gradient(90deg, ${cm.from}, ${cm.to}, transparent)` }}
      />
      {/* Hover glow */}
      <div
        className="hover-glow"
        style={{ background: `radial-gradient(ellipse at top left, ${cm.glow}, transparent 65%)` }}
      />
      {/* Hover border glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[1.25rem] pointer-events-none"
        style={{ boxShadow: `inset 0 0 0 1px ${cm.from}28` }}
      />

      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none">{title}</p>
          <p
            className={`mt-2.5 text-2xl font-black counter-number animate-stat-pop ${cm.text}`}
            style={{ letterSpacing: "-0.04em", lineHeight: 1.1, animationDelay: `${delay + 80}ms` }}
          >
            {value.toLocaleString()}
          </p>
          <p className="mt-1.5 text-[10px] text-zinc-600 transition-colors duration-200 group-hover:text-zinc-500">{note}</p>
        </div>
        {icon && (
          <div
            className="icon-wrap flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl"
            style={{ background: cm.iconBg, border: `1px solid ${cm.border}` }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
