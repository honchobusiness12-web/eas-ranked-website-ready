import Link from "next/link";
import Shell from "@/components/Shell";
import PlayerAvatar from "@/components/PlayerAvatar";
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

export default async function PlayersPage() {
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
      <h1 className="text-4xl font-black">👥 Players</h1>
      <p className="mt-2 text-zinc-400">
        All stored players from the EAS database.{" "}
        <span className="text-purple-400">Last updated: {lastUpdatedLabel}</span>
      </p>
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
