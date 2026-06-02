"use client";

import { useState } from "react";

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
// Fallback component — gradient circle with initial letter
// ---------------------------------------------------------------------------

function AvatarFallback({
  name,
  size,
}: {
  name?: string;
  size: string;
}) {
  const initial = (name || "?")[0].toUpperCase();
  const gradient = getGradient(name);

  return (
    <div
      aria-label={name || "Player avatar"}
      className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradient} select-none ring-1 ring-white/10 overflow-hidden`}
      style={{ borderRadius: "9999px" }}
    >
      {/* Visually hidden — screen readers get the aria-label above */}
      <span aria-hidden="true" className="text-white font-black text-sm leading-none">
        {initial}
      </span>
    </div>
  );
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
  // Track whether the image has errored so we can swap to the fallback.
  const [errored, setErrored] = useState(false);
  // Track loading state for the skeleton pulse.
  const [loaded, setLoaded] = useState(false);

  // No URL provided, or the image already errored → show gradient fallback
  if (!avatar || errored) {
    return <AvatarFallback name={name} size={size} />;
  }

  return (
    <div
      className={`relative ${size} shrink-0 overflow-hidden rounded-full ring-1 ring-white/10`}
      style={{ borderRadius: "9999px", flexShrink: 0 }}
    >
      {/* Skeleton pulse shown until the image loads */}
      {!loaded && (
        <div
          aria-hidden="true"
          className="absolute inset-0 animate-pulse rounded-full bg-white/10"
          style={{ borderRadius: "9999px" }}
        />
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={avatar}
        // Empty alt keeps the image accessible without showing text inside
        // the circle; the parent element should provide context.
        alt=""
        aria-label={name ? `${name}'s avatar` : "Player avatar"}
        className="h-full w-full rounded-full"
        style={{
          objectFit: "cover",
          objectPosition: "center",
          borderRadius: "9999px",
          display: "block",
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.2s ease",
        }}
        loading="lazy"
        decoding="async"
        crossOrigin="anonymous"
        onLoad={() => setLoaded(true)}
        onError={() => {
          setLoaded(true); // stop skeleton
          setErrored(true); // swap to fallback
        }}
      />
    </div>
  );
}
