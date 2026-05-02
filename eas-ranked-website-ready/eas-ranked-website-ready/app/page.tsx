import Link from "next/link";
import Shell from "@/components/Shell";
import PlayerAvatar from "@/components/PlayerAvatar";
import { getRank } from "@/lib/ranks";

async function getPlayers() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/leaderboard`, { cache: "no-store" });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const players = await getPlayers();
  const totalPlayers = players.length;
  const rankedPlayers = players.filter((p: any) => p.ranked).length;
  const placementPlayers = players.filter((p: any) => p.registered && !p.ranked).length;
  const totalMatches = players.reduce((sum: number, p: any) => sum + Number(p.matches || 0), 0);
  const avgCr = players.length ? Math.round(players.reduce((sum: number, p: any) => sum + Number(p.cr || 0), 0) / players.length) : 0;

  return (
    <Shell>
      <section className="rounded-3xl border border-purple-800/40 bg-gradient-to-r from-black via-[#10051d] to-purple-950 p-8 shadow-2xl">
        <div className="flex items-center justify-between gap-8">
          <div>
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.3em] text-purple-300">Live Ranked System</p>
            <h1 className="max-w-3xl text-4xl font-black leading-tight md:text-6xl">Climb the ranks. Own the arena.</h1>
            <p className="mt-4 max-w-2xl text-zinc-300">Track CR, ranks, placements, MVPs, player profiles, and live competitive activity powered by PostgreSQL.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/leaderboard" className="rounded-xl bg-purple-600 px-5 py-3 font-bold hover:bg-purple-500">View Leaderboard</Link>
              <Link href="/ranks" className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 font-bold hover:bg-white/10">Learn Ranks</Link>
              <Link href="/players" className="rounded-xl border border-purple-700/60 bg-purple-950/30 px-5 py-3 font-bold hover:bg-purple-950">Search Players</Link>
            </div>
          </div>
          <div className="hidden text-9xl opacity-30 lg:block">🏆</div>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <Stat title="Total Players" value={totalPlayers} note="Live database" />
        <Stat title="Ranked Players" value={rankedPlayers} note="Updated by bot" />
        <Stat title="Placements" value={placementPlayers} note="7 matches to rank" />
        <Stat title="Average CR" value={avgCr} note={`${totalMatches} total matches`} />
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-white/10 bg-[#0d0d14]">
          <div className="flex items-center justify-between border-b border-white/10 p-6">
            <div>
              <h2 className="text-2xl font-black">🏆 Top Players</h2>
              <p className="text-sm text-zinc-400">Pulled live from PostgreSQL</p>
            </div>
            <Link href="/leaderboard" className="rounded-xl border border-purple-700 px-4 py-2 text-sm font-bold text-purple-300 hover:bg-purple-950">Full Board</Link>
          </div>

          {players.length === 0 ? (
            <p className="p-6 text-zinc-400">No players found. Check DATABASE_URL in Railway.</p>
          ) : (
            players.slice(0, 10).map((p: any, index: number) => (
              <Link href={`/profile/${p.user_id}`} key={p.user_id} className="grid grid-cols-[50px_1fr_95px_100px] items-center border-b border-white/10 px-6 py-4 hover:bg-white/5">
                <span className="text-xl">{index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}</span>
                <div className="flex items-center gap-4">
                  <PlayerAvatar name={p.name} avatar={p.avatar_url} />
                  <div>
                    <p className="font-black">{p.name || "Unknown Player"}</p>
                    <p className="text-xs text-zinc-500">{p.username || "No username saved yet"}</p>
                  </div>
                </div>
                <span className="rounded-lg border border-purple-600 px-3 py-1 text-center text-xs text-purple-300">{getRank(Number(p.cr || 0)).split(" ").slice(0, 2).join(" ")}</span>
                <span className="text-right text-xl font-black text-purple-400">{p.cr || 0}</span>
              </Link>
            ))
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-purple-700/50 bg-purple-950/30 p-6">
            <h3 className="text-xl font-black">Season One Live</h3>
            <p className="mt-2 text-sm text-zinc-400">2026 Season</p>
            <span className="mt-6 inline-block rounded-lg bg-green-600 px-3 py-1 text-xs font-bold">LIVE</span>
            <p className="mt-5 text-zinc-300">Compete, climb, and become a legend.</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
            <h3 className="text-xl font-black">⚡ Recent Activity</h3>
            <div className="mt-5 space-y-4">
              {players.slice(0, 5).map((p: any) => (
                <Link href={`/profile/${p.user_id}`} key={p.user_id} className="flex items-center gap-3 rounded-xl p-2 hover:bg-white/5">
                  <PlayerAvatar name={p.name} avatar={p.avatar_url} size="h-9 w-9" />
                  <div>
                    <p className="font-bold">{p.name || "Unknown Player"}</p>
                    <p className="text-xs text-zinc-500">Currently at {p.cr || 0} CR</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </Shell>
  );
}

function Stat({ title, value, note }: { title: string; value: number; note: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-5">
      <p className="text-sm text-zinc-400">{title}</p>
      <p className="mt-3 text-3xl font-black">{value.toLocaleString()}</p>
      <p className="mt-1 text-sm text-green-400">{note}</p>
    </div>
  );
}
