import Link from "next/link";
import Shell from "@/components/Shell";
import PlayerAvatar from "@/components/PlayerAvatar";
import { getRank } from "@/lib/ranks";
import {
  getPlayersFromCache,
  syncPlayersFromDB,
  secondsSinceUpdate,
} from "@/lib/cache";
import { pool } from "@/lib/db";

async function getPlayers() {
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

export default async function LeaderboardPage() {
  const players = await getPlayers();
  const lastUpdatedSecs = secondsSinceUpdate();
  const lastUpdatedLabel =
    lastUpdatedSecs === null
      ? "DB fallback"
      : lastUpdatedSecs < 60
      ? `${lastUpdatedSecs}s ago`
      : `${Math.floor(lastUpdatedSecs / 60)}m ago`;

  return (
    <Shell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black">🏆 Leaderboard</h1>
          <p className="mt-2 text-zinc-400">Last updated: {lastUpdatedLabel}</p>
        </div>
        <a href="/leaderboard" className="rounded-xl bg-purple-600 px-4 py-2 font-bold hover:bg-purple-500">Refresh</a>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0d0d14]">
        {players.length === 0 ? (
          <p className="p-6 text-zinc-400">No leaderboard data found.</p>
        ) : (
          players.map((p: any, index: number) => (
            <Link href={`/profile/${p.user_id}`} key={p.user_id} className="grid grid-cols-[60px_1fr_120px_100px_100px] items-center border-b border-white/10 px-6 py-4 hover:bg-white/5">
              <span className="text-xl font-black">#{index + 1}</span>
              <div className="flex items-center gap-4">
                <PlayerAvatar name={p.name} avatar={p.avatar_url} />
                <div>
                  <p className="font-black">{p.name}</p>
                  <p className="text-xs text-zinc-500">{p.username || "No username saved"}</p>
                </div>
              </div>
              <span className="text-sm text-purple-300">{getRank(Number(p.cr || 0))}</span>
              <span className="text-right font-black text-purple-400">{p.cr || 0} CR</span>
              <span className="text-right text-sm text-zinc-400">{p.wins || 0}W - {p.losses || 0}L</span>
            </Link>
          ))
        )}
      </div>
    </Shell>
  );
}
