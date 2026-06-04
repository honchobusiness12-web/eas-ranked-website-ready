'use client';

import { useState } from 'react';
import type { PlayerBadge } from '@/lib/badges';

interface BadgeIconProps {
  badge: PlayerBadge | { badge_id: string; name: string; icon: string; color: string | null; rarity: string; description: string | null };
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

const SIZE_MAP = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
};

const RARITY_GLOW: Record<string, string> = {
  common:    'rgba(107,114,128,0.5)',
  uncommon:  'rgba(16,185,129,0.5)',
  rare:      'rgba(0,212,255,0.5)',
  epic:      'rgba(168,85,247,0.5)',
  legendary: 'rgba(255,107,107,0.5)',
  mythic:    'rgba(255,215,0,0.6)',
};

/**
 * Renders a single badge icon with an optional tooltip.
 * Falls back to a coloured emoji placeholder when the SVG is not yet present.
 */
export default function BadgeIcon({
  badge,
  size = 'md',
  showTooltip = true,
  className = '',
}: BadgeIconProps) {
  const [imgError, setImgError] = useState(false);

  const name = badge.name;
  const icon = badge.icon;
  const color = badge.color ?? '#6b7280';
  const rarity = badge.rarity ?? 'common';
  const description = badge.description ?? name;
  const glowColor = RARITY_GLOW[rarity] ?? RARITY_GLOW.common;

  const sizeClass = SIZE_MAP[size];

  return (
    <div
      className={`group relative inline-flex items-center justify-center ${sizeClass} ${className}`}
      title={showTooltip ? undefined : name}
    >
      {/* Badge image or fallback */}
      {!imgError && icon ? (
        <img
          src={icon}
          alt={name}
          className={`${sizeClass} rounded-lg object-contain hover:scale-110 transition-transform duration-200`}
          style={{ filter: `drop-shadow(0 0 6px ${glowColor})` }}
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          className={`${sizeClass} rounded-lg flex items-center justify-center text-lg font-black hover:scale-110 transition-transform duration-200`}
          style={{
            background: `linear-gradient(135deg, ${color}33, ${color}18)`,
            border: `1.5px solid ${color}60`,
            color,
            boxShadow: `0 0 8px ${glowColor}`,
          }}
        >
          🏅
        </div>
      )}

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 pointer-events-none">
          <div
            className="rounded-xl px-3 py-2 text-xs font-bold whitespace-nowrap shadow-xl"
            style={{
              background: 'rgba(10,10,20,0.95)',
              border: `1px solid ${color}50`,
              color,
            }}
          >
            <p className="font-black">{name}</p>
            {description && description !== name && (
              <p className="text-zinc-400 font-medium mt-0.5">{description}</p>
            )}
            <p
              className="text-[10px] uppercase tracking-widest mt-1 font-black"
              style={{ color: `${color}cc` }}
            >
              {rarity}
            </p>
          </div>
          {/* Arrow */}
          <div
            className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
            style={{
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: `5px solid ${color}50`,
            }}
          />
        </div>
      )}
    </div>
  );
}
