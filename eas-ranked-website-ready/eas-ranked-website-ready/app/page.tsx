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
      <section className="summer-hero-gradient rounded-2xl border border-orange-700/20 px-6 py-8 md:px-8 md:py-10 overflow-hidden relative">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-yellow-500/8 blur-3xl animate-sun-pulse" />
        <div className="relative flex items-center justify-between gap-6">
          <div className="min-w-0">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-orange-400">☀️ Live Ranked System</p>
            <h1 className="text-3xl font-black leading-tight tracking-tight md:text-5xl">
              Climb the ranks.<br />Own the arena.
            </h1>
            <p className="mt-3 max-w-xl text-sm text-zinc-400 leading-relaxed">
              Track CR, ranks, placements, MVPs, and live competitive activity — powered by PostgreSQL.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <SoundLink href="/leaderboard" soundType="success" className="rounded-lg bg-gradient-to-r from-orange-500 to-red-500 px-4 py-2.5 text-sm font-bold hover:opacity-90 transition-opacity shadow-lg shadow-orange-900/30">
                🏆 Leaderboard
              </SoundLink>
              <SoundLink href="/compare" soundType="success" className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold hover:bg-white/10 hover:border-white/20 transition-colors">
                ⚔️ Compare
              </SoundLink>
              <SoundLink href="/players" soundType="success" className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold hover:bg-white/10 hover:border-white/20 transition-colors">
                👥 Players
              </SoundLink>
              <SoundLink href="/ranks" soundType="success" className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold hover:bg-white/10 hover:border-white/20 transition-colors">
                🏷️ Ranks
              </SoundLink>
            </div>
          </div>
          <div className="hidden text-8xl lg:block animate-sun-pulse shrink-0">☀️</div>
        </div>
      </section>

      {/* ── Quick stats ── */}
      <section className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Stat title="Total Players" value={totalPlayers} note="Live database" color="coral" />
        <Stat title="Ranked" value={rankedPlayers} note="Fully ranked" color="lime" />
        <Stat title="Placements" value={placementPlayers} note="7 matches to rank" color="yellow" />
        <Stat title="Avg CR" value={avgCr} note="Across all players" color="teal" />
        <Stat title="Total Matches" value={totalMatches} note="All time" color="orange" />
        <Stat title="Top Kills" value={topKills} note="Single player record" color="coral" />
      </section>

      {/* ── Top players + sidebar ── */}
      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">
        {/* Top players table */}
        <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d18] overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
            <h2 className="text-base font-black">🏆 Top Players</h2>
            <SoundLink
              href="/leaderboard"
              soundType="success"
              className="rounded-lg border border-orange-600/40 px-3 py-1.5 text-xs font-bold text-orange-300 hover:bg-orange-950/30 transition-colors"
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
                className="grid grid-cols-[44px_1fr_auto_80px] items-center border-b border-white/[0.05] px-5 py-3 hover:bg-white/[0.04] transition-colors last:border-0"
              >
                <span className="text-sm font-black text-zinc-500">
                  {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                </span>
                <div className="flex items-center gap-3 min-w-0">
                  <PlayerAvatar name={p.name} avatar={p.avatar_url} size="h-9 w-9" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{p.name || "Unknown Player"}</p>
                    <p className="text-xs text-zinc-600 truncate">{p.username || "—"}</p>
                  </div>
                </div>
                <RankBadge cr={Number(p.cr || 0)} size="sm" />
                <span className="text-right text-sm font-black text-orange-400">{(p.cr || 0).toLocaleString()}</span>
              </SoundLink>
            ))
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          <SeasonCard season={currentSeason} />

          {/* Recent activity */}
          <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d18] overflow-hidden">
            <div className="border-b border-white/[0.07] px-5 py-4">
              <h3 className="text-sm font-black">⚡ Recent Activity</h3>
            </div>
            <div className="px-3 py-2">
              {players.slice(0, 6).map((p: any) => (
                <SoundLink
                  href={`/profile/${p.user_id}`}
                  key={p.user_id}
                  soundType="click"
                  className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-white/[0.04] transition-colors"
                >
                  <PlayerAvatar name={p.name} avatar={p.avatar_url} size="h-8 w-8" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{p.name || "Unknown Player"}</p>
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black">📊 Arena Statistics</h2>
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
      <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d18] p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black">🏆 Ranked Season</h3>
          <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            Off Season
          </span>
        </div>
        <p className="text-xs text-zinc-500">No ranked season is currently running. Stay tuned for the next announcement.</p>
      </div>
    );
  }

  const statusConfig = {
    active:   { badge: "bg-green-600",  label: "LIVE",     icon: "🟢", barColor: "from-green-500 to-emerald-500" },
    paused:   { badge: "bg-yellow-600", label: "PAUSED",   icon: "⏸",  barColor: "from-yellow-500 to-amber-500" },
    ended:    { badge: "bg-red-700",    label: "ENDED",    icon: "🔴", barColor: "from-red-600 to-rose-600" },
    upcoming: { badge: "bg-blue-600",   label: "UPCOMING", icon: "🔵", barColor: "from-blue-500 to-indigo-500" },
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
    <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d18] p-5">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="text-sm font-black truncate">{season.name}</h3>
        <span className={`shrink-0 rounded-md ${cfg.badge} px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white`}>
          {cfg.label}
        </span>
      </div>
      {season.description && (
        <p className="text-xs text-zinc-500 mb-3 line-clamp-2">{season.description}</p>
      )}
      {season.start_date && season.end_date && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-zinc-600 mb-1.5">
            <span>{progressPct}% complete</span>
            {daysNote && <span className="text-orange-400 font-semibold">⏳ {daysNote}</span>}
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${cfg.barColor} transition-all duration-700`}
              style={{ width: `${progressPct}%` }}
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
  const valueColors: Record<string, string> = {
    coral:  "text-red-400",
    lime:   "text-green-400",
    yellow: "text-yellow-400",
    teal:   "text-cyan-400",
    orange: "text-orange-400",
    purple: "text-purple-400",
    green:  "text-green-400",
    blue:   "text-blue-400",
    red:    "text-red-400",
  };
  const vc = valueColors[color] ?? valueColors.coral;
  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#0d0d18] px-4 py-4">
      <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">{title}</p>
      <p className={`mt-1.5 text-2xl font-black tracking-tight ${vc}`}>{value.toLocaleString()}</p>
      <p className="mt-0.5 text-[11px] text-zinc-600">{note}</p>
    </div>
  );
}
