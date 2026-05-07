import Shell from "@/components/Shell";
import PlayerAvatar from "@/components/PlayerAvatar";
import SoundLink from "@/components/SoundLink";
import { syncPlayersFromDB } from "@/lib/cache";

export const revalidate = 30;

async function getAllPlayers() {
  return syncPlayersFromDB();
}

export default async function PlacementsPage() {
  const allPlayers = await getAllPlayers();
  const players = allPlayers.filter((p: any) => p.registered && !p.ranked);

  return (
    <Shell>
      <h1 className="text-4xl font-black">📋 Placements</h1>
      <p className="mt-2 text-zinc-400">Players currently completing placement matches.</p>
      <div className="mt-6 rounded-2xl border border-white/10 bg-[#0d0d14]">
        {players.length === 0 ? (
          <p className="p-6 text-zinc-400">No players are currently in placements.</p>
        ) : (
          players.map((p: any) => {
            const done = Number(p.placement_matches || 0);
            const percent = Math.min(100, Math.round((done / 7) * 100));
            return (
              <SoundLink href={`/profile/${p.user_id}`} key={p.user_id} soundType="click" className="block border-b border-white/10 p-6 hover:bg-white/5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <PlayerAvatar name={p.name} avatar={p.avatar_url} />
                    <div>
                      <p className="font-black">{p.name}</p>
                      <p className="text-xs text-zinc-500">{done}/7 placement matches complete</p>
                    </div>
                  </div>
                  <p className="font-black text-orange-400">{percent}%</p>
                </div>
                <div className="mt-4 h-2 rounded-full bg-zinc-800">
                  <div className="h-2 rounded-full bg-gradient-to-r from-orange-500 to-yellow-500" style={{ width: `${percent}%` }} />
                </div>
              </SoundLink>
            );
          })
        )}
      </div>
    </Shell>
  );
}
