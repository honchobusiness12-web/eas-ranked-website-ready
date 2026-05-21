"use client";

import { useEffect, useState } from "react";
import type { RankTheme } from "@/lib/rankThemes";

interface RankUpCelebrationProps {
  /** The new rank name the player just achieved */
  newRank: string;
  /** Theme for the new rank */
  theme: RankTheme;
  /** Called when the animation finishes and the component should unmount */
  onDone?: () => void;
}

/**
 * CSS-only rank-up celebration overlay.
 * Shows a glow pulse + floating particles + rank badge scale animation.
 * Respects prefers-reduced-motion.
 */
export default function RankUpCelebration({ newRank, theme, onDone }: RankUpCelebrationProps) {
  const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter");

  useEffect(() => {
    // enter → hold after 400ms
    const t1 = setTimeout(() => setPhase("hold"), 400);
    // hold → exit after 3s
    const t2 = setTimeout(() => setPhase("exit"), 3000);
    // unmount after exit animation
    const t3 = setTimeout(() => onDone?.(), 3600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  const opacity = phase === "exit" ? 0 : 1;
  const scale   = phase === "enter" ? 0.85 : 1;

  // Generate 8 particle positions
  const particles = Array.from({ length: 8 }, (_, i) => ({
    angle: (i / 8) * 360,
    delay: i * 80,
    size: 4 + (i % 3) * 2,
  }));

  return (
    <div
      aria-live="polite"
      aria-label={`Rank up! You are now ${newRank}`}
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
      style={{
        opacity,
        transition: "opacity 0.5s ease",
      }}
    >
      {/* Backdrop blur */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)" }}
      />

      {/* Card */}
      <div
        className="relative flex flex-col items-center gap-4 rounded-3xl border px-10 py-8 text-center"
        style={{
          background: `linear-gradient(135deg, #0d0d18 0%, ${theme.primary}18 100%)`,
          borderColor: `${theme.primary}50`,
          boxShadow: `0 0 60px ${theme.glow}, 0 0 120px ${theme.glow}`,
          transform: `scale(${scale})`,
          transition: "transform 0.4s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        {/* Particles */}
        {particles.map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: p.size,
              height: p.size,
              background: i % 2 === 0 ? theme.primary : theme.secondary,
              top: "50%",
              left: "50%",
              transform: `rotate(${p.angle}deg) translateY(-60px)`,
              opacity: phase === "hold" ? 0.8 : 0,
              transition: `opacity 0.4s ease ${p.delay}ms, transform 0.6s ease ${p.delay}ms`,
              animation: phase === "hold" ? `float 2s ease-in-out ${p.delay}ms infinite` : "none",
            }}
          />
        ))}

        {/* Rank icon */}
        <div
          className="flex h-20 w-20 items-center justify-center rounded-2xl text-5xl"
          style={{
            background: theme.gradient,
            boxShadow: `0 0 30px ${theme.glow}`,
            animation: "rank-up-badge 0.6s cubic-bezier(0.34,1.56,0.64,1) both",
          }}
        >
          🏆
        </div>

        {/* Text */}
        <div>
          <p
            className="text-xs font-bold uppercase tracking-widest mb-1"
            style={{ color: theme.primary }}
          >
            Rank Up!
          </p>
          <p className="text-2xl font-black text-white">{newRank}</p>
          <p className="mt-1 text-xs text-zinc-400">You&apos;ve reached a new rank</p>
        </div>

        {/* Glow ring */}
        <div
          className="absolute inset-0 rounded-3xl"
          style={{
            border: `2px solid ${theme.primary}`,
            opacity: 0.4,
            animation: "glow-pulse 1.5s ease-in-out infinite",
          }}
        />
      </div>

      <style>{`
        @keyframes rank-up-badge {
          from { opacity: 0; transform: scale(0.5) rotate(-10deg); }
          to   { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>
    </div>
  );
}
