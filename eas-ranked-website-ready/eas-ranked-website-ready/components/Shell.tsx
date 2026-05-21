"use client";

import SoundLink from "@/components/SoundLink";
import SoundToggle from "@/components/SoundToggle";
import AuthButton from "@/components/AuthButton";
import ProfileMenu from "@/components/ProfileMenu";
import CopyButton from "@/components/CopyButton";
import { PageTransition } from "@/components/PageTransition";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import type { DiscordUser } from "@/lib/auth";

const links = [
  { label: "🏠 Dashboard",         href: "/" },
  { label: "🏆 Leaderboard",       href: "/leaderboard" },
  { label: "👥 Players",           href: "/players" },
  { label: "⚔️ Compare",           href: "/compare" },
  { label: "📋 Placements",        href: "/placements" },
  { label: "🏷️ Ranks",             href: "/ranks" },
  { label: "📖 How Ranked Works",  href: "/guide" },
  { label: "🎁 Redeem Code",       href: "/redeem" },
];

const adminLinks = [
  { label: "🎁 Giveaway Manager", href: "/admin/giveaways" },
  { label: "⚙️ CR Admin",         href: "/admin/cr" },
  { label: "📢 Announcements",    href: "/admin/announcements" },
  { label: "🏆 Seasons",          href: "/admin/seasons" },
  { label: "🏅 Badge Manager",    href: "/admin/badges" },
  { label: "👥 Player Management",href: "/admin/players" },
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
          <p className="text-xs font-bold text-zinc-500">🏆 Season</p>
          <span className="rounded-full border border-zinc-700/50 bg-zinc-800/60 px-1.5 py-0.5 text-[10px] font-bold text-zinc-600">OFF</span>
        </div>
        <p className="mt-1 text-[10px] text-zinc-700">No active season</p>
      </>
    );
  }

  const statusBadge = {
    active:   { label: "LIVE",   cls: "border-green-500/30 bg-green-500/15 text-green-300" },
    paused:   { label: "PAUSED", cls: "border-yellow-500/30 bg-yellow-500/15 text-yellow-300" },
    ended:    { label: "ENDED",  cls: "border-red-500/30 bg-red-500/15 text-red-300" },
    upcoming: { label: "SOON",   cls: "border-blue-500/30 bg-blue-500/15 text-blue-300" },
  }[season.status] ?? { label: "OFF", cls: "border-zinc-700/50 bg-zinc-800/60 text-zinc-500" };

  let daysNote = "";
  if (season.end_date && season.status === "active") {
    const daysLeft = Math.max(0, Math.round((new Date(season.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    daysNote = `${daysLeft}d left`;
  }

  return (
    <>
      <div className="flex items-center justify-between gap-1">
        <p className="text-xs font-semibold text-zinc-400 truncate">{season.name}</p>
        <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-bold ${statusBadge.cls}`}>
          {statusBadge.label}
        </span>
      </div>
      {daysNote && <p className="mt-0.5 text-[10px] text-purple-400/80">⏳ {daysNote}</p>}
      {!daysNote && season.status === "paused" && <p className="mt-0.5 text-[10px] text-yellow-400/70">⏸ Paused</p>}
      {!daysNote && season.status === "upcoming" && <p className="mt-0.5 text-[10px] text-blue-400/70">🔵 Coming soon</p>}
      {!daysNote && season.status === "ended" && <p className="mt-0.5 text-[10px] text-red-400/70">🔴 Ended</p>}
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
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [season, setSeason] = useState<ShellSeason | null>(null);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!user) return;
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

  const sidebarW = sidebarCollapsed ? "w-[68px]" : "w-64";
  const contentML = sidebarCollapsed ? "md:ml-[68px]" : "md:ml-64";

  return (
    <main className="min-h-screen text-white" style={{ background: "#04040e" }}>
      <div className="flex">

        {/* ── Sidebar — desktop ── */}
        <aside
          className={`fixed left-0 top-0 hidden h-screen flex-col border-r border-white/[0.05] md:flex transition-all duration-300 ${sidebarW} z-40 overflow-y-auto`}
          style={{ background: "rgba(6,6,20,0.97)", backdropFilter: "blur(24px)" }}
        >
          {/* Logo + collapse toggle */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-white/[0.05]">
            {!sidebarCollapsed && (
              <SoundLink href="/" soundType="click" className="group flex items-center gap-2 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-base" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(79,142,247,0.2))", border: "1px solid rgba(168,85,247,0.25)" }}>
                  🏆
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black tracking-tight text-white/90 group-hover:text-white transition-colors leading-none">
                    EAS <span className="summer-text-gradient">ARENA</span>
                  </p>
                  <p className="text-[9px] text-zinc-600 font-medium tracking-widest uppercase leading-none mt-0.5">Ranked Dashboard</p>
                </div>
              </SoundLink>
            )}
            {sidebarCollapsed && (
              <SoundLink href="/" soundType="click" className="mx-auto flex h-8 w-8 items-center justify-center rounded-xl text-base" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(79,142,247,0.2))", border: "1px solid rgba(168,85,247,0.25)" }}>
                🏆
              </SoundLink>
            )}
            {!sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03] text-zinc-600 transition-all duration-200 hover:bg-white/[0.07] hover:text-zinc-300"
                title="Collapse sidebar"
              >
                ‹
              </button>
            )}
            {sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="absolute -right-3 top-[72px] flex h-6 w-6 items-center justify-center rounded-full border border-white/[0.10] bg-zinc-900 text-zinc-400 shadow-lg transition-all duration-200 hover:text-white"
                title="Expand sidebar"
              >
                ›
              </button>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5 text-sm">
            {links.map(({ label, href }) => {
              const emoji = label.split(" ")[0];
              const text = label.slice(label.indexOf(" ") + 1);
              const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
              return (
                <div key={href} className="group relative">
                  <SoundLink
                    href={href}
                    soundType="success"
                    className={`relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition-all duration-200 ${sidebarCollapsed ? "justify-center" : ""} ${
                      isActive
                        ? "bg-purple-500/[0.12] text-purple-200 border border-purple-500/20"
                        : "text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-200 border border-transparent"
                    }`}
                    title={sidebarCollapsed ? label : undefined}
                  >
                    {isActive && (
                      <>
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r-full bg-purple-400 tab-indicator" />
                        <span className="absolute inset-0 rounded-xl bg-purple-500/10 active-tab-glow" />
                      </>
                    )}
                    <span className="relative shrink-0 text-base leading-none">{emoji}</span>
                    {!sidebarCollapsed && <span className="relative truncate text-[13px] font-medium">{text}</span>}
                  </SoundLink>

                  {/* Tooltip for collapsed sidebar */}
                  {sidebarCollapsed && (
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 hidden group-hover:block z-50">
                      <div className="rounded-lg bg-zinc-900 border border-white/[0.10] px-2.5 py-1.5 text-xs font-bold text-white whitespace-nowrap shadow-lg">
                        {text}
                        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-zinc-900" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Admin section */}
            {isOwner && (
              <>
                {!sidebarCollapsed ? (
                  <div className="pt-4 pb-1.5 px-2">
                    <div className="flex items-center gap-1.5">
                      <div className="h-px flex-1 bg-gradient-to-r from-red-500/30 to-transparent" />
                      <p className="text-[9px] font-bold uppercase tracking-widest text-red-500/60">Admin</p>
                      <div className="h-px flex-1 bg-gradient-to-l from-red-500/30 to-transparent" />
                    </div>
                  </div>
                ) : (
                  <div className="pt-3 pb-1 flex justify-center">
                    <div className="h-px w-8 bg-red-500/30" />
                  </div>
                )}
                {adminLinks.map(({ label, href }) => {
                  const emoji = label.split(" ")[0];
                  const text = label.slice(label.indexOf(" ") + 1);
                  const isActive = pathname === href || pathname.startsWith(href);
                  return (
                    <div key={href} className="group relative">
                      <SoundLink
                        href={href}
                        soundType="success"
                        className={`relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition-all duration-200 ${sidebarCollapsed ? "justify-center" : ""} ${
                          isActive
                            ? "bg-red-500/[0.10] text-red-300 border border-red-500/20"
                            : "text-zinc-600 hover:bg-red-500/[0.07] hover:text-red-300 border border-transparent"
                        }`}
                        title={sidebarCollapsed ? label : undefined}
                      >
                        {isActive && (
                          <>
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r-full bg-red-400 tab-indicator" />
                            <span className="absolute inset-0 rounded-xl bg-red-500/10 active-tab-glow" />
                          </>
                        )}
                        <span className="relative shrink-0 text-base leading-none">{emoji}</span>
                        {!sidebarCollapsed && <span className="relative truncate text-[13px] font-medium">{text}</span>}
                      </SoundLink>

                      {/* Tooltip for collapsed sidebar */}
                      {sidebarCollapsed && (
                        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 hidden group-hover:block z-50">
                          <div className="rounded-lg bg-zinc-900 border border-white/[0.10] px-2.5 py-1.5 text-xs font-bold text-white whitespace-nowrap shadow-lg">
                            {text}
                            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-zinc-900" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </nav>

          {/* Bottom section */}
          {!sidebarCollapsed && (
            <div className="border-t border-white/[0.05] px-3 py-3 space-y-2">
              {user && (
                <SoundLink
                  href={`/profile/${user.id}`}
                  soundType="click"
                  className="flex items-center gap-2.5 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.07] px-3 py-2.5 text-sm font-semibold text-indigo-300 transition-all duration-200 hover:border-indigo-400/30 hover:bg-indigo-500/[0.12] hover:text-white"
                >
                  <span className="text-base">👤</span>
                  <span className="truncate text-sm">{user.global_name || user.username}</span>
                  <CopyButton text={user.id} size="xs" className="ml-auto shrink-0 opacity-40 hover:opacity-100" />
                </SoundLink>
              )}
              <SoundLink
                href={isOwner ? "/admin/seasons" : "/"}
                soundType="click"
                className="block rounded-xl border border-purple-500/15 bg-purple-500/[0.06] px-3 py-2.5 transition-all duration-200 hover:border-purple-400/25 hover:bg-purple-500/[0.10]"
              >
                <SeasonStatusWidget season={season} />
              </SoundLink>
            </div>
          )}
          {sidebarCollapsed && user && (
            <div className="border-t border-white/[0.05] px-2 py-3 flex justify-center">
              <SoundLink href={`/profile/${user.id}`} soundType="click" title="My Profile" className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/[0.07] text-base transition-all duration-200 hover:bg-indigo-500/[0.15]">
                👤
              </SoundLink>
            </div>
          )}
        </aside>

        {/* ── Main content area ── */}
        <section className={`w-full min-w-0 transition-all duration-300 ${contentML}`}>

          {/* ── Loading progress bar ── */}
          <LoadingOverlay />

          {/* ── Top header ── */}
          <header
            className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-white/[0.05] px-4 md:px-6"
            style={{ background: "rgba(4,4,14,0.92)", backdropFilter: "blur(24px)" }}
          >
            {/* Mobile menu button */}
            <button
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-sm transition-all duration-200 hover:bg-white/[0.08] md:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? "✕" : "☰"}
            </button>

            {/* Breadcrumb / title */}
            <div className="flex-1 min-w-0 flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" />
                <p className="text-[11px] font-bold uppercase tracking-widest text-purple-400/70">EAS Arena</p>
              </div>
              <div className="hidden md:block h-4 w-px bg-white/[0.08]" />
              <p className="text-sm font-black tracking-tight text-white/80">Ranked Dashboard</p>
            </div>

            <div className="flex items-center gap-2">
              <ProfileMenu />
              <SoundToggle />
              <AuthButton initialUser={user} />
            </div>
          </header>

          {/* ── Mobile nav drawer ── */}
          {mobileOpen && (
            <div className="fixed inset-0 z-50 md:hidden" onClick={() => setMobileOpen(false)}>
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" />
              <div
                className="absolute left-0 top-0 h-full w-72 border-r border-white/[0.05] flex flex-col animate-slide-in"
                style={{ background: "rgba(6,6,20,0.99)", backdropFilter: "blur(24px)" }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
                  <SoundLink href="/" soundType="click" className="text-xl font-black" onClick={() => setMobileOpen(false)}>
                    EAS <span className="summer-text-gradient">ARENA</span>
                  </SoundLink>
                  <button onClick={() => setMobileOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-zinc-400 hover:text-white">
                    ✕
                  </button>
                </div>

                <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5 text-sm">
                  {links.map(({ label, href }) => {
                    const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
                    return (
                      <SoundLink
                        key={href}
                        href={href}
                        soundType="success"
                        className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-all duration-200 ${
                          isActive
                            ? "bg-purple-500/[0.12] text-purple-200 border border-purple-500/20"
                            : "text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200 border border-transparent"
                        }`}
                        onClick={() => setMobileOpen(false)}
                      >
                        {label}
                      </SoundLink>
                    );
                  })}

                  {user && (
                    <>
                      <div className="pt-4 pb-1.5 px-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500/70">Profile</p>
                      </div>
                      <SoundLink
                        href={`/profile/${user.id}`}
                        soundType="click"
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-zinc-400 transition-all duration-200 hover:bg-indigo-500/[0.07] hover:text-indigo-300 border border-transparent"
                        onClick={() => setMobileOpen(false)}
                      >
                        👤 My Profile
                      </SoundLink>
                    </>
                  )}

                  {isOwner && (
                    <>
                      <div className="pt-4 pb-1.5 px-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-red-500/70">Admin</p>
                      </div>
                      {adminLinks.map(({ label, href }) => {
                        const isActive = pathname === href || pathname.startsWith(href);
                        return (
                          <SoundLink
                            key={href}
                            href={href}
                            soundType="success"
                            className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-all duration-200 ${
                              isActive
                                ? "bg-red-500/[0.10] text-red-300 border border-red-500/20"
                                : "text-zinc-500 hover:bg-red-500/[0.07] hover:text-red-300 border border-transparent"
                            }`}
                            onClick={() => setMobileOpen(false)}
                          >
                            {label}
                          </SoundLink>
                        );
                      })}
                    </>
                  )}
                </nav>
              </div>
            </div>
          )}

          {/* ── Page content — full width, no artificial max-width cap ── */}
          <PageTransition>
            <div className="w-full px-4 py-6 md:px-8 md:py-8">
              {children}
            </div>
          </PageTransition>

          <footer className="border-t border-white/[0.04] px-8 py-6 mt-4">
            <div className="flex flex-col items-center gap-1 text-center">
              <p className="text-sm font-black">
                <span className="summer-text-gradient">EAS Arena</span>
              </p>
              <p className="text-[11px] text-zinc-700">© 2026 Elevate All-Stars · All rights reserved</p>
            </div>
          </footer>
        </section>
      </div>
    </main>
  );
}
