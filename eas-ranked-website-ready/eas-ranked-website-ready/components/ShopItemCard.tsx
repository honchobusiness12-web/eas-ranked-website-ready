'use client';

import { useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ShopItem {
  id: number;
  name: string;
  description: string | null;
  price: number;
  category: string;
  rarity: string;
  active: boolean;
  limited: boolean;
  max_stock: number | null;
  current_stock: number | null;
  min_value: number | null;
  max_value: number | null;
  resale_percent: number;
  badge_id: string | null;
  role_id: string | null;
  total_bought?: number;
  total_resold?: number;
}

interface ShopItemCardProps {
  item: ShopItem;
  onBuy: (item: ShopItem) => void;
  isOwned: boolean;
  userBalance: number;
  isLoggedIn: boolean;
}

// ---------------------------------------------------------------------------
// Rarity config
// ---------------------------------------------------------------------------

export const RARITY_CONFIG: Record<string, { color: string; glow: string; label: string }> = {
  common:    { color: '#6b7280', glow: 'rgba(107,114,128,0.3)',  label: 'Common' },
  uncommon:  { color: '#10b981', glow: 'rgba(16,185,129,0.3)',   label: 'Uncommon' },
  rare:      { color: '#00d4ff', glow: 'rgba(0,212,255,0.3)',    label: 'Rare' },
  epic:      { color: '#a855f7', glow: 'rgba(168,85,247,0.3)',   label: 'Epic' },
  legendary: { color: '#ff6b6b', glow: 'rgba(255,107,107,0.3)', label: 'Legendary' },
  mythic:    { color: '#ffd700', glow: 'rgba(255,215,0,0.35)',   label: 'Mythic' },
};

export function getRarityConfig(rarity: string) {
  return RARITY_CONFIG[rarity.toLowerCase()] ?? RARITY_CONFIG.common;
}

// ---------------------------------------------------------------------------
// Category icon helper
// ---------------------------------------------------------------------------

function categoryIcon(cat: string): string {
  const c = cat.toLowerCase();
  if (c === 'badge')    return '🏅';
  if (c === 'role')     return '👑';
  if (c === 'cosmetic') return '🎨';
  if (c === 'boost')    return '⚡';
  if (c === 'title')    return '📛';
  return '🛍️';
}

// ---------------------------------------------------------------------------
// Rarity Badge
// ---------------------------------------------------------------------------

export function RarityBadge({ rarity }: { rarity: string }) {
  const cfg = getRarityConfig(rarity);
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest"
      style={{
        background: `${cfg.color}22`,
        border: `1px solid ${cfg.color}60`,
        color: cfg.color,
      }}
    >
      {cfg.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// ShopItemCard
// ---------------------------------------------------------------------------

export default function ShopItemCard({
  item,
  onBuy,
  isOwned,
  userBalance,
  isLoggedIn,
}: ShopItemCardProps) {
  const [hovered, setHovered] = useState(false);
  const cfg = getRarityConfig(item.rarity);

  const isOutOfStock = item.limited && item.current_stock !== null && item.current_stock <= 0;
  const canAfford = userBalance >= item.price;
  const buyDisabled = !isLoggedIn || isOwned || isOutOfStock || !canAfford;

  let buyLabel = '⭐ Buy';
  if (!isLoggedIn)    buyLabel = '🔒 Login to Buy';
  else if (isOwned)   buyLabel = '✅ Owned';
  else if (isOutOfStock) buyLabel = '❌ Out of Stock';
  else if (!canAfford)   buyLabel = '💸 Insufficient SP';

  return (
    <div
      className="relative flex flex-col overflow-hidden rounded-2xl transition-all duration-200"
      style={{
        background: 'rgba(6,43,69,0.85)',
        border: `1px solid ${hovered ? cfg.color + '60' : cfg.color + '28'}`,
        boxShadow: hovered ? `0 8px 32px ${cfg.glow}` : 'none',
        transform: hovered ? 'translateY(-2px)' : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Rarity top accent */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl"
        style={{ background: `linear-gradient(90deg, ${cfg.color}90, transparent)` }}
      />

      {/* Limited badge */}
      {item.limited && (
        <div className="absolute top-3 right-3 z-10">
          <span
            className="rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest"
            style={{ background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.5)', color: '#f59e0b' }}
          >
            LIMITED
          </span>
        </div>
      )}

      {/* Item icon */}
      <div className="flex items-center justify-center pt-6 pb-3">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
          style={{
            background: `${cfg.color}18`,
            border: `2px solid ${cfg.color}40`,
            boxShadow: hovered ? `0 0 20px ${cfg.glow}` : 'none',
          }}
        >
          {categoryIcon(item.category)}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col px-4 pb-4 gap-2">
        {/* Name + rarity */}
        <div>
          <h3 className="text-sm font-black leading-tight" style={{ color: '#e2f4ff' }}>
            {item.name}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <RarityBadge rarity={item.rarity} />
            <span
              className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
              style={{ background: 'rgba(0,207,255,0.1)', border: '1px solid rgba(0,207,255,0.2)', color: 'rgba(0,207,255,0.8)' }}
            >
              {item.category}
            </span>
          </div>
        </div>

        {/* Description */}
        {item.description && (
          <p className="text-xs leading-relaxed" style={{ color: 'rgba(168,255,246,0.55)' }}>
            {item.description}
          </p>
        )}

        {/* Stock info */}
        {item.limited ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold" style={{ color: 'rgba(168,255,246,0.45)' }}>
              Stock:
            </span>
            <span
              className="text-[10px] font-black"
              style={{ color: isOutOfStock ? '#ef4444' : item.current_stock !== null && item.current_stock <= 5 ? '#f59e0b' : '#10b981' }}
            >
              {isOutOfStock
                ? 'Out of Stock'
                : item.current_stock !== null
                ? `${item.current_stock}${item.max_stock ? ` / ${item.max_stock}` : ''} remaining`
                : 'Limited'}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold" style={{ color: 'rgba(168,255,246,0.45)' }}>
              Stock:
            </span>
            <span className="text-[10px] font-black" style={{ color: '#10b981' }}>
              Unlimited
            </span>
          </div>
        )}

        {/* Value range */}
        {(item.min_value !== null || item.max_value !== null) && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold" style={{ color: 'rgba(168,255,246,0.45)' }}>
              Value:
            </span>
            <span className="text-[10px] font-black" style={{ color: '#A8FFF6' }}>
              {item.min_value !== null ? `${item.min_value.toLocaleString()} SP` : '?'}
              {item.max_value !== null ? ` – ${item.max_value.toLocaleString()} SP` : ''}
            </span>
          </div>
        )}

        {/* Resale value */}
        {item.resale_percent > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold" style={{ color: 'rgba(168,255,246,0.45)' }}>
              Resale:
            </span>
            <span className="text-[10px] font-black" style={{ color: '#f59e0b' }}>
              {Math.floor(item.price * (item.resale_percent / 100)).toLocaleString()} SP ({item.resale_percent}%)
            </span>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Price + Buy button */}
        <div className="mt-2 flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(168,255,246,0.45)' }}>
              Price
            </p>
            <p className="text-base font-black tabular-nums" style={{ color: '#f59e0b' }}>
              ⭐ {item.price.toLocaleString()} SP
            </p>
          </div>

          <button
            onClick={() => !buyDisabled && onBuy(item)}
            disabled={buyDisabled}
            className="rounded-xl px-3 py-2 text-xs font-black transition-all duration-200 active:scale-95"
            style={
              buyDisabled
                ? {
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(168,255,246,0.3)',
                    cursor: isOwned ? 'default' : 'not-allowed',
                  }
                : {
                    background: `linear-gradient(135deg, ${cfg.color}30, ${cfg.color}18)`,
                    border: `1px solid ${cfg.color}60`,
                    color: cfg.color,
                    boxShadow: hovered ? `0 0 12px ${cfg.glow}` : 'none',
                  }
            }
          >
            {buyLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
