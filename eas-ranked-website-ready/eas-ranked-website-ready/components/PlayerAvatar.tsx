// ---------------------------------------------------------------------------
// Fallback gradient initials — used when no image is available
// ---------------------------------------------------------------------------

const GRADIENTS = [
  "from-orange-600 to-red-600",
  "from-purple-600 to-violet-600",
  "from-blue-600 to-indigo-600",
  "from-green-600 to-teal-600",
  "from-red-600 to-pink-600",
  "from-teal-600 to-cyan-600",
  "from-pink-600 to-rose-600",
  "from-indigo-600 to-blue-600",
];

function getGradient(name?: string): string {
  if (!name) return GRADIENTS[0];
  return GRADIENTS[name.charCodeAt(0) % GRADIENTS.length];
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface PlayerAvatarProps {
  /** Display name — used for the fallback initial and aria-label */
  name?: string;
  /** Full Discord CDN avatar URL (or null/undefined for fallback) */
  avatar?: string | null;
  /** Tailwind size classes, e.g. "h-10 w-10" */
  size?: string;
}

export default function PlayerAvatar({
  name,
  avatar,
  size = "h-10 w-10",
}: PlayerAvatarProps) {
  const initial = (name || "?")[0].toUpperCase();
  const gradient = getGradient(name);

  if (!avatar) {
    return (
      <div
        aria-label={name || "Player avatar"}
        className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradient} select-none ring-1 ring-white/10 overflow-hidden`}
        style={{ borderRadius: "9999px" }}
      >
        <span aria-hidden="true" className="text-white font-black text-sm leading-none">
          {initial}
        </span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatar}
      alt={name ? `${name}'s avatar` : "Player avatar"}
      className={`${size} shrink-0 rounded-full object-cover ring-1 ring-white/10`}
      style={{ borderRadius: "9999px", flexShrink: 0 }}
      loading="lazy"
      decoding="async"
    />
  );
}
