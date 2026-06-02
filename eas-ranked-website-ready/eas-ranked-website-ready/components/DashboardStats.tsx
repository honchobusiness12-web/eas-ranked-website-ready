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
        className="border-b border-sky-100 px-5 py-4"
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
            <h3 className="text-sm font-black tracking-tight" style={{ color: "#e0f7ff" }}>{title}</h3>
            <p className="text-[10px]" style={{ color: "rgba(168,255,246,0.55)" }}>{subtitle}</p>
          </div>
        </div>
      </div>
      <div className="divide-y divide-sky-50">
        {rows.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-xs text-gray-400">No data yet.</p>
          </div>
        ) : (
          rows.map((row, i) => (
            <SoundLink
              key={row.user_id}
              href={`/profile/${row.user_id}`}
              soundType="click"
              className={`lb-row-premium table-row-stagger group flex items-center gap-2.5 px-4 py-3 ${hoverColor}`}
            >
              <span className="w-5 text-center text-xs font-black text-gray-400">
                {i === 0 ? (
                  <span style={{ filter: "drop-shadow(0 0 4px rgba(234,179,8,0.4))" }}>🥇</span>
                ) : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
              </span>
              <div className="player-avatar-wrap">
                <PlayerAvatar name={row.name} avatar={row.avatar_url} size="h-7 w-7" />
              </div>
              <span className="flex-1 text-xs font-semibold truncate transition-colors duration-200" style={{ color: "rgba(168,255,246,0.80)" }}>
                {row.name}
              </span>
              <span className="text-xs font-black tabular-nums transition-all duration-200" style={{ color: "#00CFFF" }}>{row.value}</span>
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
          style={{ background: "linear-gradient(90deg, rgba(6,182,212,0.8), rgba(14,165,233,0.6), rgba(20,184,166,0.4), transparent)" }} />

        <div className="flex items-center gap-3 mb-5">
          <div
            className="icon-wrap flex h-9 w-9 items-center justify-center rounded-xl text-base"
            style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.15), rgba(14,165,233,0.10))", border: "1px solid rgba(6,182,212,0.2)", boxShadow: "0 0 16px rgba(6,182,212,0.08)" }}
          >
            📊
          </div>
          <div>
            <h3 className="text-sm font-black tracking-tight" style={{ color: "#e0f7ff" }}>Rank Distribution</h3>
            <p className="text-[10px]" style={{ color: "rgba(168,255,246,0.55)" }}>{ranked.length} ranked players across all tiers</p>
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
          iconBg="linear-gradient(135deg, rgba(0,207,255,0.18), rgba(77,238,234,0.12))"
          iconBorder="rgba(0,207,255,0.28)"
          headerGradient="linear-gradient(90deg, rgba(0,207,255,0.08), rgba(77,238,234,0.04), transparent)"
          rows={topPlayers}
          valueColor=""
          hoverColor=""
          accentLine="linear-gradient(90deg, rgba(0,207,255,0.85), rgba(77,238,234,0.55), transparent)"
        />
        <MiniLeaderboard
          title="Top MVPs"
          subtitle="Most valuable players"
          icon="🌟"
          iconBg="linear-gradient(135deg, rgba(255,127,80,0.18), rgba(242,217,166,0.12))"
          iconBorder="rgba(255,127,80,0.28)"
          headerGradient="linear-gradient(90deg, rgba(255,127,80,0.08), rgba(242,217,166,0.04), transparent)"
          rows={topMvps}
          valueColor=""
          hoverColor=""
          accentLine="linear-gradient(90deg, rgba(255,127,80,0.85), rgba(242,217,166,0.55), transparent)"
        />
        <MiniLeaderboard
          title="Best Win Rate"
          subtitle="Min. 10 matches played"
          icon="📈"
          iconBg="linear-gradient(135deg, rgba(74,222,128,0.18), rgba(34,197,94,0.12))"
          iconBorder="rgba(74,222,128,0.28)"
          headerGradient="linear-gradient(90deg, rgba(74,222,128,0.08), rgba(34,197,94,0.04), transparent)"
          rows={topWinRates}
          valueColor=""
          hoverColor=""
          accentLine="linear-gradient(90deg, rgba(74,222,128,0.85), rgba(34,197,94,0.55), transparent)"
        />
      </div>
    </div>
  );
}
