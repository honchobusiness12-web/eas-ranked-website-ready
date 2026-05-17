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

      {/* Hero */}
      <section className="summer-hero-gradient rounded-2xl border border-orange-700/25 p-6 md:p-8 overflow-hidden relative">
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-yellow-500/8 blur-3xl animate-sun-pulse" />
        <div className="relative flex items-center justify-between gap-6">
          <div className="min-w-0">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-orange-400">☀️ Live Ranked System</p>
            <h1 className="text-3xl font-black leading-tight md:text-5xl">
              Climb the ranks.<br />Own the arena.
            </h1>
            <p className="mt-3 max-w-xl text-sm text-zinc-400 leading-relaxed">
              Track CR, ranks, placements, MVPs, and live competitive activity.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <SoundLink href="/leaderboard" soundType="success" className="rounded-lg bg-gradient-to-r from-orange-500 to-red-500 px-4 py-2 text-sm font-bold hover:from-orange-400 hover:to-red-400 transition-all shadow-lg shadow-orange-900/30">
                🏆 Leaderboard
              </SoundLink>
              <SoundLink href="/compare" soundType="success" className="rounded-lg border border-teal-500/35 bg-teal-950/25 px-4 py-2 text-sm font-bold hover:bg-teal-900/35 hover:border-teal-400/50 transition-all">
                ⚔️ Compare
              </SoundLink>
              <SoundLink href="/players" soundType="success" className="rounded-lg border border-yellow-600/35 bg-yellow-950/15 px-4 py-2 text-sm font-bold hover:bg-yellow-900/25 hover:border-yellow-500/50 transition-all">
                👥 Players
              </SoundLink>
              <SoundLink href="/ranks" soundType="success" className="rounded-lg border border-orange-700/35 bg-orange-950/15 px-4 py-2 text-sm font-bold hover:bg-orange-900/25 hover:border-orange-500/50 transition-all">
                🏷️ Ranks
              </SoundLink>
            </div>
          </div>
          <div className="hidden text-7xl lg:block animate-sun-pulse shrink-0">☀️</div>
        </div>
      </section>

      {/* Quick stats */}
      <section className="mt-4 grid grid-cols-3 gap-3 lg:grid-cols-6">
        <Stat title="Players" value={totalPlayers} note="Live" color="coral" />
        <Stat title="Ranked" value={rankedPlayers} note="Placed" color="lime" />
        <Stat title="Placements" value={placementPlayers} note="In progress" color="yellow" />
        <Stat title="Avg CR" value={avgCr} note="All players" color="teal" />
        <Stat title="Matches" value={totalMatches} note="All time" color="orange" />
        <Stat title="Top Kills" value={topKills} note="Record" color="coral" />
      </section>

      {/* Top players + sidebar */}
      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">
        {/* Top players table */}
        <div className="rounded-2xl border border-orange-700/15 bg-[#0d0d14] overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
            <h2 className="text-lg font-black">🏆 Top Players</h2>
            <SoundLink
              href="/leaderboard"
              soundType="success"
              className="rounded-lg border border-orange-600/40 px-3 py-1.5 text-xs font-bold text-orange-300 hover:bg-orange-950/30 transition-colors"
            >
              Full Board →
            </SoundLink>
          </div>

          {players.length === 0 ? (
            <p className="p-5 text-sm text-zinc-400">No players found. Check DATABASE_URL in Railway.</p>
          ) : (
            players.slice(0, 10).map((p: any, index: number) => (
              <SoundLink
                href={`/profile/${p.user_id}`}
                key={p.user_id}
                soundType="click"
                className="grid grid-cols-[44px_1fr_auto_80px] items-center border-b border-white/[0.05] px-5 py-3 hover:bg-white/[0.04] transition-colors last:border-0"
              >
                <span className="text-base font-black">
                  {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : <span className="text-sm text-zinc-500">#{index + 1}</span>}
                </span>
                <div className="flex items-center gap-3 min-w-0">
                  <PlayerAvatar name={p.name} avatar={p.avatar_url} size="h-9 w-9" />
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate leading-tight">{p.name || "Unknown Player"}</p>
                    <p className="text-xs text-zinc-600 truncate">{p.username || "—"}</p>
                  </div>
                </div>
                <RankBadge cr={Number(p.cr || 0)} size="sm" />
                <span className="text-right text-base font-black text-orange-400">{p.cr || 0}</span>
              </SoundLink>
            ))
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          <SeasonCard season={currentSeason} />

          {/* Recent activity */}
          <div className="rounded-2xl border border-teal-700/15 bg-[#0d0d14] overflow-hidden">
            <div className="border-b border-white/[0.06] px-4 py-3">
              <h3 className="text-sm font-black">⚡ Recent Activity</h3>
            </div>
            <div className="p-2">
              {players.slice(0, 6).map((p: any) => (
                <SoundLink
                  href={`/profile/${p.user_id}`}
                  key={p.user_id}
                  soundType="click"
                  className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-white/[0.04] transition-colors"
                >
                  <PlayerAvatar name={p.name} avatar={p.avatar_url} size="h-8 w-8" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs truncate leading-tight">{p.name || "Unknown Player"}</p>
                    <p className="text-[11px] text-zinc-600">{p.cr || 0} CR · {p.wins || 0}W</p>
                  </div>
                  <RankBadge cr={Number(p.cr || 0)} size="sm" showLabel={false} />
                </SoundLink>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard stats section */}
      <section className="mt-4">
        <h2 className="mb-3 text-lg font-black">📊 Arena Statistics</h2>
        <DashboardStats players={players as any} />
      </section>

      {/* Premium upsell */}
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
      <div className="rounded-2xl border border-yellow-600/30 bg-gradient-to-br from-orange-950/25 to-yellow-950/15 p-4 relative overflow-hidden">
        <div className="relative">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-black">🏆 Ranked Season</h3>
            <span className="rounded-md bg-zinc-700 px-2 py-0.5 text-[10px] font-black tracking-wider text-white">
              OFF
            </span>
          </div>
          <p className="mt-2 text-xs text-zinc-500">No active season. Stay tuned.</p>
        </div>
      </div>
    );
  }

  const statusConfig = {
    active:   { badge: "from-green-600 to-emerald-600",  label: "ACTIVE",   icon: "🟢", note: "text-green-300",  noteBg: "border-green-700/30 bg-green-950/20" },
    paused:   { badge: "from-yellow-600 to-amber-600",   label: "PAUSED",   icon: "⏸",  note: "text-yellow-300", noteBg: "border-yellow-700/30 bg-yellow-950/20" },
    ended:    { badge: "from-red-700 to-rose-700",       label: "ENDED",    icon: "🔴", note: "text-red-300",    noteBg: "border-red-700/30 bg-red-950/20" },
    upcoming: { badge: "from-blue-600 to-indigo-600",    label: "UPCOMING", icon: "🔵", note: "text-blue-300",   noteBg: "border-blue-700/30 bg-blue-950/20" },
  };
  const cfg = statusConfig[season.status] ?? statusConfig.upcoming;

  // Days remaining
  let daysNote = "";
  if (season.end_date) {
    const daysLeft = Math.max(0, Math.round((new Date(season.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    if (season.status === "active") daysNote = `⏳ ${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining`;
    else if (season.status === "ended") daysNote = `🏁 Season ended`;
    else if (season.status === "upcoming") daysNote = `🚀 Starts soon`;
  }

  // Progress bar
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
    <div className="rounded-2xl border border-yellow-600/30 bg-gradient-to-br from-orange-950/25 to-yellow-950/15 p-4 relative overflow-hidden">
      <div className="relative">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-black truncate">{season.name}</h3>
          <span className={`shrink-0 rounded-md bg-gradient-to-r ${cfg.badge} px-2 py-0.5 text-[10px] font-black tracking-wider text-white`}>
            {cfg.label}
          </span>
        </div>
        {season.description && (
          <p className="mt-1 text-xs text-zinc-500 line-clamp-1">{season.description}</p>
        )}
        {season.start_date && season.end_date && (
          <div className="mt-2.5">
            <div className="flex items-center justify-between text-[11px] text-zinc-600 mb-1">
              <span>{progressPct}%</span>
              {daysNote && <span>{daysNote}</span>}
            </div>
            <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-orange-500 to-yellow-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}
        <div className={`mt-3 rounded-lg border px-3 py-2 ${cfg.noteBg}`}>
          <p className={`text-xs font-bold ${cfg.note}`}>{cfg.icon} Season {cfg.label.charAt(0) + cfg.label.slice(1).toLowerCase()}</p>
        </div>
      </div>
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
  const styles: Record<string, { note: string; border: string; glow: string }> = {
    coral:  { note: "text-red-400",    border: "border-red-700/30",    glow: "bg-red-500/5" },
    lime:   { note: "text-green-400",  border: "border-green-700/30",  glow: "bg-green-500/5" },
    yellow: { note: "text-yellow-400", border: "border-yellow-700/30", glow: "bg-yellow-500/5" },
    teal:   { note: "text-cyan-400",   border: "border-cyan-700/30",   glow: "bg-cyan-500/5" },
    orange: { note: "text-orange-400", border: "border-orange-700/30", glow: "bg-orange-500/5" },
    purple: { note: "text-purple-500", border: "border-white/10",      glow: "bg-transparent" },
    green:  { note: "text-green-600",  border: "border-white/10",      glow: "bg-transparent" },
    blue:   { note: "text-blue-500",   border: "border-white/10",      glow: "bg-transparent" },
    red:    { note: "text-red-500",    border: "border-white/10",      glow: "bg-transparent" },
  };
  const s = styles[color] ?? styles.coral;
  return (
    <div className={`rounded-xl border ${s.border} ${s.glow} bg-[#0d0d14] p-3.5`}>
      <p className="text-[11px] text-zinc-500 leading-none">{title}</p>
      <p className="mt-1.5 text-xl font-black leading-none">{value.toLocaleString()}</p>
      <p className={`mt-1 text-[11px] font-semibold ${s.note}`}>{note}</p>
    </div>
  );
}
