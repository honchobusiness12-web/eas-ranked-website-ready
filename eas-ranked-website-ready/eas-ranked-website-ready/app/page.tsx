import Shell from "@/components/ServerShell";
import PlayerAvatar from "@/components/PlayerAvatar";
import SoundLink from "@/components/SoundLink";
import RankBadge from "@/components/RankBadge";
import DashboardStats from "@/components/DashboardStats";
import PremiumUpsell from "@/components/PremiumUpsell";
import { syncPlayersFromDB } from "@/lib/cache";

export const revalidate = 30;

async function getPlayers() {
  return syncPlayersFromDB();
}

export default async function HomePage() {
  const players = await getPlayers();

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
      {/* Hero */}
      <section className="summer-hero-gradient rounded-3xl border border-orange-700/30 p-8 shadow-2xl overflow-hidden relative">
        {/* Decorative sun glow */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-yellow-500/10 blur-3xl animate-sun-pulse" />
        <div className="pointer-events-none absolute right-32 bottom-0 h-40 w-40 rounded-full bg-orange-500/10 blur-2xl animate-sun-pulse" style={{ animationDelay: "1.5s" }} />
        <div className="relative flex items-center justify-between gap-8">
          <div>
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.3em] text-orange-300">☀️ Live Ranked System</p>
            <h1 className="max-w-3xl text-4xl font-black leading-tight md:text-6xl">
              Climb the ranks.<br />Own the arena.
            </h1>
            <p className="mt-4 max-w-2xl text-zinc-300">
              Track CR, ranks, placements, MVPs, player profiles, and live competitive activity powered by PostgreSQL.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <SoundLink href="/leaderboard" soundType="success" className="rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-5 py-3 font-bold hover:from-orange-400 hover:to-red-400 transition-all shadow-lg shadow-orange-900/40">
                🏆 Leaderboard
              </SoundLink>
              <SoundLink href="/compare" soundType="success" className="rounded-xl border border-teal-500/40 bg-teal-950/30 px-5 py-3 font-bold hover:bg-teal-900/40 hover:border-teal-400/60 transition-all">
                ⚔️ Compare Players
              </SoundLink>
              <SoundLink href="/players" soundType="success" className="rounded-xl border border-yellow-600/40 bg-yellow-950/20 px-5 py-3 font-bold hover:bg-yellow-900/30 hover:border-yellow-500/60 transition-all">
                👥 All Players
              </SoundLink>
              <SoundLink href="/ranks" soundType="success" className="rounded-xl border border-orange-700/40 bg-orange-950/20 px-5 py-3 font-bold hover:bg-orange-900/30 hover:border-orange-500/60 transition-all">
                🏷️ Rank Guide
              </SoundLink>
            </div>
          </div>
          <div className="hidden text-9xl lg:block animate-sun-pulse">☀️</div>
        </div>
      </section>

      {/* Quick stats */}
      <section className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Stat title="Total Players" value={totalPlayers} note="Live database" color="coral" />
        <Stat title="Ranked" value={rankedPlayers} note="Fully ranked" color="lime" />
        <Stat title="Placements" value={placementPlayers} note="7 matches to rank" color="yellow" />
        <Stat title="Avg CR" value={avgCr} note="Across all players" color="teal" />
        <Stat title="Total Matches" value={totalMatches} note="All time" color="orange" />
        <Stat title="Top Kills" value={topKills} note="Single player record" color="coral" />
      </section>

      {/* Top players + activity */}
      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-orange-700/20 bg-[#0d0d14]">
          <div className="flex items-center justify-between border-b border-orange-700/20 p-6">
            <h2 className="text-2xl font-black">🏆 Top Players</h2>
            <SoundLink
              href="/leaderboard"
              soundType="success"
              className="rounded-xl border border-orange-600/50 px-4 py-2 text-sm font-bold text-orange-300 hover:bg-orange-950/40 transition-all"
            >
              Full Board →
            </SoundLink>
          </div>

          {players.length === 0 ? (
            <p className="p-6 text-zinc-400">No players found. Check DATABASE_URL in Railway.</p>
          ) : (
            players.slice(0, 10).map((p: any, index: number) => (
              <SoundLink
                href={`/profile/${p.user_id}`}
                key={p.user_id}
                soundType="click"
                className="grid grid-cols-[50px_1fr_auto_90px] items-center border-b border-white/10 px-6 py-4 hover:bg-white/5 transition"
              >
                <span className="text-xl font-black">
                  {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                </span>
                <div className="flex items-center gap-4 min-w-0">
                  <PlayerAvatar name={p.name} avatar={p.avatar_url} />
                  <div className="min-w-0">
                    <p className="font-black truncate">{p.name || "Unknown Player"}</p>
                    <p className="text-xs text-zinc-500 truncate">{p.username || "No username saved yet"}</p>
                  </div>
                </div>
                <RankBadge cr={Number(p.cr || 0)} size="sm" />
                <span className="text-right text-xl font-black text-orange-400">{p.cr || 0}</span>
              </SoundLink>
            ))
          )}
        </div>

        <div className="space-y-6">
          {/* Season card */}
          <div className="rounded-2xl border border-yellow-600/40 bg-gradient-to-br from-orange-950/30 to-yellow-950/20 p-6 relative overflow-hidden">
            {/* Subtle sun glow */}
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-yellow-500/10 blur-2xl" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black">☀️ Summer Season</h3>
                <span className="rounded-lg bg-gradient-to-r from-orange-500 to-yellow-500 px-3 py-1 text-xs font-black tracking-wider text-white shadow-md">
                  OFF SEASON
                </span>
              </div>
              <p className="mt-2 text-sm text-zinc-400">2026 Season</p>
              <div className="mt-4 rounded-xl border border-yellow-700/30 bg-yellow-950/20 px-4 py-3">
                <p className="text-sm font-bold text-yellow-300">⏸ Season Paused</p>
                <p className="mt-1 text-xs text-zinc-400">
                  The ranked season is currently on break. Stay tuned for the next season start date.
                </p>
              </div>
              <p className="mt-4 text-xs text-zinc-500">🌊 Next season coming soon</p>
            </div>
          </div>

          {/* Recent activity */}
          <div className="rounded-2xl border border-teal-700/20 bg-[#0d0d14] p-6">
            <h3 className="text-xl font-black">⚡ Recent Activity</h3>
            <div className="mt-5 space-y-3">
              {players.slice(0, 6).map((p: any) => (
                <SoundLink
                  href={`/profile/${p.user_id}`}
                  key={p.user_id}
                  soundType="click"
                  className="flex items-center gap-3 rounded-xl p-2 hover:bg-white/5 transition"
                >
                  <PlayerAvatar name={p.name} avatar={p.avatar_url} size="h-9 w-9" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{p.name || "Unknown Player"}</p>
                    <p className="text-xs text-zinc-500">{p.cr || 0} CR · {p.wins || 0}W</p>
                  </div>
                  <RankBadge cr={Number(p.cr || 0)} size="sm" showLabel={false} />
                </SoundLink>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard stats section */}
      <section className="mt-6">
        <h2 className="mb-4 text-2xl font-black">📊 Arena Statistics</h2>
        <DashboardStats players={players as any} />
      </section>

      {/* Premium upsell */}
      <section className="mt-6">
        <PremiumUpsell />
      </section>
    </Shell>
  );
}

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
    <div className={`rounded-2xl border ${s.border} ${s.glow} bg-[#0d0d14] p-5`}>
      <p className="text-xs text-zinc-400">{title}</p>
      <p className="mt-2 text-2xl font-black">{value.toLocaleString()}</p>
      <p className={`mt-1 text-xs font-semibold ${s.note}`}>{note}</p>
    </div>
  );
}
