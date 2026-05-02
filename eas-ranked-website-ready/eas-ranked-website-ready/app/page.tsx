import Link from "next/link";
import { getRank } from "@/lib/ranks";

type Player = {
  user_id: string;
  name: string;
  username?: string | null;
  avatar_url?: string | null;
  cr: number;
  wins: number;
  losses: number;
  kills: number;
  matches: number;
  mvp_count: number;
  ranked: boolean;
  registered: boolean;
  placement_matches: number;
};

async function getPlayers(): Promise<Player[]> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "";
  const res = await fetch(`${base}/api/leaderboard`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

function Avatar({ url, name }: { url?: string | null; name: string }) {
  if (url) return <img src={url} alt={name} className="h-11 w-11 rounded-full border border-violet-400/30 object-cover" />;
  return <div className="grid h-11 w-11 place-items-center rounded-full border border-violet-400/30 bg-violet-500/20 font-bold">{name?.[0]?.toUpperCase() || "?"}</div>;
}

export default async function Home() {
  const players = await getPlayers();
  const top = players[0];
  const ranked = players.filter(p => p.ranked).length;
  const registered = players.filter(p => p.registered).length;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#32155f_0%,#090914_45%,#05050a_100%)] px-5 py-8 text-white">
      <section className="mx-auto max-w-6xl">
        <div className="mb-8 rounded-3xl border border-violet-400/20 bg-black/35 p-6 shadow-2xl shadow-violet-900/20 backdrop-blur">
          <p className="text-sm uppercase tracking-[0.35em] text-violet-300">Elevate All-Stars</p>
          <h1 className="mt-3 text-4xl font-black md:text-6xl">EAS Ranked Dashboard</h1>
          <p className="mt-3 max-w-2xl text-zinc-300">Live CR leaderboard, player stats, placements, MVPs, and competitive profiles powered directly by your PostgreSQL database.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-zinc-400">Players Loaded</p><p className="text-3xl font-black">{players.length}</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-zinc-400">Ranked</p><p className="text-3xl font-black">{ranked}</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-zinc-400">Registered</p><p className="text-3xl font-black">{registered}</p></div>
          </div>
        </div>

        {top && (
          <div className="mb-6 rounded-3xl border border-yellow-300/20 bg-yellow-400/10 p-5">
            <p className="text-sm font-bold text-yellow-200">Current #1</p>
            <div className="mt-3 flex items-center gap-4">
              <Avatar url={top.avatar_url} name={top.name} />
              <div>
                <Link href={`/profile/${top.user_id}`} className="text-2xl font-black hover:text-yellow-200">{top.name}</Link>
                <p className="text-zinc-300">{top.cr} CR • {getRank(top.cr)} • {top.wins}W-{top.losses}L</p>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/40 shadow-2xl">
          <div className="border-b border-white/10 p-5">
            <h2 className="text-2xl font-black">Leaderboard</h2>
            <p className="text-sm text-zinc-400">Sorted by CR. Unknown names will update as players use bot commands.</p>
          </div>
          <div className="divide-y divide-white/10">
            {players.map((player, index) => (
              <Link href={`/profile/${player.user_id}`} key={player.user_id} className="grid grid-cols-[52px_1fr_auto] items-center gap-3 p-4 transition hover:bg-white/5">
                <div className="text-center text-lg font-black text-zinc-400">#{index + 1}</div>
                <div className="flex items-center gap-3">
                  <Avatar url={player.avatar_url} name={player.name} />
                  <div>
                    <p className="font-bold">{player.name || "Unknown Player"}</p>
                    <p className="text-sm text-zinc-400">{player.ranked ? getRank(player.cr) : `Placements ${player.placement_matches}/7`}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-violet-200">{player.cr} CR</p>
                  <p className="text-sm text-zinc-400">{player.wins}W-{player.losses}L • {player.kills} K</p>
                </div>
              </Link>
            ))}
            {players.length === 0 && <div className="p-8 text-center text-zinc-400">No players found. Check DATABASE_URL in Railway.</div>}
          </div>
        </div>
      </section>
    </main>
  );
}
