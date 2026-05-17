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
          <p className="font-bold text-xs">🏆 Season</p>
          <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] font-black text-white">OFF</span>
        </div>
        <p className="mt-1.5 text-[11px] text-yellow-300/70">⏸ No active season</p>
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
        <p className="font-bold text-xs truncate">{season.name}</p>
        <span className={`shrink-0 rounded bg-gradient-to-r ${statusBadge.cls} px-1.5 py-0.5 text-[10px] font-black text-white`}>
          {statusBadge.label}
        </span>
      </div>
      {daysNote && <p className="mt-1 text-[11px] text-yellow-300/70">{daysNote}</p>}
      {!daysNote && season.status === "paused" && <p className="mt-1 text-[11px] text-yellow-300/70">⏸ Paused</p>}
      {!daysNote && season.status === "upcoming" && <p className="mt-1 text-[11px] text-blue-300/70">🔵 Coming soon</p>}
      {!daysNote && season.status === "ended" && <p className="mt-1 text-[11px] text-red-300/70">🔴 Ended</p>}
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
        <aside className="fixed left-0 top-0 hidden h-screen w-60 border-r border-white/[0.07] bg-[#07070f] md:flex md:flex-col">
          {/* Logo */}
          <div className="shrink-0 px-5 py-4 border-b border-white/[0.07]">
            <SoundLink href="/" soundType="click" className="block text-xl font-black leading-none">
              EAS <span className="summer-text-gradient">ARENA</span>
            </SoundLink>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5 text-sm">
            {links.map(({ label, href }) => (
              <SoundLink
                key={href}
                href={href}
                soundType="success"
                className="flex items-center rounded-lg px-3 py-2 text-zinc-400 hover:bg-white/[0.06] hover:text-white transition-colors duration-150"
              >
                {label}
              </SoundLink>
            ))}

            {/* Premium section */}
            <div className="pt-3 pb-1">
              <p className="px-3 text-[10px] font-black uppercase tracking-[0.18em] text-yellow-600/60">
                💎 Premium
              </p>
            </div>
            {premiumLinks.map(({ label, href }) => (
              <SoundLink
                key={href}
                href={href}
                soundType="success"
                className="flex items-center rounded-lg px-3 py-2 text-zinc-500 hover:bg-yellow-950/20 hover:text-yellow-300 transition-colors duration-150"
              >
                {label}
              </SoundLink>
            ))}

            {/* Admin section — owner only */}
            {isOwner && (
              <>
                <div className="pt-3 pb-1">
                  <p className="px-3 text-[10px] font-black uppercase tracking-[0.18em] text-red-600/60">
                    🔐 Admin
                  </p>
                </div>
                {adminLinks.map(({ label, href }) => (
                  <SoundLink
                    key={href}
                    href={href}
                    soundType="success"
                    className="flex items-center rounded-lg px-3 py-2 text-zinc-500 hover:bg-red-950/20 hover:text-red-300 transition-colors duration-150"
                  >
                    {label}
                  </SoundLink>
                ))}
              </>
            )}
          </nav>

          {/* Bottom section */}
          <div className="shrink-0 border-t border-white/[0.07] p-3 space-y-2">
            {/* Logged-in profile shortcut */}
            {user && (
              <div className="space-y-1">
                <SoundLink
                  href={`/profile/${user.id}`}
                  soundType="click"
                  className="flex items-center gap-2.5 rounded-lg border border-[#5865F2]/25 bg-[#5865F2]/10 px-3 py-2 text-sm font-bold text-[#7289da] hover:bg-[#5865F2]/20 hover:text-white transition-colors duration-150"
                >
                  <span>👤</span>
                  <span className="truncate text-xs">{user.global_name || user.username}</span>
                </SoundLink>
                <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.03] px-3 py-1.5">
                  <span className="text-[10px] font-mono text-zinc-600 truncate">
                    {user.id}
                  </span>
                  <CopyButton text={user.id} size="xs" className="ml-1.5 shrink-0" />
                </div>
              </div>
            )}

            {/* Season status card */}
            <SoundLink
              href={isOwner ? "/admin/seasons" : "/"}
              soundType="click"
              className="rounded-xl border border-yellow-600/25 bg-gradient-to-br from-orange-950/30 to-yellow-950/20 p-3 block hover:border-yellow-500/40 transition-colors duration-150"
            >
              <SeasonStatusWidget season={season} />
            </SoundLink>
          </div>
        </aside>

        <section className="w-full md:ml-60">
          {/* Header */}
          <header className="sticky top-0 z-20 flex h-12 items-center justify-between border-b border-white/[0.07] bg-[#05050b]/90 px-4 backdrop-blur-md md:px-6">
            {/* Mobile menu button */}
            <button
              className="mr-2 flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-sm md:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? "✕" : "☰"}
            </button>

            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.25em] text-orange-400 leading-none">Elevate All-Stars</p>
              <p className="text-sm font-black leading-tight">Ranked Dashboard</p>
            </div>
            <div className="flex items-center gap-1.5">
              <ProfileMenu />
              <SoundToggle />
              <AuthButton initialUser={user} />
            </div>
          </header>

          {/* Mobile nav drawer */}
          {mobileOpen && (
            <div
              className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={() => setMobileOpen(false)}
            >
              <div
                className="absolute left-0 top-0 h-full w-60 border-r border-white/[0.07] bg-[#07070f] flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Mobile logo */}
                <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
                  <SoundLink href="/" soundType="click" className="text-xl font-black" onClick={() => setMobileOpen(false)}>
                    EAS <span className="summer-text-gradient">ARENA</span>
                  </SoundLink>
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-zinc-400 hover:text-white text-sm"
                    aria-label="Close menu"
                  >
                    ✕
                  </button>
                </div>

                <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5 text-sm">
                  {links.map(({ label, href }) => (
                    <SoundLink
                      key={href}
                      href={href}
                      soundType="success"
                      className="flex items-center rounded-lg px-3 py-2.5 text-zinc-400 hover:bg-white/[0.06] hover:text-white transition-colors"
                      onClick={() => setMobileOpen(false)}
                    >
                      {label}
                    </SoundLink>
                  ))}

                  {/* Profile links */}
                  {user && (
                    <>
                      <div className="pt-3 pb-1">
                        <p className="px-3 text-[10px] font-black uppercase tracking-[0.18em] text-blue-600/60">
                          👤 Profile
                        </p>
                      </div>
                      <SoundLink
                        href={`/profile/${user.id}`}
                        soundType="click"
                        className="flex items-center rounded-lg px-3 py-2.5 text-zinc-400 hover:bg-blue-950/20 hover:text-blue-300 transition-colors"
                        onClick={() => setMobileOpen(false)}
                      >
                        👤 My Profile
                      </SoundLink>
                    </>
                  )}

                  <div className="pt-3 pb-1">
                    <p className="px-3 text-[10px] font-black uppercase tracking-[0.18em] text-yellow-600/60">
                      💎 Premium
                    </p>
                  </div>
                  {premiumLinks.map(({ label, href }) => (
                    <SoundLink
                      key={href}
                      href={href}
                      soundType="success"
                      className="flex items-center rounded-lg px-3 py-2.5 text-zinc-500 hover:bg-yellow-950/20 hover:text-yellow-300 transition-colors"
                      onClick={() => setMobileOpen(false)}
                    >
                      {label}
                    </SoundLink>
                  ))}

                  {/* Admin section — owner only */}
                  {isOwner && (
                    <>
                      <div className="pt-3 pb-1">
                        <p className="px-3 text-[10px] font-black uppercase tracking-[0.18em] text-red-600/60">
                          🔐 Admin
                        </p>
                      </div>
                      {adminLinks.map(({ label, href }) => (
                        <SoundLink
                          key={href}
                          href={href}
                          soundType="success"
                          className="flex items-center rounded-lg px-3 py-2.5 text-zinc-500 hover:bg-red-950/20 hover:text-red-300 transition-colors"
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

          <div className="p-4 md:p-6 animate-fade-in">{children}</div>

          <footer className="mx-4 mt-8 border-t border-white/[0.07] py-4 text-center text-xs text-zinc-600 md:mx-6">
            © 2026 EAS Arena · All rights reserved
          </footer>
        </section>
      </div>
    </main>
  );
}
