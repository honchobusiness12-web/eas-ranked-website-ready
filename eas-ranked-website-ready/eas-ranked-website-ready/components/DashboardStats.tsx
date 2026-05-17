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
      <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d18] p-5">
        <h3 className="mb-4 text-sm font-black">📊 Rank Distribution</h3>
        <RankDistributionChart buckets={buckets} totalPlayers={ranked.length} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Top CR */}
        <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d18] p-4">
          <h3 className="mb-3 text-sm font-black">🏆 Top CR</h3>
          <div className="space-y-1">
            {topPlayers.map((p, i) => (
              <SoundLink
                key={p.user_id}
                href={`/profile/${p.user_id}`}
                soundType="click"
                className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-white/[0.04] transition-colors"
              >
                <span className="w-5 text-xs font-black text-zinc-600">#{i + 1}</span>
                <PlayerAvatar name={p.name} avatar={p.avatar_url} size="h-7 w-7" />
                <span className="flex-1 text-xs font-semibold truncate">{p.name}</span>
                <span className="text-xs font-black text-orange-400">{Number(p.cr).toLocaleString()}</span>
              </SoundLink>
            ))}
          </div>
        </div>

        {/* Top MVPs */}
        <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d18] p-4">
          <h3 className="mb-3 text-sm font-black">🌟 Top MVPs</h3>
          <div className="space-y-1">
            {topMvps.length === 0 ? (
              <p className="text-xs text-zinc-600 px-2 py-2">No MVP data yet.</p>
            ) : (
              topMvps.map((p, i) => (
                <SoundLink
                  key={p.user_id}
                  href={`/profile/${p.user_id}`}
                  soundType="click"
                  className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-white/[0.04] transition-colors"
                >
                  <span className="w-5 text-xs font-black text-zinc-600">#{i + 1}</span>
                  <PlayerAvatar name={p.name} avatar={p.avatar_url} size="h-7 w-7" />
                  <span className="flex-1 text-xs font-semibold truncate">{p.name}</span>
                  <span className="text-xs font-black text-yellow-400">{p.mvp_count} MVP</span>
                </SoundLink>
              ))
            )}
          </div>
        </div>

        {/* Top Win Rates */}
        <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d18] p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black">📈 Best Win Rate</h3>
            <span className="text-[10px] text-zinc-600">Min. 10 matches</span>
          </div>
          <div className="space-y-1">
            {topWinRates.length === 0 ? (
              <p className="text-xs text-zinc-600 px-2 py-2">Not enough match data.</p>
            ) : (
              topWinRates.map((p, i) => (
                <SoundLink
                  key={p.user_id}
                  href={`/profile/${p.user_id}`}
                  soundType="click"
                  className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-white/[0.04] transition-colors"
                >
                  <span className="w-5 text-xs font-black text-zinc-600">#{i + 1}</span>
                  <PlayerAvatar name={p.name} avatar={p.avatar_url} size="h-7 w-7" />
                  <span className="flex-1 text-xs font-semibold truncate">{p.name}</span>
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
