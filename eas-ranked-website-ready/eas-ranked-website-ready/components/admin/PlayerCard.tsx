"use client";

import type { PlayerSearchResult } from "@/lib/admin/actions";
import type { ToastMessage } from "@/components/admin/Toast";
import BadgeManager from "@/components/admin/BadgeManager";
import PremiumToggle from "@/components/admin/PremiumToggle";
import StatEditor from "@/components/admin/StatEditor";

interface PlayerCardProps {
  player: PlayerSearchResult;
  onPlayerChanged: (updated: PlayerSearchResult) => void;
  onToast: (toast: ToastMessage) => void;
}

/**
 * Full player detail card.
 * Displays identity, stats, badges, and premium status.
 * Delegates mutations to BadgeManager, PremiumToggle, and StatEditor.
 */
export default function PlayerCard({
  player,
  onPlayerChanged,
  onToast,
}: PlayerCardProps) {
  const initials =
    player.name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "??";

  function handleBadgesChanged(
    updatedBadges: PlayerSearchResult["badges"]
  ) {
    onPlayerChanged({ ...player, badges: updatedBadges });
  }

  function handlePremiumChanged(premium: boolean) {
    onPlayerChanged({ ...player, premium });
  }

  function handleStatsChanged(updated: PlayerSearchResult) {
    onPlayerChanged(updated);
  }

  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{
        border: "2px solid rgba(255,255,255,0.10)",
        background:
          "linear-gradient(135deg, rgba(255,255,255,0.02), rgba(0,0,0,0.40))",
        boxShadow: "0 0 40px rgba(0,0,0,0.40)",
      }}
    >
      {/* ── Header ── */}
      <div
        className="px-6 py-5 border-b border-white/8 flex items-center gap-4"
        style={{
          background:
            "linear-gradient(135deg, rgba(0,255,136,0.05), rgba(0,212,255,0.03))",
        }}
      >
        {/* Avatar */}
        <div
          className="flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center font-black text-lg text-black select-none shadow-lg"
          style={{ background: "linear-gradient(135deg, #00FF88, #00D4FF)" }}
        >
          {initials}
        </div>

        {/* Identity */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-black text-white truncate">
              {player.name}
            </h2>
            {player.premium && (
              <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-black border border-yellow-500/50 bg-yellow-950/30 text-yellow-300">
                ⭐ Premium
              </span>
            )}
            {player.blacklisted && (
              <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-black border border-red-500/50 bg-red-950/30 text-red-300">
                🚫 Blacklisted
              </span>
            )}
            {player.ranked && (
              <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-black border border-cyan-500/50 bg-cyan-950/30 text-cyan-300">
                🏆 Ranked
              </span>
            )}
          </div>
          {player.username && (
            <p className="text-sm font-bold text-zinc-400 mt-0.5">
              @{player.username}
            </p>
          )}
          <p className="text-[11px] font-mono text-zinc-600 mt-0.5">
            {player.user_id}
          </p>
        </div>

        {/* CR badge */}
        <div className="flex-shrink-0 text-right">
          <p className="text-3xl font-black text-cyan-300">{player.cr}</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            CR
          </p>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="px-6 py-5 space-y-6">
        {/* Premium toggle */}
        <section>
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">
            Premium Status
          </p>
          <PremiumToggle
            player={player}
            onPremiumChanged={handlePremiumChanged}
            onToast={onToast}
          />
          {player.premium_expires_at && (
            <p className="mt-1.5 text-[11px] font-bold text-zinc-500">
              Expires:{" "}
              {new Date(player.premium_expires_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          )}
        </section>

        {/* Divider */}
        <div className="border-t border-white/8" />

        {/* Badge manager */}
        <section>
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">
            Badges
          </p>
          <BadgeManager
            player={player}
            onBadgesChanged={handleBadgesChanged}
            onToast={onToast}
          />
        </section>

        {/* Divider */}
        <div className="border-t border-white/8" />

        {/* Stat editor */}
        <section>
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">
            Player Stats
          </p>
          <StatEditor
            player={player}
            onStatsChanged={handleStatsChanged}
            onToast={onToast}
          />
        </section>
      </div>
    </div>
  );
}
