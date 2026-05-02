import Link from "next/link";
import { getRank } from "@/lib/ranks";

type Profile = {
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
  placement_matches: number;
  ranked: boolean;
  registered: boolean;
  history: string[];
};

async function getProfile(userId: string): Promise<Profile | null> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "";
  const res = await fetch(`${base}/api/profile/${userId}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export default async function ProfilePage({ params }: { params: { userId: string } }) {
  const player = await getProfile(params.userId);
  if (!player) {
    return <main className="grid min-h-screen place-items-center bg-[#070712] text-white"><div><h1 className="text-3xl font-black">Player not found</h1><Link className="text-violet-300" href="/">Back to leaderboard</Link></div></main>;
  }

  const winRate = player.matches > 0 ? Math.round((player.wins / player.matches) * 1000) / 10 : 0;
  const avgKills = player.matches > 0 ? Math.round((player.kills / player.matches) * 100) / 100 : 0;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#32155f_0%,#090914_45%,#05050a_100%)] px-5 py-8 text-white">
      <section className="mx-auto max-w-5xl">
        <Link href="/" className="text-sm text-violet-300 hover:text-violet-100">← Back to leaderboard</Link>
        <div className="mt-5 rounded-3xl border border-violet-400/20 bg-black/40 p-6 shadow-2xl shadow-violet-900/20">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            {player.avatar_url ? <img src={player.avatar_url} alt={player.name} className="h-24 w-24 rounded-3xl border border-violet-400/30 object-cover" /> : <div className="grid h-24 w-24 place-items-center rounded-3xl border border-violet-400/30 bg-violet-500/20 text-4xl font-black">{player.name?.[0]?.toUpperCase() || "?"}</div>}
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-violet-300">Player Profile</p>
              <h1 className="text-4xl font-black">{player.name}</h1>
              <p className="mt-2 text-zinc-300">{player.ranked ? getRank(player.cr) : `Placements ${player.placement_matches}/7`} • {player.cr} CR</p>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="CR" value={player.cr} />
            <Stat label="Wins" value={player.wins} />
            <Stat label="Losses" value={player.losses} />
            <Stat label="Kills" value={player.kills} />
            <Stat label="Win Rate" value={`${winRate}%`} />
            <Stat label="Avg Kills" value={avgKills} />
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-white/10 bg-black/40 p-6">
          <h2 className="text-2xl font-black">Recent History</h2>
          <div className="mt-4 space-y-2">
            {(player.history || []).slice(-10).reverse().map((item, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-zinc-300">{item}</div>
            ))}
            {(!player.history || player.history.length === 0) && <p className="text-zinc-400">No history yet.</p>}
          </div>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-sm text-zinc-400">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>;
}
