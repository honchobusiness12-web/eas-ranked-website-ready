import Shell from "@/components/ServerShell";
import PlayerAvatar from "@/components/PlayerAvatar";
import SoundLink from "@/components/SoundLink";
import RankBadge from "@/components/RankBadge";
import AchievementBadge from "@/components/AchievementBadge";
import PremiumUpsell from "@/components/PremiumUpsell";
import BadgeDisplay from "@/components/BadgeDisplay";
import CosmeticsPreview from "@/components/CosmeticsPreview";
import { WinLossChart, CrSparkline } from "@/components/StatsChart";
import { getRank, getNextRank } from "@/lib/ranks";
import { getPlayerFromDB } from "@/lib/cache";
import { getAchievements, getUnlockedCount } from "@/lib/achievements";
import { parseCrProgression } from "@/lib/charts";
import { isPremiumUser, getCosmetics, getUserBadges } from "@/lib/premium";
import { THEMES, ACHIEVEMENT_FRAMES } from "@/lib/premium-constants";

export const revalidate = 30;

export default async function ProfilePage(context: { params: Promise<{ userId: string }> }) {
  const { userId } = await context.params;
  const p = await getPlayerFromDB(userId);
  const [premium, cosmetics, badges] = await Promise.all([
    isPremiumUser(userId),
    getCosmetics(userId),
    getUserBadges(userId),
  ]);

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
  const wins = Number(p.wins || 0);
  const losses = Number(p.losses || 0);
  const kills = Number(p.kills || 0);
  const matches = Number(p.matches || 0);
  const mvps = Number(p.mvp_count || 0);
  const winRate = matches ? Math.round((wins / matches) * 100) : 0;
  const kda = matches ? (kills / matches).toFixed(1) : "0.0";

  const history = Array.isArray(p.history) ? p.history : [];
  const crPoints = parseCrProgression(history, cr);
  const achievements = getAchievements(p);
  const unlockedCount = getUnlockedCount(p);

  // Rank progress
  const nextMin = next?.min ?? cr;
  const progressPct = next ? Math.min(100, Math.round((cr / nextMin) * 100)) : 100;

  // Cosmetic accent color
  const accentColor = cosmetics?.profile_color || "#FF6B6B";

  // Resolve theme gradient for hero background
  const themeEntry = THEMES.find((t) => t.id === (cosmetics?.theme ?? "dark"));
  const heroBg = themeEntry
    ? `linear-gradient(135deg, ${themeEntry.preview}, #1a0e05, ${accentColor}20)`
    : `linear-gradient(135deg, #000, #1a0e05, ${accentColor}15)`;

  // Resolve achievement frame styling for avatar wrapper
  const frameEntry = ACHIEVEMENT_FRAMES.find(
    (f) => f.id === (cosmetics?.achievement_frame ?? "default")
  );
  const frameStyles: Record<string, React.CSSProperties> = {
    default: {},
    gold: { boxShadow: `0 0 0 3px #FFD700, 0 0 16px #FFD70060` },
    diamond: { boxShadow: `0 0 0 3px #00D4FF, 0 0 16px #00D4FF60` },
    fire: { boxShadow: `0 0 0 3px #FF6B00, 0 0 20px #FF6B0080` },
    ice: { boxShadow: `0 0 0 3px #A0E8FF, 0 0 20px #A0E8FF80` },
  };
  const avatarFrameStyle: React.CSSProperties =
    frameStyles[cosmetics?.achievement_frame ?? "default"] ?? {};

  // Rank badge style from cosmetics
  const rankBadgeStyle = cosmetics?.rank_badge_style ?? "default";

  return (
    <Shell>
      {/* Hero */}
      <section
        className="rounded-3xl border p-8"
        style={{
          borderColor: `${accentColor}40`,
          background: heroBg,
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex flex-wrap items-center gap-6">
            {/* Avatar with optional achievement frame */}
            <div
              className="rounded-full"
              style={{ borderRadius: "9999px", ...avatarFrameStyle }}
              title={frameEntry ? `${frameEntry.icon} ${frameEntry.label} Frame` : undefined}
            >
              <PlayerAvatar name={p.name} avatar={p.avatar_url} size="h-24 w-24" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h1 className="text-4xl font-black md:text-5xl">{p.name}</h1>
              </div>
              {cosmetics?.player_title && (
                <p className="text-sm font-bold mb-1" style={{ color: accentColor }}>
                  {cosmetics.player_title}
                </p>
              )}
              <p className="text-zinc-400 mb-2">{p.username || "No username saved yet"}</p>
              {/* All badges in a row */}
              {badges.length > 0 && (
                <BadgeDisplay badges={badges} size="md" className="mb-3" />
              )}
              <div className="flex flex-wrap items-center gap-3">
                <RankBadge cr={cr} size="lg" badgeStyle={rankBadgeStyle} />
                {p.blacklisted && (
                  <span className="rounded-xl border border-red-600/50 bg-red-950/30 px-3 py-1 text-xs font-bold text-red-400">
                    🚫 Blacklisted
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <SoundLink
              href={`/compare?a=${p.user_id}`}
              soundType="success"
              className="rounded-xl border border-orange-600/60 px-4 py-2 text-sm font-bold text-orange-300 hover:bg-orange-950/40 transition text-center"
            >
              ⚔️ Compare
            </SoundLink>
            <SoundLink
              href={`/premium/stats?userId=${p.user_id}`}
              soundType="click"
              className="rounded-xl border border-yellow-600/40 px-4 py-2 text-sm font-bold text-yellow-400 hover:bg-yellow-950/20 transition text-center"
            >
              📊 Advanced Stats
            </SoundLink>
          </div>
        </div>
      </section>

      {/* Premium upsell for non-premium profiles */}
      {!premium && (
        <div className="mt-4">
          <PremiumUpsell
            compact
            message="Upgrade to Premium to unlock advanced stats, custom cosmetics, and a premium badge on this profile."
          />
        </div>
      )}

      {/* Stats grid */}
      <section className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard title="CR" value={cr.toLocaleString()} color="orange" />
        <StatCard title="Wins" value={wins.toString()} color="green" />
        <StatCard title="Losses" value={losses.toString()} color="red" />
        <StatCard title="Win Rate" value={`${winRate}%`} color="blue" />
        <StatCard title="Kills" value={kills.toLocaleString()} color="yellow" />
        <StatCard title="MVPs" value={mvps.toString()} color="yellow" />
      </section>

      {/* Charts + progress */}
      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        {/* Left: CR progression + history */}
        <div className="space-y-6">
          {/* CR Sparkline */}
          <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
            <h2 className="mb-4 text-xl font-black">📈 CR Progression</h2>
            <CrSparkline points={crPoints} />
          </div>

          {/* Rank progress */}
          <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
            <h2 className="mb-4 text-xl font-black">🎯 Rank Progress</h2>
            {next ? (
              <>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-zinc-400">Current: <span className="font-bold text-white">{rank}</span></span>
                  <span className="text-zinc-400">Next: <span className="font-bold text-orange-300">{next.name}</span></span>
                </div>
                <div className="h-3 rounded-full bg-zinc-800">
                  <div
                    className="h-3 rounded-full bg-gradient-to-r from-orange-500 to-yellow-500 transition-all duration-700"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-xs text-zinc-500">
                  <span>{cr} CR</span>
                  <span className="text-orange-400 font-bold">{next.min - cr} CR to go</span>
                  <span>{next.min} CR</span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-3xl">🏆</span>
                <div>
                  <p className="font-black text-yellow-400">Maximum Rank Achieved!</p>
                  <p className="text-sm text-zinc-400">You&apos;ve reached the pinnacle of the ladder.</p>
                </div>
              </div>
            )}
          </div>

          {/* Match history */}
          <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
            <h2 className="mb-4 text-xl font-black">📜 Match History</h2>
            {history.length === 0 ? (
              <p className="text-zinc-500">No history saved yet.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {history.slice(-20).reverse().map((item: string, index: number) => {
                  const isWin = item.toLowerCase().includes("win") || item.includes("+");
                  const isLoss = item.toLowerCase().includes("loss") || item.includes("-");
                  return (
                    <div
                      key={index}
                      className={`rounded-xl p-3 text-sm border ${
                        isWin
                          ? "border-green-800/30 bg-green-950/20 text-green-300"
                          : isLoss
                          ? "border-red-800/30 bg-red-950/20 text-red-300"
                          : "border-white/5 bg-white/5 text-zinc-300"
                      }`}
                    >
                      {item}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Win/loss chart + status + extra stats */}
        <div className="space-y-6">
          {/* Win/Loss donut */}
          <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
            <h2 className="mb-4 text-xl font-black">🎯 Win / Loss</h2>
            <WinLossChart wins={wins} losses={losses} matches={matches} />
          </div>

          {/* Extra stats */}
          <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
            <h2 className="mb-4 text-xl font-black">📊 Extra Stats</h2>
            <div className="space-y-3">
              <StatRow label="Total Matches" value={matches.toString()} />
              <StatRow label="Kills / Match" value={kda} />
              <StatRow label="MVPs" value={mvps.toString()} />
              <StatRow label="Placement Matches" value={String(p.placement_matches || 0)} />
            </div>
          </div>

          {/* Player status */}
          <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
            <h2 className="mb-4 text-xl font-black">🔖 Status</h2>
            <div className="space-y-3">
              <Badge label="Registered" active={p.registered} />
              <Badge label="Ranked" active={p.ranked} />
              <Badge label="Blacklisted" active={p.blacklisted} danger />
            </div>
          </div>

          {/* Active cosmetics (premium only) */}
          {cosmetics && <CosmeticsPreview cosmetics={cosmetics} />}
        </div>
      </section>

      {/* Achievements */}
      <section className="mt-6 rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-black">🏅 Achievements</h2>
          <span className="rounded-xl border border-orange-600/50 bg-orange-950/30 px-3 py-1 text-sm font-bold text-orange-300">
            {unlockedCount} / {achievements.length} Unlocked
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {achievements.map((a) => (
            <AchievementBadge key={a.id} achievement={a} size="md" />
          ))}
        </div>
      </section>
    </Shell>
  );
}

function StatCard({
  title,
  value,
  color = "orange",
}: {
  title: string;
  value: string;
  color?: "orange" | "purple" | "green" | "red" | "blue" | "yellow";
}) {
  const colors = {
    orange: "text-orange-400",
    purple: "text-orange-400",
    green:  "text-green-400",
    red:    "text-red-400",
    blue:   "text-teal-400",
    yellow: "text-yellow-400",
  };
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-4">
      <p className="text-xs text-zinc-400">{title}</p>
      <p className={`mt-2 text-2xl font-black ${colors[color]}`}>{value}</p>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
      <span className="text-sm text-zinc-400">{label}</span>
      <span className="font-black text-sm">{value}</span>
    </div>
  );
}

function Badge({ label, active, danger }: { label: string; active: boolean; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white/5 p-3">
      <span className="text-sm">{label}</span>
      <span
        className={`rounded-lg px-3 py-1 text-xs font-bold ${
          active ? (danger ? "bg-red-600" : "bg-green-600") : "bg-zinc-700 text-zinc-400"
        }`}
      >
        {active ? "YES" : "NO"}
      </span>
    </div>
  );
}
