import Shell from "@/components/Shell";
import PlayerAvatar from "@/components/PlayerAvatar";
import { getRank, getNextRank } from "@/lib/ranks";
import { getPlayerFromCache, getPlayerFromDB, secondsSinceUpdate } from "@/lib/cache";

async function getProfile(userId: string) {
  // Try cache first; fall back to a direct DB query.
  const cached = getPlayerFromCache(userId);
  if (cached) return cached;
  return getPlayerFromDB(userId);
}

export default async function ProfilePage(context: { params: Promise<{ userId: string }> }) {
  const { userId } = await context.params;
  const p = await getProfile(userId);
  const lastUpdatedSecs = secondsSinceUpdate();
  const lastUpdatedLabel =
    lastUpdatedSecs === null
      ? "DB fallback"
      : lastUpdatedSecs < 60
      ? `${lastUpdatedSecs}s ago`
      : `${Math.floor(lastUpdatedSecs / 60)}m ago`;

  if (!p) {
    return <Shell><h1 className="text-4xl font-black">Player Not Found</h1><p className="mt-2 text-zinc-400">This player does not exist in the database.</p></Shell>;
  }

  const cr = Number(p.cr || 0);
  const rank = getRank(cr);
  const next = getNextRank(cr);
  const matches = Number(p.matches || 0);
  const winRate = matches ? Math.round((Number(p.wins || 0) / matches) * 100) : 0;

  return (
    <Shell>
      <section className="rounded-3xl border border-purple-800/40 bg-gradient-to-r from-black via-[#10051d] to-purple-950 p-8">
        <div className="flex flex-wrap items-center gap-6">
          <PlayerAvatar name={p.name} avatar={p.avatar_url} size="h-24 w-24" />
          <div>
            <h1 className="text-5xl font-black">{p.name}</h1>
            <p className="mt-2 text-zinc-400">{p.username || "No username saved yet"}</p>
            <p className="mt-3 inline-block rounded-xl border border-purple-600 px-4 py-2 text-purple-300">{rank}</p>
            <p className="mt-2 text-xs text-purple-400/70">Last updated: {lastUpdatedLabel}</p>
          </div>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <Stat title="CR" value={cr} />
        <Stat title="Record" value={`${p.wins || 0}W-${p.losses || 0}L`} />
        <Stat title="Kills" value={p.kills || 0} />
        <Stat title="Win Rate" value={`${winRate}%`} />
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
          <h2 className="text-2xl font-black">📈 Rank Progress</h2>
          {next ? (
            <>
              <p className="mt-2 text-zinc-400">Next rank: {next.name} at {next.min} CR</p>
              <div className="mt-5 h-3 rounded-full bg-zinc-800">
                <div className="h-3 rounded-full bg-purple-500" style={{ width: `${Math.min(100, Math.round((cr / next.min) * 100))}%` }} />
              </div>
            </>
          ) : <p className="mt-2 text-zinc-400">Max rank reached.</p>}

          <h2 className="mt-8 text-2xl font-black">📜 History</h2>
          <div className="mt-4 space-y-3">
            {(p.history || []).slice(-10).reverse().map((item: string, index: number) => (
              <div key={index} className="rounded-xl bg-white/5 p-3 text-sm text-zinc-300">{item}</div>
            ))}
            {(!p.history || p.history.length === 0) && <p className="text-zinc-500">No history saved.</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
          <h2 className="text-2xl font-black">Player Status</h2>
          <div className="mt-5 space-y-3">
            <Badge label="Registered" active={p.registered} />
            <Badge label="Ranked" active={p.ranked} />
            <Badge label="Blacklisted" active={p.blacklisted} danger />
          </div>
        </div>
      </section>
    </Shell>
  );
}

function Stat({ title, value }: { title: string; value: any }) {
  return <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-5"><p className="text-sm text-zinc-400">{title}</p><p className="mt-3 text-3xl font-black">{value}</p></div>;
}

function Badge({ label, active, danger }: { label: string; active: boolean; danger?: boolean }) {
  return <div className="flex items-center justify-between rounded-xl bg-white/5 p-3"><span>{label}</span><span className={`rounded-lg px-3 py-1 text-xs font-bold ${active ? danger ? "bg-red-600" : "bg-green-600" : "bg-zinc-700"}`}>{active ? "YES" : "NO"}</span></div>;
}
