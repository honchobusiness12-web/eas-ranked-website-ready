import Link from "next/link";
import Shell from "@/components/Shell";
import PlayerAvatar from "@/components/PlayerAvatar";
import {
  getPlayersFromCache,
  syncPlayersFromDB,
  secondsSinceUpdate,
} from "@/lib/cache";
import { pool } from "@/lib/db";

async function getAllPlayers() {
  let players = getPlayersFromCache();
  if (players.length === 0) {
    await syncPlayersFromDB();
    players = getPlayersFromCache();
  }
  if (players.length === 0) {
    try {
      const result = await pool.query(`
        SELECT
          guild_id, user_id,
          COALESCE(data->>'display_name', data->>'username', 'Unknown Player') AS name,
          data->>'username' AS username,
          data->>'avatar_url' AS avatar_url,
          COALESCE((data->>'cr')::int, 0) AS cr,
          COALESCE((data->>'wins')::int, 0) AS wins,
          COALESCE((data->>'losses')::int, 0) AS losses,
          COALESCE((data->>'kills')::int, 0) AS kills,
          COALESCE((data->>'matches')::int, 0) AS matches,
          COALESCE((data->>'mvp_count')::int, 0) AS mvp_count,
          COALESCE((data->>'placement_matches')::int, 0) AS placement_matches,
          COALESCE((data->>'ranked')::boolean, false) AS ranked,
          COALESCE((data->>'registered')::boolean, false) AS registered,
          COALESCE((data->>'blacklisted')::boolean, false) AS blacklisted
        FROM players
        WHERE COALESCE((data->>'blacklisted')::boolean, false) = false
        ORDER BY cr DESC LIMIT 250
      `);
      return result.rows;
    } catch {
      return [];
    }
  }
  return players;
}

export default async function PlacementsPage() {
  const allPlayers = await getAllPlayers();
  const players = allPlayers.filter((p: any) => p.registered && !p.ranked);
  const lastUpdatedSecs = secondsSinceUpdate();
  const lastUpdatedLabel =
    lastUpdatedSecs === null
      ? "DB fallback"
      : lastUpdatedSecs < 60
      ? `${lastUpdatedSecs}s ago`
      : `${Math.floor(lastUpdatedSecs / 60)}m ago`;

  return (
    <Shell>
      <h1 className="text-4xl font-black">📋 Placements</h1>
      <p className="mt-2 text-zinc-400">
        Players currently completing placement matches.{" "}
        <span className="text-purple-400">Last updated: {lastUpdatedLabel}</span>
      </p>
      <div className="mt-6 rounded-2xl border border-white/10 bg-[#0d0d14]">
        {players.length === 0 ? (
          <p className="p-6 text-zinc-400">No players are currently in placements.</p>
        ) : (
          players.map((p: any) => {
            const done = Number(p.placement_matches || 0);
            const percent = Math.min(100, Math.round((done / 7) * 100));
            return (
              <Link href={`/profile/${p.user_id}`} key={p.user_id} className="block border-b border-white/10 p-6 hover:bg-white/5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <PlayerAvatar name={p.name} avatar={p.avatar_url} />
                    <div>
                      <p className="font-black">{p.name}</p>
                      <p className="text-xs text-zinc-500">{done}/7 placement matches complete</p>
                    </div>
                  </div>
                  <p className="font-black text-purple-400">{percent}%</p>
                </div>
                <div className="mt-4 h-2 rounded-full bg-zinc-800">
                  <div className="h-2 rounded-full bg-purple-500" style={{ width: `${percent}%` }} />
                </div>
              </Link>
            );
          })
        )}
      </div>
    </Shell>
  );
}
