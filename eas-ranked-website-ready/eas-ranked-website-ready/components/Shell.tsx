"use client";

import SoundLink from "@/components/SoundLink";
import SoundToggle from "@/components/SoundToggle";

const links = [
  ["Dashboard", "/"],
  ["Leaderboard", "/leaderboard"],
  ["Players", "/players"],
  ["Placements", "/placements"],
  ["Ranks", "/ranks"],
];

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#05050b] text-white">
      <div className="flex">
        <aside className="fixed left-0 top-0 hidden h-screen w-64 border-r border-white/10 bg-[#07070f] p-6 md:block">
          <SoundLink href="/" soundType="click" className="mb-10 block text-2xl font-black">
            EAS <span className="text-purple-500">ARENA</span>
          </SoundLink>

          <nav className="space-y-3 text-sm">
            {links.map(([label, href]) => (
              <SoundLink key={href} href={href} soundType="success" className="block rounded-xl px-4 py-3 text-zinc-400 hover:bg-purple-950/40 hover:text-white">
                {label}
              </SoundLink>
            ))}
          </nav>

          <div className="absolute bottom-8 left-6 right-6 rounded-2xl border border-purple-700/50 bg-purple-950/30 p-4">
            <p className="font-bold">Season One Live</p>
            <p className="mt-1 text-sm text-zinc-400">2026 Season</p>
            <div className="mt-4 h-2 rounded-full bg-zinc-800">
              <div className="h-2 w-2/3 rounded-full bg-purple-500" />
            </div>
          </div>
        </aside>

        <section className="w-full md:ml-64">
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-[#05050b]/80 px-5 py-4 backdrop-blur md:px-8">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-purple-400">Elevate All-Stars</p>
              <p className="text-lg font-black">Ranked Dashboard</p>
            </div>
            <div className="flex items-center gap-3">
              <SoundToggle />
              <SoundLink href="/leaderboard" soundType="success" className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold hover:bg-purple-500">
                Live Leaderboard
              </SoundLink>
            </div>
          </header>

          <div className="p-5 md:p-8">{children}</div>

          <footer className="mx-5 mt-10 border-t border-white/10 py-6 text-center text-sm text-zinc-500 md:mx-8">
            © 2026 EAS Arena. All rights reserved.
          </footer>
        </section>
      </div>
    </main>
  );
}
