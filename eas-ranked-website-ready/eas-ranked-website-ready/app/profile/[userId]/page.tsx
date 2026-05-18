import Shell from "@/components/ServerShell";
import PlayerAvatar from "@/components/PlayerAvatar";
import SoundLink from "@/components/SoundLink";
import RankBadge from "@/components/RankBadge";
import AchievementBadge from "@/components/AchievementBadge";
import BadgeDisplay from "@/components/BadgeDisplay";
import CopyButton from "@/components/CopyButton";
import { WinLossChart, CrSparkline } from "@/components/StatsChart";
import { getRank, getNextRank } from "@/lib/ranks";
import { getPlayerFromDB } from "@/lib/cache";
import { getAchievements, getUnlockedCount } from "@/lib/achievements";
import { parseCrProgression } from "@/lib/charts";
import { getUserBadges, DEVELOPER_USER_ID } from "@/lib/premium";
import { getSession } from "@/lib/auth";

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

  return (
    <Shell>
      {/* Hero */}
      <section
        className="rounded-2xl border border-white/10 p-6 md:p-8"
        style={{
          background: "linear-gradient(135deg, #0d0d14, #0d0d18)",
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex flex-wrap items-center gap-5">
            {/* Avatar */}
            <div className="rounded-full shrink-0">
              <PlayerAvatar name={p.name} avatar={p.avatar_url} size="h-20 w-20" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight md:text-3xl">{p.name}</h1>
              <p className="text-sm text-zinc-500 mt-0.5">{p.username || "No username saved yet"}</p>
              {/* User ID display */}
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] font-mono text-zinc-600">ID: {userId}</span>
                <CopyButton text={userId} size="xs" />
              </div>
              {/* All badges in a row */}
              {badges.length > 0 && (
                <BadgeDisplay badges={badges} size="md" className="mt-2" />
              )}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <RankBadge cr={cr} size="md" />
                {p.blacklisted && (
                  <span className="rounded-lg border border-red-600/40 bg-red-950/20 px-2.5 py-0.5 text-xs font-bold text-red-400">
                    🚫 Blacklisted
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <SoundLink
              href={`/compare?a=${p.user_id}`}
              soundType="success"
              className="rounded-lg border border-purple-600/40 px-3 py-2 text-xs font-bold text-purple-300 hover:bg-purple-950/30 transition-colors text-center"
            >
              ⚔️ Compare
            </SoundLink>
          </div>
        </div>
      </section>

      {/* Admin Panel quick access — owner only, shown on their own profile */}
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

      {/* Stats grid */}
      <section className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatCard title="CR" value={cr.toLocaleString()} color="orange" />
        <StatCard title="Wins" value={wins.toString()} color="green" />
        <StatCard title="Losses" value={losses.toString()} color="red" />
        <StatCard title="Win Rate" value={`${winRate}%`} color="blue" />
        <StatCard title="Kills" value={kills.toLocaleString()} color="yellow" />
        <StatCard title="MVPs" value={mvps.toString()} color="yellow" />
      </section>

      {/* Charts + progress */}
      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
        {/* Left: CR progression + history */}
        <div className="space-y-4">
          {/* CR Sparkline */}
          <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d18] p-5">
            <h2 className="mb-4 text-sm font-black">📈 CR Progression</h2>
            <CrSparkline points={crPoints} />
          </div>

          {/* Rank progress */}
          <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d18] p-5">
            <h2 className="mb-4 text-sm font-black">🎯 Rank Progress</h2>
            {next ? (
              <>
                <div className="flex justify-between text-xs mb-2 text-zinc-500">
                  <span>Current: <span className="font-bold text-white">{rank}</span></span>
                  <span>Next: <span className="font-bold text-orange-300">{next.name}</span></span>
                </div>
                <div className="h-2 rounded-full bg-white/[0.06]">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-orange-500 to-yellow-500 transition-all duration-700"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-[11px] text-zinc-600">
                  <span>{cr.toLocaleString()} CR</span>
                  <span className="text-orange-400 font-bold">{(next.min - cr).toLocaleString()} CR to go</span>
                  <span>{next.min.toLocaleString()} CR</span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-2xl">🏆</span>
                <div>
                  <p className="text-sm font-black text-yellow-400">Maximum Rank Achieved!</p>
                  <p className="text-xs text-zinc-500">You&apos;ve reached the pinnacle of the ladder.</p>
                </div>
              </div>
            )}
          </div>

          {/* Match history */}
          <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d18] p-5">
            <h2 className="mb-4 text-sm font-black">📜 Match History</h2>
            {history.length === 0 ? (
              <p className="text-xs text-zinc-600">No history saved yet.</p>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {history.slice(-20).reverse().map((item: string, index: number) => {
                  const isWin = item.toLowerCase().includes("win") || item.includes("+");
                  const isLoss = item.toLowerCase().includes("loss") || item.includes("-");
                  return (
                    <div
                      key={index}
                      className={`rounded-lg px-3 py-2 text-xs border ${
                        isWin
                          ? "border-green-800/20 bg-green-950/15 text-green-300"
                          : isLoss
                          ? "border-red-800/20 bg-red-950/15 text-red-300"
                          : "border-white/[0.05] bg-white/[0.03] text-zinc-400"
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
        <div className="space-y-4">
          {/* Win/Loss donut */}
          <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d18] p-5">
            <h2 className="mb-4 text-sm font-black">🎯 Win / Loss</h2>
            <WinLossChart wins={wins} losses={losses} matches={matches} />
          </div>

          {/* Extra stats */}
          <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d18] p-5">
            <h2 className="mb-3 text-sm font-black">📊 Extra Stats</h2>
            <div className="space-y-2">
              <StatRow label="Total Matches" value={matches.toString()} />
              <StatRow label="Kills / Match" value={kda} />
              <StatRow label="MVPs" value={mvps.toString()} />
              <StatRow label="Placement Matches" value={String(p.placement_matches || 0)} />
            </div>
          </div>

          {/* Player status */}
          <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d18] p-5">
            <h2 className="mb-3 text-sm font-black">🔖 Status</h2>
            <div className="space-y-2">
              <Badge label="Registered" active={p.registered} />
              <Badge label="Ranked" active={p.ranked} />
              <Badge label="Blacklisted" active={p.blacklisted} danger />
            </div>
          </div>
        </div>
      </section>

      {/* Achievements */}
      <section className="mt-4 rounded-2xl border border-white/[0.07] bg-[#0d0d18] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-black">🏅 Achievements</h2>
          <span className="rounded-lg border border-orange-600/30 bg-orange-950/20 px-2.5 py-1 text-xs font-bold text-orange-300">
            {unlockedCount} / {achievements.length}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9">
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
    <div className="rounded-xl border border-white/[0.07] bg-[#0d0d18] px-4 py-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">{title}</p>
      <p className={`mt-1.5 text-2xl font-black tracking-tight ${colors[color]}`}>{value}</p>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="text-xs font-bold text-white">{value}</span>
    </div>
  );
}

function Badge({ label, active, danger }: { label: string; active: boolean; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2">
      <span className="text-xs text-zinc-400">{label}</span>
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
