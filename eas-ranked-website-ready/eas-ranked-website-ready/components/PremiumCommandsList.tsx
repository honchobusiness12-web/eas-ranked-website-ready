import SoundLink from "@/components/SoundLink";
import { PREMIUM_COMMANDS } from "@/lib/premium-constants";

interface PremiumCommandsListProps {
  /** Show only a subset of commands (by title). Defaults to all. */
  filter?: string[];
  /** Compact single-column layout instead of the default grid. */
  compact?: boolean;
}

/**
 * Reusable grid of premium feature cards.
 * Each card shows the feature icon, title, description, status badge, and a
 * link to the feature page.
 */
export default function PremiumCommandsList({
  filter,
  compact = false,
}: PremiumCommandsListProps) {
  const commands = filter
    ? PREMIUM_COMMANDS.filter((c) => filter.includes(c.title))
    : PREMIUM_COMMANDS;

  return (
    <div
      className={
        compact
          ? "space-y-3"
          : "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      }
    >
      {commands.map((cmd) => {
        const isAvailable = cmd.status === "available";

        return (
          <SoundLink
            key={cmd.title}
            href={cmd.href}
            soundType="success"
            className={`group relative flex flex-col rounded-2xl border p-5 transition ${
              isAvailable
                ? "border-yellow-700/30 bg-gradient-to-br from-yellow-950/20 to-black hover:border-yellow-600/50 hover:from-yellow-950/30"
                : "border-white/10 bg-[#0d0d14] opacity-60 cursor-not-allowed pointer-events-none"
            }`}
          >
            {/* Status badge */}
            <span
              className={`absolute right-3 top-3 rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                isAvailable
                  ? "bg-green-900/60 text-green-400 border border-green-700/40"
                  : "bg-zinc-800 text-zinc-500 border border-zinc-700/40"
              }`}
            >
              {isAvailable ? "Available" : "Coming Soon"}
            </span>

            {/* Icon */}
            <span
              className="mb-3 text-3xl leading-none"
              role="img"
              aria-label={cmd.title}
            >
              {cmd.icon || "⭐"}
            </span>

            {/* Title */}
            <h3 className="mb-2 pr-16 font-black text-yellow-200 group-hover:text-yellow-100 transition">
              {cmd.title}
            </h3>

            {/* Description */}
            <p className="flex-1 text-sm text-zinc-400 leading-relaxed">
              {cmd.description}
            </p>

            {/* CTA */}
            {isAvailable && (
              <p className="mt-4 text-xs font-bold text-yellow-500 group-hover:text-yellow-400 transition">
                Open feature →
              </p>
            )}
          </SoundLink>
        );
      })}
    </div>
  );
}
