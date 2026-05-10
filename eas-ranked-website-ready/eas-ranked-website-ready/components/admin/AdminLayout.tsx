"use client";

import SoundLink from "@/components/SoundLink";

// ---------------------------------------------------------------------------
// AdminLayout — shared header/wrapper for admin pages
// ---------------------------------------------------------------------------

interface AdminLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

const adminNavLinks = [
  { label: "🏅 Badge Manager", href: "/admin/badges" },
  { label: "👥 Player Management", href: "/admin/players" },
  { label: "💎 Premium Manager", href: "/admin/premium" },
  { label: "📋 Leaderboard Mgmt", href: "/admin/leaderboard" },
  { label: "📊 Analytics", href: "/admin/analytics" },
  { label: "🛡️ Moderation", href: "/admin/moderation" },
  { label: "🎁 Giveaway Manager", href: "/admin/giveaways" },
  { label: "⚙️ CR Admin", href: "/admin/cr" },
  { label: "📢 Announcements", href: "/admin/announcements" },
  { label: "🏆 Seasons", href: "/admin/seasons" },
];

export function AdminLayout({ title, subtitle, children }: AdminLayoutProps) {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
          )}
        </div>
        <SoundLink
          href="/"
          soundType="click"
          className="text-xs text-zinc-600 hover:text-zinc-400 transition font-bold"
        >
          ← Back to Dashboard
        </SoundLink>
      </div>

      {/* Admin quick-nav */}
      <div className="flex flex-wrap gap-2">
        {adminNavLinks.map(({ label, href }) => (
          <SoundLink
            key={href}
            href={href}
            soundType="click"
            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-bold text-zinc-500 hover:bg-red-950/20 hover:text-red-300 hover:border-red-800/40 transition"
          >
            {label}
          </SoundLink>
        ))}
      </div>

      {/* Page content */}
      <div>{children}</div>
    </div>
  );
}
