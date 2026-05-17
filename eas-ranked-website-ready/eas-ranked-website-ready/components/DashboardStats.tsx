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
    <div className="space-y-6">
      {/* Rank Distribution */}
      <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
        <h3 className="mb-5 text-xl font-black">📊 Rank Distribution</h3>
        <RankDistributionChart buckets={buckets} totalPlayers={ranked.length} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Top CR */}
        <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-5">
          <h3 className="mb-4 text-lg font-black">🏆 Top CR</h3>
          <div className="space-y-3">
            {topPlayers.map((p, i) => (
              <SoundLink
                key={p.user_id}
                href={`/profile/${p.user_id}`}
                soundType="click"
                className="flex items-center gap-3 rounded-xl p-2 hover:bg-white/5 transition"
              >
                <span className="w-5 text-sm font-black text-zinc-500">#{i + 1}</span>
                <PlayerAvatar name={p.name} avatar={p.avatar_url} size="h-8 w-8" />
                <span className="flex-1 text-sm font-bold truncate">{p.name}</span>
                <span className="text-sm font-black text-orange-400">{p.cr}</span>
              </SoundLink>
            ))}
          </div>
        </div>

        {/* Top MVPs */}
        <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-5">
          <h3 className="mb-4 text-lg font-black">🌟 Top MVPs</h3>
          <div className="space-y-3">
            {topMvps.length === 0 ? (
              <p className="text-sm text-zinc-500">No MVP data yet.</p>
            ) : (
              topMvps.map((p, i) => (
                <SoundLink
                  key={p.user_id}
                  href={`/profile/${p.user_id}`}
                  soundType="click"
                  className="flex items-center gap-3 rounded-xl p-2 hover:bg-white/5 transition"
                >
                  <span className="w-5 text-sm font-black text-zinc-500">#{i + 1}</span>
                  <PlayerAvatar name={p.name} avatar={p.avatar_url} size="h-8 w-8" />
                  <span className="flex-1 text-sm font-bold truncate">{p.name}</span>
                  <span className="text-sm font-black text-yellow-400">{p.mvp_count} MVP</span>
                </SoundLink>
              ))
            )}
          </div>
        </div>

        {/* Top Win Rates */}
        <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-5">
          <h3 className="mb-4 text-lg font-black">📈 Best Win Rate</h3>
          <p className="mb-3 text-xs text-zinc-600">Min. 10 matches</p>
          <div className="space-y-3">
            {topWinRates.length === 0 ? (
              <p className="text-sm text-zinc-500">Not enough match data.</p>
            ) : (
              topWinRates.map((p, i) => (
                <SoundLink
                  key={p.user_id}
                  href={`/profile/${p.user_id}`}
                  soundType="click"
                  className="flex items-center gap-3 rounded-xl p-2 hover:bg-white/5 transition"
                >
                  <span className="w-5 text-sm font-black text-zinc-500">#{i + 1}</span>
                  <PlayerAvatar name={p.name} avatar={p.avatar_url} size="h-8 w-8" />
                  <span className="flex-1 text-sm font-bold truncate">{p.name}</span>
                  <span className="text-sm font-black text-green-400">{p.winRate}%</span>
                </SoundLink>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
