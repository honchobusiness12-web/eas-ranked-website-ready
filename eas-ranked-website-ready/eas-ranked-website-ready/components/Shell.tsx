"use client";

import SoundLink from "@/components/SoundLink";
import SoundToggle from "@/components/SoundToggle";
import { useState } from "react";

const links = [
  { label: "🏠 Dashboard",    href: "/" },
  { label: "🏆 Leaderboard",  href: "/leaderboard" },
  { label: "👥 Players",      href: "/players" },
  { label: "⚔️ Compare",      href: "/compare" },
  { label: "📋 Placements",   href: "/placements" },
  { label: "🏷️ Ranks",        href: "/ranks" },
  { label: "📖 How Ranked Works", href: "/guide" },
];

const premiumLinks = [
  { label: "💎 Get Premium",       href: "/premium/subscribe" },
  { label: "📋 Commands List",     href: "/premium/commands" },
  { label: "📊 Advanced Stats",    href: "/premium/stats" },
  { label: "🎨 Cosmetics",         href: "/premium/cosmetics" },
  { label: "⚔️ Comparisons",       href: "/premium/comparisons" },
  { label: "📥 Export Stats",      href: "/premium/export" },
  { label: "📜 Match History",     href: "/premium/matches" },
  { label: "🎯 Progress Tracker",  href: "/premium/tracker" },
  { label: "⚙️ Manage Sub",        href: "/premium/manage" },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

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
          </nav>

          {/* Season status card */}
          <div className="rounded-2xl border border-yellow-600/30 bg-gradient-to-br from-orange-950/30 to-yellow-950/20 p-4">
            <div className="flex items-center justify-between">
              <p className="font-bold text-sm">☀️ Summer Season</p>
              <span className="rounded-md bg-gradient-to-r from-orange-500 to-yellow-500 px-2 py-0.5 text-xs font-black text-white">OFF</span>
            </div>
            <p className="mt-1 text-xs text-zinc-400">2026 Season</p>
            <p className="mt-3 text-xs text-yellow-300/80">⏸ Off season — next season coming soon</p>
          </div>
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
              <SoundToggle />
              <SoundLink
                href="/leaderboard"
                soundType="success"
                className="hidden rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-4 py-2 text-sm font-bold hover:from-orange-400 hover:to-red-400 transition-all sm:block"
              >
                Leaderboard
              </SoundLink>
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
