import Shell from "@/components/Shell";
import PlayerAvatar from "@/components/PlayerAvatar";
import SoundLink from "@/components/SoundLink";
import RankBadge from "@/components/RankBadge";
import DashboardStats from "@/components/DashboardStats";
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
      <section className="rounded-3xl border border-purple-800/40 bg-gradient-to-r from-black via-[#10051d] to-purple-950 p-8 shadow-2xl">
        <div className="flex items-center justify-between gap-8">
          <div>
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.3em] text-purple-300">Live Ranked System</p>
            <h1 className="max-w-3xl text-4xl font-black leading-tight md:text-6xl">
              Climb the ranks.<br />Own the arena.
            </h1>
            <p className="mt-4 max-w-2xl text-zinc-300">
              Track CR, ranks, placements, MVPs, player profiles, and live competitive activity powered by PostgreSQL.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <SoundLink href="/leaderboard" soundType="success" className="rounded-xl bg-purple-600 px-5 py-3 font-bold hover:bg-purple-500">
                🏆 Leaderboard
              </SoundLink>
              <SoundLink href="/compare" soundType="success" className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 font-bold hover:bg-white/10">
                ⚔️ Compare Players
              </SoundLink>
              <SoundLink href="/players" soundType="success" className="rounded-xl border border-purple-700/60 bg-purple-950/30 px-5 py-3 font-bold hover:bg-purple-950">
                👥 All Players
              </SoundLink>
              <SoundLink href="/ranks" soundType="success" className="rounded-xl border border-purple-700/60 bg-purple-950/30 px-5 py-3 font-bold hover:bg-purple-950">
                🏷️ Rank Guide
              </SoundLink>
            </div>
          </div>
          <div className="hidden text-9xl opacity-30 lg:block">🏆</div>
        </div>
      </section>

      {/* Quick stats */}
      <section className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Stat title="Total Players" value={totalPlayers} note="Live database" color="purple" />
        <Stat title="Ranked" value={rankedPlayers} note="Fully ranked" color="green" />
        <Stat title="Placements" value={placementPlayers} note="7 matches to rank" color="yellow" />
        <Stat title="Avg CR" value={avgCr} note="Across all players" color="blue" />
        <Stat title="Total Matches" value={totalMatches} note="All time" color="purple" />
        <Stat title="Top Kills" value={topKills} note="Single player record" color="red" />
      </section>

      {/* Top players + activity */}
      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-white/10 bg-[#0d0d14]">
          <div className="flex items-center justify-between border-b border-white/10 p-6">
            <h2 className="text-2xl font-black">🏆 Top Players</h2>
            <SoundLink
              href="/leaderboard"
              soundType="success"
              className="rounded-xl border border-purple-700 px-4 py-2 text-sm font-bold text-purple-300 hover:bg-purple-950"
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
                <span className="text-right text-xl font-black text-purple-400">{p.cr || 0}</span>
              </SoundLink>
            ))
          )}
        </div>

        <div className="space-y-6">
          {/* Season card */}
          <div className="rounded-2xl border border-orange-700/50 bg-orange-950/20 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black">Season One</h3>
              <span className="rounded-lg bg-orange-600 px-3 py-1 text-xs font-black tracking-wider text-white">
                OFF SEASON
              </span>
            </div>
            <p className="mt-2 text-sm text-zinc-400">2026 Season</p>
            <div className="mt-4 rounded-xl border border-orange-700/30 bg-orange-950/30 px-4 py-3">
              <p className="text-sm font-bold text-orange-300">⏸ Season Paused</p>
              <p className="mt-1 text-xs text-zinc-400">
                The ranked season is currently on break. Stay tuned for the next season start date.
              </p>
            </div>
            <p className="mt-4 text-xs text-zinc-500">Next season coming soon</p>
          </div>

          {/* Recent activity */}
          <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
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
    </Shell>
  );
}

function Stat({
  title,
  value,
  note,
  color = "purple",
}: {
  title: string;
  value: number;
  note: string;
  color?: "purple" | "green" | "yellow" | "blue" | "red";
}) {
  const noteColors = {
    purple: "text-purple-500",
    green:  "text-green-600",
    yellow: "text-yellow-600",
    blue:   "text-blue-500",
    red:    "text-red-500",
  };
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-5">
      <p className="text-xs text-zinc-400">{title}</p>
      <p className="mt-2 text-2xl font-black">{value.toLocaleString()}</p>
      <p className={`mt-1 text-xs font-semibold ${noteColors[color]}`}>{note}</p>
    </div>
  );
}
