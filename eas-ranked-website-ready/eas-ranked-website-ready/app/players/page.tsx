import Link from "next/link";
import Shell from "@/components/Shell";
import PlayerAvatar from "@/components/PlayerAvatar";
import { syncPlayersFromDB } from "@/lib/cache";

export const revalidate = 30;

async function getPlayers() {
  return syncPlayersFromDB();
}

export default async function PlayersPage() {
  const players = await getPlayers();

  return (
    <Shell>
      <h1 className="text-4xl font-black">👥 Players</h1>
      <p className="mt-2 text-zinc-400">All stored players from the EAS database.</p>
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {players.map((p: any) => (
          <Link href={`/profile/${p.user_id}`} key={p.user_id} className="rounded-2xl border border-white/10 bg-[#0d0d14] p-5 hover:border-purple-700">
            <div className="flex items-center gap-4">
              <PlayerAvatar name={p.name} avatar={p.avatar_url} />
              <div>
                <p className="text-lg font-black">{p.name}</p>
                <p className="text-xs text-zinc-500">{p.username || "No username saved"}</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              <Mini label="CR" value={p.cr || 0} />
              <Mini label="Wins" value={p.wins || 0} />
              <Mini label="Kills" value={p.kills || 0} />
            </div>
          </Link>
        ))}
      </div>
    </Shell>
  );
}

function Mini({ label, value }: { label: string; value: any }) {
  return <div className="rounded-xl bg-white/5 p-3"><p className="text-xs text-zinc-500">{label}</p><p className="font-black">{value}</p></div>;
}
