import { getRankDistribution } from "@/lib/charts";
import { RankDistributionChart } from "@/components/StatsChart";
import type { CachedPlayer } from "@/lib/cache";
import PlayerAvatar from "@/components/PlayerAvatar";
import SoundLink from "@/components/SoundLink";

interface DashboardStatsProps {
  players: CachedPlayer[];
}

// ---------------------------------------------------------------------------
// Sub-table component
// ---------------------------------------------------------------------------

function MiniLeaderboard({
  title,
  subtitle,
  icon,
  iconBg,
  iconBorder,
  headerGradient,
  rows,
  valueColor,
  hoverColor,
  accentLine,
}: {
  title: string;
  subtitle: string;
  icon: string;
  iconBg: string;
  iconBorder: string;
  headerGradient: string;
  rows: { user_id: string; name: string; avatar_url?: string | null; value: string }[];
  valueColor: string;
  hoverColor: string;
  accentLine?: string;
}) {
  return (
    <div
      className="glass-card-premium gradient-border-animated overflow-hidden animate-card-entrance"
    >
      {/* Top accent line */}
      {accentLine && (
        <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-[1.25rem]"
          style={{ background: accentLine }} />
      )}
      <div
        className="border-b border-white/[0.06] px-5 py-4"
        style={{ background: headerGradient }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="icon-wrap flex h-8 w-8 items-center justify-center rounded-lg text-sm"
            style={{ background: iconBg, border: `1px solid ${iconBorder}`, boxShadow: `0 0 12px ${iconBorder}` }}
          >
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-black tracking-tight">{title}</h3>
            <p className="text-[10px] text-zinc-500">{subtitle}</p>
          </div>
        </div>
      </div>
      <div className="divide-y divide-white/[0.04]">
        {rows.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-xs text-zinc-600">No data yet.</p>
          </div>
        ) : (
          rows.map((row, i) => (
            <SoundLink
              key={row.user_id}
              href={`/profile/${row.user_id}`}
              soundType="click"
              className={`lb-row-premium table-row-stagger group flex items-center gap-2.5 px-4 py-3 ${hoverColor}`}
            >
              <span className="w-5 text-center text-xs font-black text-zinc-700">
                {i === 0 ? (
                  <span style={{ filter: "drop-shadow(0 0 4px rgba(234,179,8,0.4))" }}>🥇</span>
                ) : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
              </span>
              <div className="player-avatar-wrap">
                <PlayerAvatar name={row.name} avatar={row.avatar_url} size="h-7 w-7" />
              </div>
              <span className="flex-1 text-xs font-semibold truncate transition-colors duration-200 group-hover:text-white text-zinc-300">
                {row.name}
              </span>
              <span className={`text-xs font-black tabular-nums transition-all duration-200 ${valueColor}`}>{row.value}</span>
            </SoundLink>
          ))
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function DashboardStats({ players }: DashboardStatsProps) {
  const ranked = players.filter((p) => p.ranked);
  const buckets = getRankDistribution(ranked);

  // Top 5 by CR
  const topPlayers = [...players]
    .sort((a, b) => Number(b.cr) - Number(a.cr))
    .slice(0, 5)
    .map((p) => ({ user_id: p.user_id, name: p.name, avatar_url: p.avatar_url, value: Number(p.cr).toLocaleString() }));

  // Top MVPs
  const topMvps = [...players]
    .filter((p) => Number(p.mvp_count || 0) > 0)
    .sort((a, b) => Number(b.mvp_count) - Number(a.mvp_count))
    .slice(0, 5)
    .map((p) => ({ user_id: p.user_id, name: p.name, avatar_url: p.avatar_url, value: `${p.mvp_count} MVP` }));

  // Highest win rates (min 10 matches)
  const topWinRates = [...players]
    .filter((p) => Number(p.matches || 0) >= 10)
    .map((p) => ({
      ...p,
      winRate: Math.round((Number(p.wins || 0) / Number(p.matches || 1)) * 100),
    }))
    .sort((a, b) => b.winRate - a.winRate)
    .slice(0, 5)
    .map((p) => ({ user_id: p.user_id, name: p.name, avatar_url: p.avatar_url, value: `${p.winRate}%` }));

  return (
    <div className="space-y-5">
      {/* ── Rank Distribution — full width ── */}
      <div
        className="glass-card-premium gradient-border-animated p-6 animate-card-entrance"
      >
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-[1.25rem]"
          style={{ background: "linear-gradient(90deg, rgba(6,182,212,0.8), rgba(79,142,247,0.6), rgba(168,85,247,0.4), transparent)" }} />

        <div className="flex items-center gap-3 mb-5">
          <div
            className="icon-wrap flex h-9 w-9 items-center justify-center rounded-xl text-base"
            style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.2), rgba(79,142,247,0.12))", border: "1px solid rgba(6,182,212,0.25)", boxShadow: "0 0 16px rgba(6,182,212,0.1)" }}
          >
            📊
          </div>
          <div>
            <h3 className="text-sm font-black tracking-tight">Rank Distribution</h3>
            <p className="text-[10px] text-zinc-500">{ranked.length} ranked players across all tiers</p>
          </div>
        </div>
        <RankDistributionChart buckets={buckets} totalPlayers={ranked.length} />
      </div>

      {/* ── Leaderboard sub-tables — 3-column grid ── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MiniLeaderboard
          title="Top CR"
          subtitle="Highest rated players"
          icon="🏆"
          iconBg="linear-gradient(135deg, rgba(168,85,247,0.2), rgba(124,58,237,0.12))"
          iconBorder="rgba(168,85,247,0.25)"
          headerGradient="linear-gradient(90deg, rgba(124,58,237,0.10), rgba(79,142,247,0.04), transparent)"
          rows={topPlayers}
          valueColor="text-purple-300"
          hoverColor="hover:bg-purple-500/[0.05]"
          accentLine="linear-gradient(90deg, rgba(168,85,247,0.8), rgba(79,142,247,0.5), transparent)"
        />
        <MiniLeaderboard
          title="Top MVPs"
          subtitle="Most valuable players"
          icon="🌟"
          iconBg="linear-gradient(135deg, rgba(234,179,8,0.2), rgba(245,158,11,0.12))"
          iconBorder="rgba(234,179,8,0.25)"
          headerGradient="linear-gradient(90deg, rgba(234,179,8,0.10), rgba(245,158,11,0.04), transparent)"
          rows={topMvps}
          valueColor="text-yellow-300"
          hoverColor="hover:bg-yellow-500/[0.05]"
          accentLine="linear-gradient(90deg, rgba(234,179,8,0.8), rgba(245,158,11,0.5), transparent)"
        />
        <MiniLeaderboard
          title="Best Win Rate"
          subtitle="Min. 10 matches played"
          icon="📈"
          iconBg="linear-gradient(135deg, rgba(34,197,94,0.2), rgba(16,185,129,0.12))"
          iconBorder="rgba(34,197,94,0.25)"
          headerGradient="linear-gradient(90deg, rgba(34,197,94,0.10), rgba(16,185,129,0.04), transparent)"
          rows={topWinRates}
          valueColor="text-green-300"
          hoverColor="hover:bg-green-500/[0.05]"
          accentLine="linear-gradient(90deg, rgba(34,197,94,0.8), rgba(16,185,129,0.5), transparent)"
        />
      </div>
    </div>
  );
}
