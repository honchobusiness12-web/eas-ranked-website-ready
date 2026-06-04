'use client';

import { useState } from 'react';
import { getRarityConfig } from '@/components/ShopItemCard';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InventoryBadge {
  id: number;
  badge_id: string;
  name: string;
  icon: string;
  rarity: string;
  category: string;
  description: string | null;
  color: string | null;
  source: string;
  added_at: string;
  purchased_at: string | null;
}

export interface InventoryRole {
  id: string;
  name: string;
  color: string;
}

export interface InventoryShopItem {
  id: number;
  item_id: number;
  name: string;
  description: string | null;
  price: number;
  category: string;
  rarity: string;
  resale_percent: number;
  badge_id: string | null;
  role_id: string | null;
  purchased_at: string;
}

type InventoryItemType = 'badge' | 'role' | 'item';

interface InventoryItemProps {
  type: InventoryItemType;
  badge?: InventoryBadge;
  role?: InventoryRole;
  item?: InventoryShopItem;
  onSell?: (itemId: number) => void;
}

// ---------------------------------------------------------------------------
// Date formatter
// ---------------------------------------------------------------------------

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// InventoryItem
// ---------------------------------------------------------------------------

export default function InventoryItem({
  type,
  badge,
  role,
  item,
  onSell,
}: InventoryItemProps) {
  const [hovered, setHovered] = useState(false);

  // --- Badge ---
  if (type === 'badge' && badge) {
    const cfg = getRarityConfig(badge.rarity);
    const sourceLabel =
      badge.source === 'market' ? 'Shop Purchase'
      : badge.source === 'admin' ? 'Admin Award'
      : badge.source === 'system' ? 'System'
      : badge.source;

    return (
      <div
        className="flex items-center gap-3 rounded-2xl p-3 transition-all duration-200"
        style={{
          background: hovered ? `${cfg.color}0f` : 'rgba(6,43,69,0.6)',
          border: `1px solid ${hovered ? cfg.color + '40' : cfg.color + '20'}`,
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Icon */}
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
          style={{ background: `${cfg.color}18`, border: `1px solid ${cfg.color}40` }}
        >
          {badge.icon || '🏅'}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black truncate" style={{ color: '#e2f4ff' }}>
            {badge.name}
          </p>
          {badge.description && (
            <p className="text-xs truncate" style={{ color: 'rgba(168,255,246,0.5)' }}>
              {badge.description}
            </p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span
              className="rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest"
              style={{ background: `${cfg.color}22`, border: `1px solid ${cfg.color}50`, color: cfg.color }}
            >
              {badge.rarity}
            </span>
            <span className="text-[10px]" style={{ color: 'rgba(168,255,246,0.4)' }}>
              {sourceLabel} · {fmtDate(badge.purchased_at ?? badge.added_at)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // --- Discord Role ---
  if (type === 'role' && role) {
    return (
      <div
        className="flex items-center gap-3 rounded-2xl p-3 transition-all duration-200"
        style={{
          background: hovered ? 'rgba(0,207,255,0.06)' : 'rgba(6,43,69,0.6)',
          border: `1px solid ${hovered ? 'rgba(0,207,255,0.3)' : 'rgba(0,207,255,0.12)'}`,
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Color dot */}
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl"
          style={{ background: `${role.color}20`, border: `2px solid ${role.color}60` }}
        >
          👑
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black truncate" style={{ color: '#e2f4ff' }}>
            {role.name}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: role.color }}
            />
            <span className="text-[10px] font-bold" style={{ color: 'rgba(168,255,246,0.5)' }}>
              Discord Role
            </span>
          </div>
        </div>
      </div>
    );
  }

  // --- Shop Item ---
  if (type === 'item' && item) {
    const cfg = getRarityConfig(item.rarity);
    const resaleValue = Math.floor(item.price * (item.resale_percent / 100));
    const canSell = item.resale_percent > 0 && onSell;

    return (
      <div
        className="flex items-center gap-3 rounded-2xl p-3 transition-all duration-200"
        style={{
          background: hovered ? `${cfg.color}0f` : 'rgba(6,43,69,0.6)',
          border: `1px solid ${hovered ? cfg.color + '40' : cfg.color + '20'}`,
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Icon */}
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
          style={{ background: `${cfg.color}18`, border: `1px solid ${cfg.color}40` }}
        >
          🛍️
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black truncate" style={{ color: '#e2f4ff' }}>
            {item.name}
          </p>
          {item.description && (
            <p className="text-xs truncate" style={{ color: 'rgba(168,255,246,0.5)' }}>
              {item.description}
            </p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span
              className="rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest"
              style={{ background: `${cfg.color}22`, border: `1px solid ${cfg.color}50`, color: cfg.color }}
            >
              {item.rarity}
            </span>
            <span className="text-[10px]" style={{ color: 'rgba(168,255,246,0.4)' }}>
              {item.category} · Purchased {fmtDate(item.purchased_at)}
            </span>
          </div>
        </div>

        {/* Sell button */}
        {canSell && (
          <div className="shrink-0 text-right">
            <p className="text-[10px] font-bold mb-1" style={{ color: 'rgba(168,255,246,0.45)' }}>
              Resale
            </p>
            <p className="text-xs font-black mb-1.5" style={{ color: '#f59e0b' }}>
              +{resaleValue.toLocaleString()} SP
            </p>
            <button
              onClick={() => onSell(item.item_id)}
              className="rounded-lg px-3 py-1.5 text-xs font-black transition-all duration-200 hover:opacity-90 active:scale-95"
              style={{
                background: 'rgba(245,158,11,0.15)',
                border: '1px solid rgba(245,158,11,0.4)',
                color: '#f59e0b',
              }}
            >
              Sell
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
}
