"use client";

import SoundLink from "@/components/SoundLink";
import SoundToggle from "@/components/SoundToggle";
import AuthButton from "@/components/AuthButton";
import ProfileMenu from "@/components/ProfileMenu";
import CopyButton from "@/components/CopyButton";
import { useState, useEffect } from "react";
import type { DiscordUser } from "@/lib/auth";

const links = [
  { label: "🏠 Dashboard",         href: "/" },
  { label: "🏆 Leaderboard",       href: "/leaderboard" },
  { label: "👥 Players",           href: "/players" },
  { label: "⚔️ Compare",           href: "/compare" },
  { label: "📋 Placements",        href: "/placements" },
  { label: "🏷️ Ranks",             href: "/ranks" },
  { label: "📖 How Ranked Works",  href: "/guide" },
  { label: "🤖 Bot Commands",      href: "/premium/commands" },
  { label: "🎁 Redeem Code",       href: "/redeem" },
  { label: "💎 Get Premium",       href: "/premium/subscribe" },
];

const premiumLinks = [
  { label: "📊 Advanced Stats",    href: "/premium/stats" },
  { label: "🎨 Cosmetics",         href: "/premium/cosmetics" },
  { label: "🌈 Customize Colors",  href: "/cosmetics/colors" },
  { label: "⚔️ Comparisons",       href: "/premium/comparisons" },
  { label: "📥 Export Stats",      href: "/premium/export" },
  { label: "📜 Match History",     href: "/premium/matches" },
  { label: "🎯 Progress Tracker",  href: "/premium/tracker" },
  { label: "⚙️ Manage Sub",        href: "/premium/manage" },
];

const adminLinks = [
  { label: "🎁 Giveaway Manager", href: "/admin/giveaways" },
  { label: "⚙️ CR Admin",         href: "/admin/cr" },
  { label: "📢 Announcements",    href: "/admin/announcements" },
  { label: "🏆 Seasons",          href: "/admin/seasons" },
  { label: "🏅 Badge Manager",    href: "/admin/badges" },
  { label: "👥 Player Management",href: "/admin/players" },
  { label: "💎 Premium Manager",  href: "/admin/premium" },
  { label: "📋 Leaderboard Mgmt", href: "/admin/leaderboard" },
  { label: "📊 Analytics",        href: "/admin/analytics" },
  { label: "🛡️ Moderation",       href: "/admin/moderation" },
  { label: "📋 Audit Log",        href: "/admin/audit-logs" },
];

interface ShellSeason {
  name: string;
  status: "active" | "paused" | "ended" | "upcoming";
  end_date: string | null;
  start_date: string | null;
}

function SeasonStatusWidget({ season }: { season: ShellSeason | null }) {
  if (!season) {
    return (
      <>
        <div className="flex items-center justify-between">
          <p className="font-bold text-sm">🏆 Ranked Season</p>
          <span className="rounded-md bg-gradient-to-r from-zinc-700 to-zinc-600 px-2 py-0.5 text-xs font-black text-white">OFF</span>
        </div>
        <p className="mt-3 text-xs text-yellow-300/80">⏸ No active season</p>
      </>
    );
  }

  const statusBadge = {
    active:   { label: "LIVE",     cls: "from-green-600 to-emerald-600" },
    paused:   { label: "PAUSED",   cls: "from-yellow-600 to-amber-600" },
    ended:    { label: "ENDED",    cls: "from-red-700 to-rose-700" },
    upcoming: { label: "UPCOMING", cls: "from-blue-600 to-indigo-600" },
  }[season.status] ?? { label: "OFF", cls: "from-zinc-700 to-zinc-600" };

  let daysNote = "";
  if (season.end_date && season.status === "active") {
    const daysLeft = Math.max(0, Math.round((new Date(season.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    daysNote = `⏳ ${daysLeft}d remaining`;
  }

  return (
    <>
      <div className="flex items-center justify-between gap-1">
        <p className="font-bold text-sm truncate">{season.name}</p>
        <span className={`shrink-0 rounded-md bg-gradient-to-r ${statusBadge.cls} px-2 py-0.5 text-xs font-black text-white`}>
          {statusBadge.label}
        </span>
      </div>
      {daysNote && <p className="mt-2 text-xs text-yellow-300/80">{daysNote}</p>}
      {!daysNote && season.status === "paused" && <p className="mt-2 text-xs text-yellow-300/80">⏸ Season paused</p>}
      {!daysNote && season.status === "upcoming" && <p className="mt-2 text-xs text-blue-300/80">🔵 Coming soon</p>}
      {!daysNote && season.status === "ended" && <p className="mt-2 text-xs text-red-300/80">🔴 Season ended</p>}
    </>
  );
}

export default function Shell({
  children,
  user,
}: {
  children: React.ReactNode;
  user?: DiscordUser | null;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [season, setSeason] = useState<ShellSeason | null>(null);

  useEffect(() => {
    if (!user) return;
    // Admin nav is developer-only — probe the CR logs endpoint (403 = not developer)
    fetch("/api/admin/cr/logs?limit=1")
      .then((r) => { if (r.ok) setIsOwner(true); })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    fetch("/api/seasons/current")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.season) setSeason(data.season as ShellSeason);
      })
      .catch(() => {});
  }, []);

  return (
    <main className="min-h-screen bg-[#05050b] text-white">
      <div className="flex">
        {/* Sidebar — desktop */}
        <aside className="fixed left-0 top-0 hidden h-screen w-64 border-r border-white/10 bg-[#07070f] p-6 md:flex md:flex-col">
          <SoundLink href="/" soundType="click" className="mb-10 block text-2xl font-black">
            EAS <span className="summer-text-gradient">ARENA</span>
          </SoundLink>

          <nav className="flex-1 space-y-1 text-sm overflow-y-auto">
            {links.map(({ label, href }) => (
              <SoundLink
                key={href}
                href={href}
                soundType="success"
                className="block rounded-xl px-4 py-3 text-zinc-400 hover:bg-orange-950/30 hover:text-white transition"
              >
                {label}
              </SoundLink>
            ))}

            {/* Premium section */}
            <div className="pt-4 pb-1">
              <p className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-yellow-600/70">
                💎 Premium
              </p>
            </div>
            {premiumLinks.map(({ label, href }) => (
              <SoundLink
                key={href}
                href={href}
                soundType="success"
                className="block rounded-xl px-4 py-3 text-zinc-500 hover:bg-yellow-950/20 hover:text-yellow-300 transition"
              >
                {label}
              </SoundLink>
            ))}

            {/* Admin section — owner only */}
            {isOwner && (
              <>
                <div className="pt-4 pb-1">
                  <p className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-red-600/70">
                    🔐 Admin
                  </p>
                </div>
                {adminLinks.map(({ label, href }) => (
                  <SoundLink
                    key={href}
                    href={href}
                    soundType="success"
                    className="block rounded-xl px-4 py-3 text-zinc-500 hover:bg-red-950/20 hover:text-red-300 transition"
                  >
                    {label}
                  </SoundLink>
                ))}
              </>
            )}
          </nav>

          {/* Logged-in profile shortcut */}
          {user && (
            <div className="mb-3 space-y-1">
              <SoundLink
                href={`/profile/${user.id}`}
                soundType="click"
                className="flex items-center gap-3 rounded-xl border border-[#5865F2]/30 bg-[#5865F2]/10 px-4 py-3 text-sm font-bold text-[#7289da] hover:bg-[#5865F2]/20 hover:text-white transition"
              >
                <span>👤</span>
                <span className="truncate">{user.global_name || user.username}</span>
              </SoundLink>
              {/* User ID row */}
              <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-4 py-2">
                <span className="text-[10px] font-mono text-zinc-500 truncate">
                  ID: {user.id}
                </span>
                <CopyButton text={user.id} size="xs" className="ml-2 shrink-0" />
              </div>
              <SoundLink
                href="/players"
                soundType="click"
                className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-zinc-500 hover:bg-white/5 hover:text-zinc-300 transition"
              >
                <span>🔍</span>
                <span>Browse Player Profiles</span>
              </SoundLink>
            </div>
          )}

          {/* Season status card */}
          <SoundLink
            href={isOwner ? "/admin/seasons" : "/"}
            soundType="click"
            className="rounded-2xl border border-yellow-600/30 bg-gradient-to-br from-orange-950/30 to-yellow-950/20 p-4 block hover:border-yellow-500/50 transition"
          >
            <SeasonStatusWidget season={season} />
          </SoundLink>
        </aside>

        <section className="w-full md:ml-64">
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-[#05050b]/80 px-5 py-4 backdrop-blur md:px-8">
            {/* Mobile menu button */}
            <button
              className="mr-3 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-lg md:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? "✕" : "☰"}
            </button>

            <div className="flex-1">
              <p className="text-xs uppercase tracking-[0.3em] text-orange-400">Elevate All-Stars</p>
              <p className="text-lg font-black">Ranked Dashboard</p>
            </div>
            <div className="flex items-center gap-2">
              <ProfileMenu />
              <SoundToggle />
              <AuthButton initialUser={user} />
            </div>
          </header>

          {/* Mobile nav drawer */}
          {mobileOpen && (
            <div className="fixed inset-0 z-30 md:hidden" onClick={() => setMobileOpen(false)}>
              <div
                className="absolute left-0 top-0 h-full w-64 border-r border-white/10 bg-[#07070f] p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <SoundLink href="/" soundType="click" className="mb-8 block text-2xl font-black" onClick={() => setMobileOpen(false)}>
                  EAS <span className="summer-text-gradient">ARENA</span>
                </SoundLink>
                <nav className="space-y-1 text-sm overflow-y-auto max-h-[calc(100vh-100px)]">
                  {links.map(({ label, href }) => (
                    <SoundLink
                      key={href}
                      href={href}
                      soundType="success"
                      className="block rounded-xl px-4 py-3 text-zinc-400 hover:bg-orange-950/30 hover:text-white transition"
                      onClick={() => setMobileOpen(false)}
                    >
                      {label}
                    </SoundLink>
                  ))}

                  {/* Profile links */}
                  {user && (
                    <>
                      <div className="pt-4 pb-1">
                        <p className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-blue-600/70">
                          👤 Profile
                        </p>
                      </div>
                      <SoundLink
                        href={`/profile/${user.id}`}
                        soundType="click"
                        className="block rounded-xl px-4 py-3 text-zinc-400 hover:bg-blue-950/20 hover:text-blue-300 transition"
                        onClick={() => setMobileOpen(false)}
                      >
                        👤 My Profile
                      </SoundLink>
                      {/* User ID row — mobile */}
                      <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-4 py-2 mx-0">
                        <span className="text-[10px] font-mono text-zinc-500 truncate">
                          ID: {user.id}
                        </span>
                        <CopyButton text={user.id} size="xs" className="ml-2 shrink-0" />
                      </div>
                      <SoundLink
                        href="/players"
                        soundType="click"
                        className="block rounded-xl px-4 py-3 text-zinc-400 hover:bg-blue-950/20 hover:text-blue-300 transition"
                        onClick={() => setMobileOpen(false)}
                      >
                        🔍 Browse Profiles
                      </SoundLink>
                    </>
                  )}

                  <div className="pt-4 pb-1">
                    <p className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-yellow-600/70">
                      💎 Premium
                    </p>
                  </div>
                  {premiumLinks.map(({ label, href }) => (
                    <SoundLink
                      key={href}
                      href={href}
                      soundType="success"
                      className="block rounded-xl px-4 py-3 text-zinc-500 hover:bg-yellow-950/20 hover:text-yellow-300 transition"
                      onClick={() => setMobileOpen(false)}
                    >
                      {label}
                    </SoundLink>
                  ))}

                  {/* Admin section — owner only */}
                  {isOwner && (
                    <>
                      <div className="pt-4 pb-1">
                        <p className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-red-600/70">
                          🔐 Admin
                        </p>
                      </div>
                      {adminLinks.map(({ label, href }) => (
                        <SoundLink
                          key={href}
                          href={href}
                          soundType="success"
                          className="block rounded-xl px-4 py-3 text-zinc-500 hover:bg-red-950/20 hover:text-red-300 transition"
                          onClick={() => setMobileOpen(false)}
                        >
                          {label}
                        </SoundLink>
                      ))}
                    </>
                  )}
                </nav>
              </div>
            </div>
          )}

          <div className="p-5 md:p-8 animate-fade-in">{children}</div>

          <footer className="mx-5 mt-10 border-t border-white/10 py-6 text-center text-sm text-zinc-500 md:mx-8">
            © 2026 EAS Arena. All rights reserved.
          </footer>
        </section>
      </div>
    </main>
  );
}
