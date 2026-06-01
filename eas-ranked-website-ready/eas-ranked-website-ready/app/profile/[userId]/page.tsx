import Shell from "@/components/ServerShell";
import PlayerAvatar from "@/components/PlayerAvatar";
import SoundLink from "@/components/SoundLink";
import RankBadge from "@/components/RankBadge";
import AchievementBadge from "@/components/AchievementBadge";
import BadgeDisplay from "@/components/BadgeDisplay";
import CopyButton from "@/components/CopyButton";
import { WinLossChart } from "@/components/StatsChart";
import {
  AnimatedStatCard,
  AnimatedProgressBar,
  CrProgressionSection,
  AchievementProgress,
} from "@/components/ProfileClient";
import MatchPagination from "@/components/MatchPagination";
import PlayerCard from "@/components/PlayerCard";
import { getRank, getNextRank } from "@/lib/ranks";
import { getPlayerFromDB } from "@/lib/cache";
import { getAchievements, getUnlockedCount } from "@/lib/achievements";
import { parseCrProgression, getTierColor } from "@/lib/charts";
import { getUserBadges, DEVELOPER_USER_ID } from "@/lib/premium";
import { getSession } from "@/lib/auth";
import { getRankTheme } from "@/lib/rankThemes";
import { getMVPHistory, getCRHistory } from "@/lib/db";

export const revalidate = 30;

export default async function ProfilePage(context: { params: Promise<{ userId: string }> }) {
  const { userId } = await context.params;
  const p = await getPlayerFromDB(userId);
  const session = await getSession();
  const viewerUserId = session?.userId ?? null;

  // Determine if the viewer is the owner (developer ID or OWNER_USER_IDS env)
  const ownerIds = (process.env.OWNER_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const viewerIsOwner =
    viewerUserId !== null &&
    (viewerUserId === DEVELOPER_USER_ID || ownerIds.includes(viewerUserId));

  // Is the viewer looking at their own profile?
  const isOwnProfile = viewerUserId !== null && viewerUserId === userId;

  const badges = await getUserBadges(userId);

  // Fetch MVP and CR history (gracefully handle missing tables)
  let mvpHistory: Array<{ id: string; match_id: string; season_id: string; awarded_at: string }> = [];
  let crHistory: Array<{ id: string; old_cr: number; new_cr: number; change: number; match_id: string; season_id: string; recorded_at: string }> = [];
  try {
    [mvpHistory, crHistory] = await Promise.all([
      getMVPHistory(userId, 10),
      getCRHistory(userId, 20),
    ]);
  } catch {
    // Tables may not exist yet — silently ignore
  }

  if (!p) {
    return (
      <Shell>
        <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-12 text-center">
          <p className="text-5xl mb-4">❓</p>
          <h1 className="text-4xl font-black">Player Not Found</h1>
          <p className="mt-2 text-zinc-400">This player does not exist in the database.</p>
          <SoundLink href="/players" soundType="success" className="mt-6 inline-block rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-5 py-3 font-bold hover:from-orange-400 hover:to-red-400 transition-all">
            Browse Players
          </SoundLink>
        </div>
      </Shell>
    );
  }

  const cr = Number(p.cr || 0);
  const rank = getRank(cr);
  const next = getNextRank(cr);
  const rankColor = getTierColor(rank);
  const rankTheme = getRankTheme(rank);
  const wins = Number(p.wins || 0);
  const losses = Number(p.losses || 0);
  const kills = Number(p.kills || 0);
  const matches = Number(p.matches || 0);
  const mvps = Number(p.mvp_count || 0);
  const winStreak = Number((p as any).win_streak || 0);
  const winRate = matches ? Math.round((wins / matches) * 100) : 0;
  const kda = matches ? (kills / matches).toFixed(1) : "0.0";

  const history = Array.isArray(p.history) ? p.history : [];
  const crPoints = parseCrProgression(history, cr);
  const achievements = getAchievements(p);
  const unlockedCount = getUnlockedCount(p);

  // Rank progress
  const nextMin = next?.min ?? cr;
  // Find the current rank's min CR for accurate progress
  const { ranks } = await import("@/lib/ranks");
  let currentRankMin = 0;
  for (const r of ranks) {
    if (cr >= r.min) currentRankMin = r.min;
  }
  const progressPct = next
    ? Math.min(100, Math.round(((cr - currentRankMin) / (nextMin - currentRankMin)) * 100))
    : 100;

  return (
    <Shell>
      {/* ── Hero Banner ── */}
      <section
        className="relative overflow-hidden rounded-2xl border p-6 md:p-8"
        style={{
          background: `linear-gradient(135deg, #0a0a16 0%, #0d0d1e 55%, ${rankColor}14 100%)`,
          borderColor: `${rankColor}25`,
        }}
      >
        {/* Decorative rank glow — primary */}
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full opacity-15 blur-3xl"
          style={{ background: rankColor }}
        />
        {/* Secondary glow — bottom left */}
        <div
          className="pointer-events-none absolute -left-12 -bottom-12 h-48 w-48 rounded-full opacity-10 blur-3xl"
          style={{ background: rankTheme.secondary }}
        />

        <div className="relative flex flex-wrap items-start justify-between gap-6">
          {/* Left: Avatar + identity */}
          <div className="flex flex-wrap items-center gap-5">
            {/* Avatar with animated rank-colored ring */}
            <div
              className="shrink-0 rounded-full p-[2px]"
              style={{
                background: `linear-gradient(135deg, ${rankColor}90, ${rankTheme.secondary}60)`,
                boxShadow: rankTheme.animated
                  ? `0 0 20px ${rankTheme.glow}, 0 0 40px ${rankTheme.glow}`
                  : `0 0 12px ${rankTheme.glow}`,
              }}
            >
              <div className="rounded-full bg-[#0a0a16] p-[2px]">
                <PlayerAvatar name={p.name} avatar={p.avatar_url} size="h-24 w-24" />
              </div>
            </div>

            <div>
              {/* Name */}
              <h1
                className="text-3xl font-black tracking-tight md:text-5xl"
                style={{ textShadow: `0 0 30px ${rankColor}40` }}
              >
                {p.name}
              </h1>

              {/* Username + ID */}
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {p.username && (
                  <span className="text-sm text-zinc-500">@{p.username}</span>
                )}
                <div className="flex items-center gap-1">
                  <span className="font-mono text-[10px] text-zinc-700">ID: {userId}</span>
                  <CopyButton text={userId} size="xs" />
                </div>
              </div>

              {/* Badges row */}
              {badges.length > 0 && (
                <BadgeDisplay badges={badges} size="md" className="mt-2" />
              )}

              {/* Rank + status chips */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <RankBadge cr={cr} size="lg" badgeStyle={rankTheme.animated ? "glowing" : "gradient"} />
                {p.blacklisted && (
                  <span className="rounded-lg border border-red-600/50 bg-red-950/30 px-2.5 py-1 text-xs font-bold text-red-400">
                    🚫 Blacklisted
                  </span>
                )}
                {!p.ranked && p.registered && (
                  <span className="rounded-lg border border-yellow-600/40 bg-yellow-950/20 px-2.5 py-1 text-xs font-bold text-yellow-400">
                    ⏳ Unranked
                  </span>
                )}
                {p.ranked && (
                  <span className="rounded-lg border border-green-600/40 bg-green-950/20 px-2.5 py-1 text-xs font-bold text-green-400">
                    ✅ Ranked
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Action buttons */}
          <div className="flex flex-col gap-2 shrink-0">
            <SoundLink
              href={`/compare?a=${p.user_id}`}
              soundType="success"
              className="flex items-center gap-2 rounded-xl border border-purple-600/40 bg-purple-950/20 px-4 py-2.5 text-sm font-bold text-purple-300 hover:bg-purple-950/40 hover:border-purple-500/60 transition-all hover:scale-[1.02]"
            >
              <span>⚔️</span>
              <span>Compare</span>
            </SoundLink>
            <SoundLink
              href="/leaderboard"
              soundType="click"
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-bold text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200 transition-all hover:scale-[1.02]"
            >
              <span>🏆</span>
              <span>Leaderboard</span>
            </SoundLink>
          </div>
        </div>
      </section>

      {/* ── Admin Panel (owner only, own profile) ── */}
      {viewerIsOwner && isOwnProfile && (
        <section className="mt-3 rounded-2xl border border-red-700/30 bg-red-950/10 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span>🔧</span>
            <h2 className="text-sm font-black text-red-300">Admin Panel</h2>
            <span className="ml-auto rounded-md border border-red-700/30 bg-red-950/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-400">
              Owner Only
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {[
              { href: "/admin/announcements", icon: "📢", label: "Announcements" },
              { href: "/admin/seasons",       icon: "🏆", label: "Seasons" },
              { href: "/admin/cr",            icon: "⚙️", label: "CR Manager" },
              { href: "/admin/giveaways",     icon: "🎁", label: "Giveaways" },
              { href: "/admin/badges",        icon: "🏅", label: "Badges" },
            ].map(({ href, icon, label }) => (
              <SoundLink
                key={href}
                href={href}
                soundType="click"
                className="flex items-center gap-2 rounded-lg border border-red-800/20 bg-red-950/15 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-950/30 hover:border-red-700/40 transition-colors"
              >
                <span>{icon}</span>
                <span>{label}</span>
              </SoundLink>
            ))}
          </div>
        </section>
      )}

      {/* ── Two-column layout ── */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">

        {/* ══ LEFT COLUMN ══ */}
        <div className="space-y-4">

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <AnimatedStatCard
              icon="⚡"
              title="CR"
              numericValue={cr}
              displayValue={cr.toLocaleString()}
              sub={rank}
              color="orange"
              accent={rankColor}
              delay={0}
            />
            <AnimatedStatCard
              icon="🏆"
              title="Wins"
              numericValue={wins}
              displayValue={wins.toLocaleString()}
              sub={`${winRate}% win rate`}
              color="green"
              delay={60}
            />
            <AnimatedStatCard
              icon="💀"
              title="Losses"
              numericValue={losses}
              displayValue={losses.toLocaleString()}
              sub={`${matches} total matches`}
              color="red"
              delay={120}
            />
            <AnimatedStatCard
              icon="🎯"
              title="Kills"
              numericValue={kills}
              displayValue={kills.toLocaleString()}
              sub={`${kda} per match`}
              color="yellow"
              delay={180}
            />
            <AnimatedStatCard
              icon="🌟"
              title="MVPs"
              numericValue={mvps}
              displayValue={mvps.toLocaleString()}
              sub="Most Valuable Player"
              color="purple"
              delay={240}
            />
            <AnimatedStatCard
              icon="📊"
              title="Win Rate"
              numericValue={winRate}
              displayValue={`${winRate}%`}
              sub={matches >= 20 ? (winRate >= 75 ? "⚡ Dominant" : winRate >= 60 ? "📈 Consistent" : "Improving") : "Need more matches"}
              color="blue"
              delay={300}
            />
          </div>

          {/* CR Progression chart */}
          <CrProgressionSection crPoints={crPoints} />

          {/* Rank Progress */}
          <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d18] p-5">
            <h2 className="mb-4 text-sm font-black">🎯 Rank Progress</h2>
            {next ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <RankBadge cr={cr} size="sm" />
                    <span className="text-xs text-zinc-500">→</span>
                    <span
                      className="rounded-lg border px-2 py-0.5 text-xs font-bold"
                      style={{
                        borderColor: `${getTierColor(next.name)}50`,
                        background: `${getTierColor(next.name)}15`,
                        color: getTierColor(next.name),
                      }}
                    >
                      {next.name}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-orange-400">
                    {(next.min - cr).toLocaleString()} CR to go
                  </span>
                </div>
                <AnimatedProgressBar
                  pct={progressPct}
                  color={`linear-gradient(90deg, ${rankColor}cc, ${rankColor})`}
                  glowColor={`${rankColor}60`}
                  height="h-3"
                />
                <div className="mt-2 flex justify-between text-[11px] text-zinc-600">
                  <span>{currentRankMin.toLocaleString()} CR</span>
                  <span className="text-zinc-400 font-bold">{progressPct}%</span>
                  <span>{next.min.toLocaleString()} CR</span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-4 rounded-xl border border-yellow-600/30 bg-yellow-950/15 p-4">
                <span className="text-3xl">🏆</span>
                <div>
                  <p className="font-black text-yellow-400">Maximum Rank Achieved!</p>
                  <p className="text-xs text-zinc-500 mt-0.5">You&apos;ve reached the pinnacle of the ladder.</p>
                </div>
              </div>
            )}
          </div>

          {/* Match Timeline */}
          <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d18] p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-black">📜 Match History</h2>
              {crPoints.length > 0 && (
                <span className="text-xs text-zinc-600">{crPoints.length} entries</span>
              )}
            </div>
            <MatchPagination points={crPoints} itemsPerPage={5} />
          </div>

          {/* ── Achievements ── */}
          <section className="rounded-2xl border border-white/[0.07] bg-[#0d0d18] p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-black">🏅 Achievements</h2>
                <p className="text-xs text-zinc-600 mt-0.5">Milestones earned through gameplay</p>
              </div>
              <AchievementProgress unlocked={unlockedCount} total={achievements.length} />
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
              {achievements.map((a) => (
                <AchievementBadge key={a.id} achievement={a} size="md" />
              ))}
            </div>
          </section>

          {/* ── MVP History ── */}
          {mvpHistory.length > 0 && (
            <section className="rounded-2xl border border-yellow-500/[0.18] bg-[#0d0d18] p-5 animate-fadeInUp">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-lg mvp-glow"
                    style={{ background: "rgba(234,179,8,0.14)", border: "1px solid rgba(234,179,8,0.25)" }}
                  >
                    🌟
                  </div>
                  <div>
                    <h2 className="text-sm font-black">MVP History</h2>
                    <p className="text-[10px] text-zinc-600 mt-0.5">Last {mvpHistory.length} MVP awards</p>
                  </div>
                </div>
                <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs font-black text-yellow-300">
                  {mvpHistory.length} total
                </span>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-1 gap-2 mb-4">
                <div className="flex items-center justify-between rounded-xl bg-yellow-500/[0.06] border border-yellow-500/[0.12] px-4 py-3">
                  <span className="text-xs text-zinc-400">Total MVPs on record</span>
                  <span className="text-lg font-black text-yellow-300">{mvpHistory.length}</span>
                </div>
              </div>

              {/* History list */}
              <div className="space-y-1.5">
                {mvpHistory.map((entry, idx) => (
                  <div
                    key={entry.id}
                    className="history-item-enter flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/[0.05] px-4 py-2.5 hover:bg-yellow-500/[0.05] hover:border-yellow-500/[0.12] transition-all duration-200"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">🌟</span>
                      <div>
                        <p className="text-xs font-bold text-yellow-300">MVP Awarded</p>
                        <p className="text-[10px] text-zinc-600 font-mono">Match: {entry.match_id.slice(0, 12)}…</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-zinc-600 tabular-nums">
                      {new Date(entry.awarded_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── CR History ── */}
          {crHistory.length > 0 && (() => {
            const gains = crHistory.filter((e) => e.change > 0);
            const avgGain = gains.length
              ? Math.round(gains.reduce((s, e) => s + e.change, 0) / gains.length)
              : 0;
            const highestGain = gains.length
              ? Math.max(...gains.map((e) => e.change))
              : 0;

            return (
              <section className="rounded-2xl border border-purple-500/[0.18] bg-[#0d0d18] p-5 animate-fadeInUp delay-60">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-lg"
                      style={{ background: "rgba(168,85,247,0.14)", border: "1px solid rgba(168,85,247,0.25)" }}
                    >
                      ⚡
                    </div>
                    <div>
                      <h2 className="text-sm font-black">CR History</h2>
                      <p className="text-[10px] text-zinc-600 mt-0.5">Last {crHistory.length} CR changes</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-black text-purple-300">
                    {crHistory.length} entries
                  </span>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="rounded-xl bg-green-500/[0.06] border border-green-500/[0.12] px-3 py-2.5 text-center">
                    <p className="text-lg font-black text-green-300">+{avgGain}</p>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-600 mt-0.5">Avg CR Gain</p>
                  </div>
                  <div className="rounded-xl bg-yellow-500/[0.06] border border-yellow-500/[0.12] px-3 py-2.5 text-center">
                    <p className="text-lg font-black text-yellow-300">+{highestGain}</p>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-600 mt-0.5">Best Single Match</p>
                  </div>
                </div>

                {/* History list */}
                <div className="space-y-1.5">
                  {crHistory.map((entry, idx) => {
                    const isGain = entry.change > 0;
                    const isLoss = entry.change < 0;
                    return (
                      <div
                        key={entry.id}
                        className="history-item-enter flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/[0.05] px-4 py-2.5 hover:bg-purple-500/[0.04] hover:border-purple-500/[0.10] transition-all duration-200"
                        style={{ animationDelay: `${idx * 40}ms` }}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">
                            {isGain ? "📈" : isLoss ? "📉" : "➡️"}
                          </span>
                          <div>
                            <p className={`text-xs font-bold ${isGain ? "cr-gain" : isLoss ? "cr-loss" : "cr-neutral"}`}>
                              {isGain ? "+" : ""}{entry.change} CR
                            </p>
                            <p className="text-[10px] text-zinc-600">
                              {entry.old_cr.toLocaleString()} → {entry.new_cr.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] text-zinc-600 tabular-nums">
                          {new Date(entry.recorded_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })()}
        </div>

        {/* ══ RIGHT COLUMN ══ */}
        <div className="space-y-4">

          {/* Player Card */}
          <div>
            <h2 className="mb-2 text-sm font-black text-zinc-400 uppercase tracking-widest px-1">🃏 Player Card</h2>
            <PlayerCard
              name={p.name}
              username={p.username}
              avatar={p.avatar_url}
              rank={rank}
              cr={cr}
              winRate={winRate}
              mvps={mvps}
              winStreak={winStreak}
              theme={rankTheme}
            />
          </div>

          {/* Win/Loss donut */}
          <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d18] p-5">
            <h2 className="mb-4 text-sm font-black">🎯 Win / Loss Ratio</h2>
            <WinLossChart wins={wins} losses={losses} matches={matches} />
          </div>

          {/* Detailed stats */}
          <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d18] p-5">
            <h2 className="mb-3 text-sm font-black">📊 Detailed Stats</h2>
            <div className="space-y-2">
              <StatRow icon="🎮" label="Total Matches" value={matches.toLocaleString()} />
              <StatRow icon="🏆" label="Wins" value={wins.toLocaleString()} highlight="green" />
              <StatRow icon="💀" label="Losses" value={losses.toLocaleString()} highlight="red" />
              <StatRow icon="🎯" label="Kills / Match" value={kda} />
              <StatRow icon="🌟" label="MVPs" value={mvps.toLocaleString()} highlight="yellow" />
              {winStreak > 0 && (
                <StatRow icon="🔥" label="Win Streak" value={`${winStreak}W`} highlight="orange" />
              )}
              <StatRow icon="📋" label="Placement Matches" value={String(p.placement_matches || 0)} />
            </div>
          </div>

          {/* Account Status */}
          <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d18] p-5">
            <h2 className="mb-3 text-sm font-black">🔖 Account Status</h2>
            <div className="space-y-2">
              <StatusRow label="Registered" active={p.registered} icon="📝" />
              <StatusRow label="Ranked" active={p.ranked} icon="🏅" />
              <StatusRow label="Blacklisted" active={p.blacklisted} icon="🚫" danger />
            </div>
          </div>

          {/* CR Breakdown */}
          <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d18] p-5">
            <h2 className="mb-3 text-sm font-black">⚡ CR Breakdown</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Current CR</span>
                <span className="text-lg font-black" style={{ color: rankColor }}>
                  {cr.toLocaleString()}
                </span>
              </div>
              {next && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">Next rank at</span>
                    <span className="text-sm font-bold text-zinc-300">{next.min.toLocaleString()} CR</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">CR needed</span>
                    <span className="text-sm font-bold text-orange-400">{(next.min - cr).toLocaleString()}</span>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Current rank</span>
                <span className="text-xs font-bold" style={{ color: rankColor }}>{rank}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </Shell>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StatRow({
  icon,
  label,
  value,
  highlight,
}: {
  icon: string;
  label: string;
  value: string;
  highlight?: "green" | "red" | "yellow" | "orange";
}) {
  const highlightColors = {
    green:  "text-green-400",
    red:    "text-red-400",
    yellow: "text-yellow-400",
    orange: "text-orange-400",
  };
  return (
    <div className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className="text-sm">{icon}</span>
        <span className="text-xs text-zinc-500">{label}</span>
      </div>
      <span className={`text-xs font-bold ${highlight ? highlightColors[highlight] : "text-white"}`}>
        {value}
      </span>
    </div>
  );
}

function StatusRow({
  icon,
  label,
  active,
  danger,
}: {
  icon: string;
  label: string;
  active: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className="text-sm">{icon}</span>
        <span className="text-xs text-zinc-400">{label}</span>
      </div>
      <span
        className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
          active
            ? danger
              ? "bg-red-600/20 text-red-400 border border-red-600/30"
              : "bg-green-600/20 text-green-400 border border-green-600/30"
            : "bg-zinc-800 text-zinc-500 border border-zinc-700/50"
        }`}
      >
        {active ? "YES" : "NO"}
      </span>
    </div>
  );
}
