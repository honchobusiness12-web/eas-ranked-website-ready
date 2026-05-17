import { getRankDistribution } from "@/lib/charts";
import { RankDistributionChart } from "@/components/StatsChart";
import type { CachedPlayer } from "@/lib/cache";
import PlayerAvatar from "@/components/PlayerAvatar";
import SoundLink from "@/components/SoundLink";
import TrendingIndicator from "@/components/TrendingIndicator";

interface DashboardStatsProps {
  players: CachedPlayer[];
}

export default function DashboardStats({ players }: DashboardStatsProps) {
  const ranked = players.filter((p) => p.ranked);
  const buckets = getRankDistribution(ranked);

  // Top 5 by CR
  const topPlayers = [...players].sort((a, b) => Number(b.cr) - Number(a.cr)).slice(0, 5);

  // Top MVPs
  const topMvps = [...players]
    .filter((p) => Number(p.mvp_count || 0) > 0)
    .sort((a, b) => Number(b.mvp_count) - Number(a.mvp_count))
    .slice(0, 5);

  // Highest win rates (min 10 matches)
  const topWinRates = [...players]
    .filter((p) => Number(p.matches || 0) >= 10)
    .map((p) => ({
      ...p,
      winRate: Math.round((Number(p.wins || 0) / Number(p.matches || 1)) * 100),
    }))
    .sort((a, b) => b.winRate - a.winRate)
    .slice(0, 5);

  return (
    <div className="space-y-4">
      {/* ── Rank Distribution ── */}
      <div className="rounded-2xl border border-white/[0.06] p-5 backdrop-blur-sm" style={{ background: "rgba(11,11,31,0.8)" }}>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/15 text-sm">📊</div>
          <h3 className="text-sm font-black tracking-tight">Rank Distribution</h3>
        </div>
        <RankDistributionChart buckets={buckets} totalPlayers={ranked.length} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Top CR */}
        <div className="rounded-2xl border border-white/[0.06] p-4 backdrop-blur-sm" style={{ background: "rgba(11,11,31,0.8)" }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-500/15 text-xs">🏆</div>
            <h3 className="text-sm font-black tracking-tight">Top CR</h3>
          </div>
          <div className="space-y-0.5">
            {topPlayers.map((p, i) => (
              <SoundLink
                key={p.user_id}
                href={`/profile/${p.user_id}`}
                soundType="click"
                className="group flex items-center gap-2.5 rounded-xl px-2 py-2 transition-all duration-200 hover:bg-purple-500/[0.05]"
              >
                <span className="w-5 text-xs font-black text-zinc-700">#{i + 1}</span>
                <PlayerAvatar name={p.name} avatar={p.avatar_url} size="h-7 w-7" />
                <span className="flex-1 text-xs font-semibold truncate group-hover:text-white transition-colors">{p.name}</span>
                <span className="text-xs font-black text-purple-400">{Number(p.cr).toLocaleString()}</span>
              </SoundLink>
            ))}
          </div>
        </div>

        {/* Top MVPs */}
        <div className="rounded-2xl border border-white/[0.06] p-4 backdrop-blur-sm" style={{ background: "rgba(11,11,31,0.8)" }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-yellow-500/15 text-xs">🌟</div>
            <h3 className="text-sm font-black tracking-tight">Top MVPs</h3>
          </div>
          <div className="space-y-0.5">
            {topMvps.length === 0 ? (
              <p className="text-xs text-zinc-600 px-2 py-2">No MVP data yet.</p>
            ) : (
              topMvps.map((p, i) => (
                <SoundLink
                  key={p.user_id}
                  href={`/profile/${p.user_id}`}
                  soundType="click"
                  className="group flex items-center gap-2.5 rounded-xl px-2 py-2 transition-all duration-200 hover:bg-yellow-500/[0.05]"
                >
                  <span className="w-5 text-xs font-black text-zinc-700">#{i + 1}</span>
                  <PlayerAvatar name={p.name} avatar={p.avatar_url} size="h-7 w-7" />
                  <span className="flex-1 text-xs font-semibold truncate group-hover:text-white transition-colors">{p.name}</span>
                  <span className="text-xs font-black text-yellow-400">{p.mvp_count} MVP</span>
                </SoundLink>
              ))
            )}
          </div>
        </div>

        {/* Top Win Rates */}
        <div className="rounded-2xl border border-white/[0.06] p-4 backdrop-blur-sm" style={{ background: "rgba(11,11,31,0.8)" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-green-500/15 text-xs">📈</div>
              <h3 className="text-sm font-black tracking-tight">Best Win Rate</h3>
            </div>
            <span className="text-[10px] text-zinc-700 font-medium">Min. 10 matches</span>
          </div>
          <div className="space-y-0.5">
            {topWinRates.length === 0 ? (
              <p className="text-xs text-zinc-600 px-2 py-2">Not enough match data.</p>
            ) : (
              topWinRates.map((p, i) => (
                <SoundLink
                  key={p.user_id}
                  href={`/profile/${p.user_id}`}
                  soundType="click"
                  className="group flex items-center gap-2.5 rounded-xl px-2 py-2 transition-all duration-200 hover:bg-green-500/[0.05]"
                >
                  <span className="w-5 text-xs font-black text-zinc-700">#{i + 1}</span>
                  <PlayerAvatar name={p.name} avatar={p.avatar_url} size="h-7 w-7" />
                  <span className="flex-1 text-xs font-semibold truncate group-hover:text-white transition-colors">{p.name}</span>
                  <span className="text-xs font-black text-green-400">{p.winRate}%</span>
                </SoundLink>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
