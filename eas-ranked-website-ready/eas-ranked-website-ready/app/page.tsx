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
          background: "linear-gradient(135deg, rgba(0,207,255,0.16) 0%, rgba(77,238,234,0.10) 35%, rgba(0,207,255,0.14) 65%, rgba(255,127,80,0.07) 100%)",
          backgroundSize: "300% 300%",
        }} />

        {/* Floating orbs / underwater light */}
        <div className="glow-orb animate-orb pointer-events-none"
          style={{ right: "-80px", top: "-80px", width: "380px", height: "380px", opacity: 0.22,
            background: "radial-gradient(circle, rgba(0,207,255,0.7), transparent 70%)" }} />
        <div className="glow-orb animate-orb-2 pointer-events-none"
          style={{ left: "-60px", bottom: "-60px", width: "300px", height: "300px", opacity: 0.18,
            background: "radial-gradient(circle, rgba(77,238,234,0.7), transparent 70%)" }} />
        <div className="glow-orb animate-orb-3 pointer-events-none"
          style={{ left: "45%", top: "-40px", width: "200px", height: "200px", opacity: 0.12,
            background: "radial-gradient(circle, rgba(255,127,80,0.6), transparent 70%)" }} />

        {/* Floating bubbles */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[1.5rem]">
          {[
            { cls: "animate-bubble",   bottom: "10%", left: "8%",  size: 8,  color: "rgba(0,207,255,0.35)" },
            { cls: "animate-bubble-2", bottom: "5%",  left: "20%", size: 5,  color: "rgba(77,238,234,0.30)" },
            { cls: "animate-bubble-3", bottom: "15%", left: "75%", size: 10, color: "rgba(0,207,255,0.25)" },
            { cls: "animate-bubble-4", bottom: "8%",  left: "60%", size: 6,  color: "rgba(168,255,246,0.30)" },
            { cls: "animate-bubble-5", bottom: "20%", left: "45%", size: 7,  color: "rgba(77,238,234,0.25)" },
            { cls: "animate-particle",   top: "15%", left: "8%",  size: 4, color: "rgba(0,207,255,0.6)" },
            { cls: "animate-particle-2", top: "70%", left: "15%", size: 3, color: "rgba(77,238,234,0.5)" },
            { cls: "animate-particle-3", top: "25%", left: "85%", size: 5, color: "rgba(0,207,255,0.5)" },
            { cls: "animate-particle-4", top: "60%", left: "75%", size: 3, color: "rgba(255,127,80,0.4)" },
            { cls: "animate-particle-5", top: "40%", left: "50%", size: 4, color: "rgba(168,255,246,0.4)" },
          ].map((p, i) => (
            <div key={i} className={`absolute rounded-full ${p.cls}`}
              style={{ ...(p.bottom ? { bottom: p.bottom } : { top: (p as any).top }), left: p.left, width: p.size, height: p.size, background: p.color, border: p.size >= 5 ? `1px solid ${p.color}` : undefined }} />
          ))}
        </div>

        {/* Subtle grid */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.03] rounded-[1.5rem]"
          style={{
            backgroundImage: "linear-gradient(rgba(0,207,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,207,255,1) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }} />

        {/* Accent lines */}
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-[1px] rounded-t-[1.5rem]"
          style={{ background: "linear-gradient(90deg, transparent, rgba(0,207,255,0.7), rgba(77,238,234,0.5), transparent)" }} />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[1px] rounded-b-[1.5rem]"
          style={{ background: "linear-gradient(90deg, transparent, rgba(77,238,234,0.3), transparent)" }} />

        <div className="relative px-6 py-10 md:px-12 md:py-16 lg:py-20">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            {/* Left: copy */}
            <div className="flex-1 min-w-0">
              {/* Live badge */}
              <div className="mb-5 inline-flex items-center gap-2.5 rounded-full px-4 py-1.5 backdrop-blur-sm animate-hero-reveal"
                style={{ border: "1px solid rgba(0,207,255,0.35)", background: "rgba(0,207,255,0.10)", boxShadow: "0 0 20px rgba(0,207,255,0.15)" }}>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
                </span>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#00CFFF" }}>Live Ranked System</p>
              </div>

              {/* Headline */}
              <h1 className="text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl md:text-6xl xl:text-7xl">
                <span className="block animate-hero-reveal-2" style={{ animationDelay: "0.08s" }}>
                  <span className="hero-text-gradient">Climb the ranks.</span>
                </span>
                <span className="block animate-hero-reveal-3" style={{ animationDelay: "0.18s", color: "rgba(224,247,255,0.90)" }}>
                  Own the arena.
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-relaxed md:text-base lg:text-lg animate-hero-reveal-4"
                style={{ animationDelay: "0.28s", color: "rgba(168,255,246,0.65)" }}>
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
                  className="btn-press press-feedback inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold backdrop-blur-sm transition-all duration-200"
                  style={{ border: "1px solid rgba(77,238,234,0.30)", background: "rgba(77,238,234,0.10)", color: "#4DEEEA" }}
                >
                  ⚔️ Compare
                </SoundLink>
                <SoundLink
                  href="/players"
                  soundType="success"
                  className="btn-press press-feedback inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold backdrop-blur-sm transition-all duration-200"
                  style={{ border: "1px solid rgba(0,207,255,0.28)", background: "rgba(0,207,255,0.10)", color: "#00CFFF" }}
                >
                  👥 Players
                </SoundLink>
                <SoundLink
                  href="/ranks"
                  soundType="success"
                  className="btn-press press-feedback inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold backdrop-blur-sm transition-all duration-200"
                  style={{ border: "1px solid rgba(168,255,246,0.22)", background: "rgba(168,255,246,0.07)", color: "rgba(168,255,246,0.80)" }}
                >
                  🏷️ Ranks
                </SoundLink>
              </div>
            </div>

            {/* Right: hero badge */}
            <div className="hidden lg:flex shrink-0 flex-col items-center gap-5 animate-fadeInUp delay-240">
              <div className="relative">
                {/* Outer glow ring */}
                <div className="absolute -inset-4 rounded-[2rem] opacity-40 animate-glow-border"
                  style={{ background: "radial-gradient(circle, rgba(0,207,255,0.30), transparent 70%)" }} />
                {/* Floating bubbles around avatar */}
                <div className="absolute -top-3 -right-3 w-4 h-4 rounded-full animate-bubble" style={{ background: "rgba(0,207,255,0.40)", border: "1px solid rgba(0,207,255,0.60)" }} />
                <div className="absolute -bottom-2 -left-4 w-3 h-3 rounded-full animate-bubble-2" style={{ background: "rgba(77,238,234,0.35)", border: "1px solid rgba(77,238,234,0.55)" }} />
                <div className="absolute top-1/2 -right-6 w-2 h-2 rounded-full animate-bubble-3" style={{ background: "rgba(168,255,246,0.40)" }} />
                <div
                  className="relative flex h-40 w-40 items-center justify-center rounded-[1.75rem] text-7xl animate-float backdrop-blur-sm"
                  style={{
                    background: "linear-gradient(135deg, rgba(0,207,255,0.20), rgba(77,238,234,0.14))",
                    border: "1px solid rgba(0,207,255,0.35)",
                    boxShadow: "0 0 60px rgba(0,207,255,0.25), 0 0 120px rgba(77,238,234,0.12), inset 0 1px 0 rgba(0,207,255,0.20)",
                  }}
                >
                  🏆
                  {/* Inner shimmer */}
                  <div className="absolute inset-0 rounded-[1.75rem] overflow-hidden">
                    <div className="absolute inset-0 opacity-20"
                      style={{ background: "linear-gradient(135deg, rgba(0,207,255,0.20) 0%, transparent 50%, rgba(77,238,234,0.10) 100%)" }} />
                  </div>
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-black summer-text-gradient uppercase tracking-widest animate-text-shimmer">EAS Arena</p>
                <p className="text-[11px] mt-1 tracking-wide" style={{ color: "rgba(168,255,246,0.50)" }}>Competitive Ranked</p>
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
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: "1px solid rgba(0,207,255,0.12)", background: "linear-gradient(90deg, rgba(0,207,255,0.08), rgba(77,238,234,0.04), transparent)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="icon-wrap flex h-10 w-10 items-center justify-center rounded-xl text-lg"
                style={{ background: "linear-gradient(135deg, rgba(0,207,255,0.18), rgba(77,238,234,0.12))", border: "1px solid rgba(0,207,255,0.25)", boxShadow: "0 0 16px rgba(0,207,255,0.12)" }}
              >
                🏆
              </div>
              <div>
                <h2 className="text-base font-black tracking-tight" style={{ color: "#e0f7ff" }}>Top Players</h2>
                <p className="text-[11px]" style={{ color: "rgba(168,255,246,0.55)" }}>Ranked by Competitive Rating</p>
              </div>
            </div>
            <SoundLink
              href="/leaderboard"
              soundType="success"
              className="press-feedback rounded-xl px-4 py-2 text-xs font-bold transition-all duration-250"
              style={{ border: "1px solid rgba(0,207,255,0.25)", background: "rgba(0,207,255,0.10)", color: "#00CFFF" }}
            >
              Full Board →
            </SoundLink>
          </div>

          {/* Column headers */}
          <div className="hidden md:grid grid-cols-[52px_1fr_160px_100px] items-center px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest" style={{ borderBottom: "1px solid rgba(0,207,255,0.08)", color: "rgba(168,255,246,0.45)" }}>
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
                className="lb-row-premium table-row-stagger group grid grid-cols-[52px_1fr] md:grid-cols-[52px_1fr_160px_100px] items-center border-b border-sky-50 px-6 py-3.5 last:border-0"
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
                    <p className="text-sm font-bold truncate transition-colors duration-200" style={{ color: "#e0f7ff" }}>{p.name || "Unknown Player"}</p>
                    <p className="text-xs truncate" style={{ color: "rgba(168,255,246,0.50)" }}>{p.username || "—"}</p>
                  </div>
                </div>
                <div className="hidden md:block">
                  <RankBadge cr={Number(p.cr || 0)} size="sm" />
                </div>
                <span className="hidden md:block text-right text-sm font-black tabular-nums transition-colors duration-200" style={{ color: "#00CFFF" }}>
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
              className="px-5 py-4"
              style={{ borderBottom: "1px solid rgba(0,207,255,0.12)", background: "linear-gradient(90deg, rgba(77,238,234,0.08), rgba(0,207,255,0.04), transparent)" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="icon-wrap flex h-8 w-8 items-center justify-center rounded-lg text-sm"
                    style={{ background: "linear-gradient(135deg, rgba(77,238,234,0.18), rgba(0,207,255,0.12))", border: "1px solid rgba(77,238,234,0.25)", boxShadow: "0 0 12px rgba(77,238,234,0.10)" }}
                  >
                    ⚡
                  </div>
                  <div>
                    <h3 className="text-sm font-black" style={{ color: "#e0f7ff" }}>Live Activity</h3>
                    <p className="text-[10px]" style={{ color: "rgba(168,255,246,0.55)" }}>Recent match events</p>
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
            style={{ background: "linear-gradient(135deg, rgba(0,207,255,0.18), rgba(77,238,234,0.12))", border: "1px solid rgba(0,207,255,0.25)", boxShadow: "0 0 16px rgba(0,207,255,0.12)" }}
          >
            📊
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight" style={{ color: "#e0f7ff" }}>Arena Statistics</h2>
            <p className="text-xs mt-0.5" style={{ color: "rgba(168,255,246,0.55)" }}>Live performance data across all players</p>
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
              style={{ background: "rgba(0,207,255,0.12)", border: "1px solid rgba(0,207,255,0.20)" }}
            >
              🏆
            </div>
            <div>
              <h3 className="text-sm font-black" style={{ color: "#e0f7ff" }}>Ranked Season</h3>
              <p className="text-[10px]" style={{ color: "rgba(168,255,246,0.55)" }}>No active season</p>
            </div>
          </div>
          <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
            style={{ border: "1px solid rgba(168,255,246,0.18)", background: "rgba(168,255,246,0.06)", color: "rgba(168,255,246,0.55)" }}>
            Off Season
          </span>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: "rgba(168,255,246,0.50)" }}>Stay tuned for the next season announcement.</p>
      </div>
    );
  }

  const statusConfig = {
    active:   {
      badgeStyle: { border: "1px solid rgba(74,222,128,0.35)", background: "rgba(74,222,128,0.12)", color: "#4ade80" },
      label: "LIVE",
      barGradient: "linear-gradient(90deg, #22c55e, #4ade80, #4DEEEA)",
      glow: "rgba(74,222,128,0.08)",
      glowStrong: "rgba(74,222,128,0.18)",
      accentLine: "linear-gradient(90deg, rgba(74,222,128,0.7), rgba(77,238,234,0.5), transparent)",
      pulsing: true,
    },
    paused:   {
      badgeStyle: { border: "1px solid rgba(242,217,166,0.35)", background: "rgba(242,217,166,0.10)", color: "#F2D9A6" },
      label: "PAUSED",
      barGradient: "linear-gradient(90deg, #F2D9A6, #fbbf24)",
      glow: "rgba(242,217,166,0.08)",
      glowStrong: "rgba(242,217,166,0.15)",
      accentLine: "linear-gradient(90deg, rgba(242,217,166,0.7), rgba(251,191,36,0.4), transparent)",
      pulsing: false,
    },
    ended:    {
      badgeStyle: { border: "1px solid rgba(255,127,80,0.35)", background: "rgba(255,127,80,0.10)", color: "#FF7F50" },
      label: "ENDED",
      barGradient: "linear-gradient(90deg, #FF7F50, #FF8C42)",
      glow: "rgba(255,127,80,0.08)",
      glowStrong: "rgba(255,127,80,0.15)",
      accentLine: "linear-gradient(90deg, rgba(255,127,80,0.7), rgba(255,140,66,0.4), transparent)",
      pulsing: false,
    },
    upcoming: {
      badgeStyle: { border: "1px solid rgba(0,207,255,0.35)", background: "rgba(0,207,255,0.10)", color: "#00CFFF" },
      label: "UPCOMING",
      barGradient: "linear-gradient(90deg, #00CFFF, #4DEEEA)",
      glow: "rgba(0,207,255,0.08)",
      glowStrong: "rgba(0,207,255,0.15)",
      accentLine: "linear-gradient(90deg, rgba(0,207,255,0.7), rgba(77,238,234,0.4), transparent)",
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
              style={{ background: "linear-gradient(135deg, rgba(0,207,255,0.18), rgba(77,238,234,0.12))", border: "1px solid rgba(0,207,255,0.25)", boxShadow: "0 0 12px rgba(0,207,255,0.10)" }}
            >
              🏆
            </div>
            <h3 className="text-sm font-black truncate" style={{ color: "#e0f7ff" }}>{season.name}</h3>
          </div>
          <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={cfg.badgeStyle}>
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
          <p className="text-xs mb-3 line-clamp-2 leading-relaxed" style={{ color: "rgba(168,255,246,0.55)" }}>{season.description}</p>
        )}

        {/* Progress section */}
        {season.start_date && season.end_date && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium" style={{ color: "rgba(168,255,246,0.55)" }}>{progressPct}% complete</span>
              {daysLeft > 0 && (
                <span className="font-bold flex items-center gap-1" style={{ color: "#00CFFF" }}>
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
                  <div className="h-1 w-px transition-colors duration-500" style={{ background: progressPct >= milestone ? "rgba(0,207,255,0.50)" : "rgba(168,255,246,0.15)" }} />
                  <span className="text-[8px] font-bold transition-colors duration-500" style={{ color: progressPct >= milestone ? "rgba(0,207,255,0.60)" : "rgba(168,255,246,0.25)" }}>{milestone}%</span>
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

// MetricCard uses StatCard under the hood — just a thin wrapper
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


  const colorMap: Record<string, { textColor: string; glow: string; iconBg: string; border: string; from: string; to: string }> = {
    coral:  { textColor: "#FF7F50",  glow: "rgba(255,127,80,0.12)",  iconBg: "linear-gradient(135deg, rgba(255,127,80,0.18), rgba(255,140,66,0.10))",  border: "rgba(255,127,80,0.22)",  from: "#FF7F50", to: "#FF8C42" },
    lime:   { textColor: "#A8FFF6",  glow: "rgba(168,255,246,0.12)", iconBg: "linear-gradient(135deg, rgba(168,255,246,0.18), rgba(77,238,234,0.10))", border: "rgba(168,255,246,0.22)", from: "#A8FFF6", to: "#4DEEEA" },
    yellow: { textColor: "#F2D9A6",  glow: "rgba(242,217,166,0.12)", iconBg: "linear-gradient(135deg, rgba(242,217,166,0.18), rgba(251,191,36,0.10))", border: "rgba(242,217,166,0.22)", from: "#F2D9A6", to: "#fbbf24" },
    teal:   { textColor: "#4DEEEA",  glow: "rgba(77,238,234,0.12)",  iconBg: "linear-gradient(135deg, rgba(77,238,234,0.18), rgba(0,207,255,0.10))",   border: "rgba(77,238,234,0.22)",  from: "#4DEEEA", to: "#00CFFF" },
    orange: { textColor: "#FF8C42",  glow: "rgba(255,140,66,0.12)",  iconBg: "linear-gradient(135deg, rgba(255,140,66,0.18), rgba(255,127,80,0.10))",  border: "rgba(255,140,66,0.22)",  from: "#FF8C42", to: "#FF7F50" },
    purple: { textColor: "#00CFFF",  glow: "rgba(0,207,255,0.12)",   iconBg: "linear-gradient(135deg, rgba(0,207,255,0.18), rgba(77,238,234,0.10))",   border: "rgba(0,207,255,0.22)",   from: "#00CFFF", to: "#4DEEEA" },
    green:  { textColor: "#4ade80",  glow: "rgba(74,222,128,0.12)",  iconBg: "linear-gradient(135deg, rgba(74,222,128,0.18), rgba(34,197,94,0.10))",   border: "rgba(74,222,128,0.22)",  from: "#22c55e", to: "#4ade80" },
    blue:   { textColor: "#4DEEEA",  glow: "rgba(77,238,234,0.12)",  iconBg: "linear-gradient(135deg, rgba(77,238,234,0.18), rgba(0,207,255,0.10))",   border: "rgba(77,238,234,0.22)",  from: "#4DEEEA", to: "#00CFFF" },
    red:    { textColor: "#FF7F50",  glow: "rgba(255,127,80,0.12)",  iconBg: "linear-gradient(135deg, rgba(255,127,80,0.18), rgba(255,140,66,0.10))",  border: "rgba(255,127,80,0.22)",  from: "#FF7F50", to: "#FF8C42" },
  };
  const cm = colorMap[color] ?? colorMap.coral;

  return (
    <div
      className="stat-card-premium group animate-card-entrance gpu-accelerate"
      style={{
        background: "rgba(6,43,69,0.82)",
        border: `1px solid ${cm.border}`,
        padding: "1.5rem",
        animationDelay: `${delay}ms`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.28)`,
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
        style={{ boxShadow: `inset 0 0 0 1px ${cm.from}40` }}
      />

      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest leading-none" style={{ color: "rgba(168,255,246,0.55)" }}>{title}</p>
          <p
            className="mt-3 text-3xl font-black counter-number animate-stat-pop"
            style={{ letterSpacing: "-0.04em", lineHeight: 1.1, animationDelay: `${delay + 80}ms`, color: cm.textColor }}
          >
            {value.toLocaleString()}
          </p>
          <p className="mt-1.5 text-[10px] transition-colors duration-200" style={{ color: "rgba(168,255,246,0.45)" }}>{note}</p>
        </div>
        {icon && (
          <div
            className="icon-wrap flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl"
            style={{ background: cm.iconBg, border: `1px solid ${cm.border}`, boxShadow: `0 0 16px ${cm.glow}` }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
