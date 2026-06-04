'use client';

import { useState } from 'react';
import type { ShopItem } from '@/components/ShopItemCard';
import { getRarityConfig } from '@/components/ShopItemCard';

// ---------------------------------------------------------------------------
// PurchaseModal
// ---------------------------------------------------------------------------

interface PurchaseModalProps {
  item: ShopItem;
  userBalance: number;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export default function PurchaseModal({
  item,
  userBalance,
  onConfirm,
  onCancel,
}: PurchaseModalProps) {
  const [loading, setLoading] = useState(false);
  const cfg = getRarityConfig(item.rarity);
  const newBalance = userBalance - item.price;
  const canAfford = userBalance >= item.price;

  async function handleConfirm() {
    if (!canAfford || loading) return;
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl shadow-2xl"
        style={{
          background: 'rgba(6,43,69,0.97)',
          border: `2px solid ${cfg.color}40`,
          boxShadow: `0 24px 80px rgba(0,0,0,0.6), 0 0 40px ${cfg.glow}`,
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-5"
          style={{
            background: `linear-gradient(135deg, ${cfg.color}12, transparent)`,
            borderBottom: `1px solid ${cfg.color}20`,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl"
              style={{ background: `${cfg.color}20`, border: `2px solid ${cfg.color}40` }}
            >
              🛍️
            </div>
            <div>
              <h2 className="text-lg font-black" style={{ color: '#e2f4ff' }}>
                Confirm Purchase
              </h2>
              <p className="text-xs" style={{ color: 'rgba(168,255,246,0.55)' }}>
                Review your purchase before confirming
              </p>
            </div>
          </div>
        </div>

        {/* Item details */}
        <div className="px-6 py-5 space-y-4">
          {/* Item card */}
          <div
            className="rounded-2xl p-4"
            style={{ background: `${cfg.color}0a`, border: `1px solid ${cfg.color}30` }}
          >
            <div className="flex items-start gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl"
                style={{ background: `${cfg.color}18`, border: `1px solid ${cfg.color}40` }}
              >
                🛍️
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black truncate" style={{ color: '#e2f4ff' }}>{item.name}</p>
                {item.description && (
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(168,255,246,0.55)' }}>
                    {item.description}
                  </p>
                )}
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest"
                    style={{ background: `${cfg.color}22`, border: `1px solid ${cfg.color}60`, color: cfg.color }}
                  >
                    {item.rarity}
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                    style={{ background: 'rgba(0,207,255,0.1)', border: '1px solid rgba(0,207,255,0.2)', color: 'rgba(0,207,255,0.8)' }}
                  >
                    {item.category}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Price breakdown */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'rgba(168,255,246,0.6)' }}>Item Price</span>
              <span className="text-sm font-black" style={{ color: '#f59e0b' }}>
                ⭐ {item.price.toLocaleString()} SP
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'rgba(168,255,246,0.6)' }}>Your Balance</span>
              <span className="text-sm font-black" style={{ color: '#00CFFF' }}>
                {userBalance.toLocaleString()} SP
              </span>
            </div>
            <div
              className="h-px w-full"
              style={{ background: 'rgba(0,207,255,0.15)' }}
            />
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold" style={{ color: 'rgba(168,255,246,0.8)' }}>
                Balance After Purchase
              </span>
              <span
                className="text-sm font-black"
                style={{ color: canAfford ? '#10b981' : '#ef4444' }}
              >
                {newBalance.toLocaleString()} SP
              </span>
            </div>
          </div>

          {/* Insufficient balance warning */}
          {!canAfford && (
            <div
              className="rounded-xl px-4 py-3 text-sm font-bold"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}
            >
              ❌ Insufficient balance. You need {(item.price - userBalance).toLocaleString()} more SP.
            </div>
          )}

          {/* Badge/Role info */}
          {item.badge_id && (
            <div
              className="rounded-xl px-4 py-3 text-xs"
              style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', color: '#a855f7' }}
            >
              🏅 This purchase will automatically grant you a badge on your profile.
            </div>
          )}
          {item.role_id && (
            <div
              className="rounded-xl px-4 py-3 text-xs"
              style={{ background: 'rgba(0,207,255,0.1)', border: '1px solid rgba(0,207,255,0.3)', color: '#00CFFF' }}
            >
              👑 This purchase will assign a Discord role to your account.
            </div>
          )}
        </div>

        {/* Actions */}
        <div
          className="flex gap-3 px-6 pb-6"
        >
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border py-3 text-sm font-black transition-all duration-200 hover:bg-white/5 disabled:opacity-50"
            style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(168,255,246,0.7)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canAfford || loading}
            className="flex-1 rounded-xl py-3 text-sm font-black transition-all duration-200 hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: canAfford
                ? `linear-gradient(135deg, ${cfg.color}cc, ${cfg.color}88)`
                : 'rgba(255,255,255,0.05)',
              color: canAfford ? '#fff' : 'rgba(168,255,246,0.3)',
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Processing…
              </span>
            ) : (
              `Confirm — ${item.price.toLocaleString()} SP`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
