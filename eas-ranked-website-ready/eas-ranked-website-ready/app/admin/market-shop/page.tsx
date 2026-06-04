"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Shell from "@/components/Shell";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ShopItem {
  id: number;
  item_id: string;
  name: string;
  description: string | null;
  type: string;
  rarity: string | null;
  badge_id: string | null;
  role_id: string | null;
  current_stock: number;
  max_stock: number;
  resale_supply: number;
  is_limited: boolean;
  is_active: boolean;
  is_sold_out: boolean;
  base_value: number;
  current_value: number;
  min_value: number;
  max_value: number;
  resale_percent: number;
  demand_score: number;
  total_bought: number;
  total_resold: number;
  total_traded: number;
  last_value_update: string | null;
  created_at: string;
  updated_at: string;
}

interface ValueHistoryEntry {
  id: number;
  item_id: string;
  old_value: number;
  new_value: number;
  change_amount: number;
  change_percent: number;
  reason: string | null;
  created_at: string;
}

interface ToastMsg {
  type: "success" | "error";
  text: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ITEM_TYPES = ["badge", "title", "cosmetic", "trophy", "role"];
const RARITIES   = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];

const RARITY_COLORS: Record<string, string> = {
  common:    "#9ca3af",
  uncommon:  "#22c55e",
  rare:      "#3b82f6",
  epic:      "#a855f7",
  legendary: "#f59e0b",
  mythic:    "#ef4444",
};

const TYPE_ICONS: Record<string, string> = {
  badge:    "🏅",
  title:    "📛",
  cosmetic: "🎨",
  trophy:   "🏆",
  role:     "👑",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtValue(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

function Toast({ msg, onDismiss }: { msg: ToastMsg; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border-2 px-5 py-4 text-sm font-black shadow-2xl max-w-sm ${
        msg.type === "success"
          ? "border-green-400/60 bg-green-950/90 text-green-300 shadow-green-900/40"
          : "border-red-400/60 bg-red-950/90 text-red-300 shadow-red-900/40"
      }`}
    >
      <span className="flex-1">{msg.text}</span>
      <button onClick={onDismiss} className="opacity-60 hover:opacity-100 transition font-black text-base">✕</button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rarity Badge
// ---------------------------------------------------------------------------

function RarityBadge({ rarity }: { rarity: string | null }) {
  if (!rarity) return <span className="text-zinc-600 text-xs">—</span>;
  const color = RARITY_COLORS[rarity] ?? "#6b7280";
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest"
      style={{ background: `${color}22`, border: `1px solid ${color}60`, color }}
    >
      {rarity}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Status Badge
// ---------------------------------------------------------------------------

function StatusBadge({ item }: { item: ShopItem }) {
  if (!item.is_active) {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest bg-zinc-800 border border-zinc-600 text-zinc-400">
        Disabled
      </span>
    );
  }
  if (item.is_sold_out) {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest bg-red-950/40 border border-red-700/50 text-red-400">
        Sold Out
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest bg-green-950/40 border border-green-700/50 text-green-400">
      Active
    </span>
  );
}

// ---------------------------------------------------------------------------
// Confirm Modal
// ---------------------------------------------------------------------------

function ConfirmModal({
  title,
  message,
  confirmLabel,
  confirmColor,
  onConfirm,
  onCancel,
  loading,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  confirmColor: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-md rounded-3xl p-6 shadow-2xl"
        style={{ background: "#0d0d1a", border: "2px solid rgba(255,255,255,0.12)" }}
      >
        <h3 className="text-lg font-black text-white mb-2">{title}</h3>
        <p className="text-sm text-zinc-400 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border-2 border-white/15 bg-white/5 py-2.5 text-sm font-black text-zinc-300 hover:bg-white/10 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-xl py-2.5 text-sm font-black text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
            style={{ background: confirmColor }}
          >
            {loading ? "⟳ Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create Item Modal
// ---------------------------------------------------------------------------

function CreateModal({
  onCreated,
  onClose,
  setToast,
}: {
  onCreated: (item: ShopItem) => void;
  onClose: () => void;
  setToast: (t: ToastMsg) => void;
}) {
  const [form, setForm] = useState({
    item_id:        "",
    name:           "",
    description:    "",
    type:           "badge",
    rarity:         "common",
    badge_id:       "",
    role_id:        "",
    max_stock:      100,
    base_value:     0,
    min_value:      0,
    max_value:      1000000,
    resale_percent: 80,
    is_limited:     false,
  });
  const [saving, setSaving] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.item_id.trim() || !form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/market-shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          badge_id: form.badge_id.trim() || undefined,
          role_id:  form.role_id.trim()  || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setToast({ type: "success", text: `✅ "${form.name}" created successfully` });
        onCreated(data.item);
      } else {
        setToast({ type: "error", text: data.error ?? "Failed to create item" });
      }
    } catch {
      setToast({ type: "error", text: "An unexpected error occurred" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div
        className="w-full max-w-2xl rounded-3xl shadow-2xl my-4"
        style={{ background: "#0d0d1a", border: "2px solid rgba(0,207,255,0.25)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <h2 className="text-lg font-black text-white">🛍️ Create Shop Item</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition text-xl font-black">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Row 1: item_id + name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-1.5">Item ID *</label>
              <input
                type="text"
                value={form.item_id}
                onChange={(e) => set("item_id", e.target.value)}
                placeholder="e.g. gold_badge_s1"
                required
                className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white placeholder-zinc-600 focus:border-cyan-400/50 focus:outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-1.5">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Gold Season Badge"
                required
                className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white placeholder-zinc-600 focus:border-cyan-400/50 focus:outline-none transition"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Optional description…"
              rows={2}
              className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white placeholder-zinc-600 focus:border-cyan-400/50 focus:outline-none transition resize-none"
            />
          </div>

          {/* Row 2: type + rarity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-1.5">Type *</label>
              <select
                value={form.type}
                onChange={(e) => set("type", e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white focus:border-cyan-400/50 focus:outline-none transition"
              >
                {ITEM_TYPES.map((t) => (
                  <option key={t} value={t}>{TYPE_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-1.5">Rarity</label>
              <select
                value={form.rarity}
                onChange={(e) => set("rarity", e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white focus:border-cyan-400/50 focus:outline-none transition"
              >
                {RARITIES.map((r) => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Conditional: badge_id / role_id */}
          {form.type === "badge" && (
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-1.5">Badge ID</label>
              <input
                type="text"
                value={form.badge_id}
                onChange={(e) => set("badge_id", e.target.value)}
                placeholder="e.g. market_badge_gold"
                className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white placeholder-zinc-600 focus:border-cyan-400/50 focus:outline-none transition"
              />
            </div>
          )}
          {form.type === "role" && (
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-1.5">Role ID</label>
              <input
                type="text"
                value={form.role_id}
                onChange={(e) => set("role_id", e.target.value)}
                placeholder="Discord role snowflake ID"
                className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white placeholder-zinc-600 focus:border-cyan-400/50 focus:outline-none transition"
              />
            </div>
          )}

          {/* Row 3: max_stock + base_value */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-1.5">Max Stock</label>
              <input
                type="number"
                min={1}
                value={form.max_stock}
                onChange={(e) => set("max_stock", parseInt(e.target.value) || 100)}
                className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white focus:border-cyan-400/50 focus:outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-1.5">Base Value</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.base_value}
                onChange={(e) => set("base_value", parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white focus:border-cyan-400/50 focus:outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-1.5">Min Value</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.min_value}
                onChange={(e) => set("min_value", parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white focus:border-cyan-400/50 focus:outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-1.5">Max Value</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.max_value}
                onChange={(e) => set("max_value", parseFloat(e.target.value) || 1000000)}
                className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white focus:border-cyan-400/50 focus:outline-none transition"
              />
            </div>
          </div>

          {/* Row 4: resale_percent + is_limited */}
          <div className="flex items-center gap-6">
            <div className="flex-1">
              <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-1.5">Resale % (0–100)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={form.resale_percent}
                onChange={(e) => set("resale_percent", parseInt(e.target.value) || 80)}
                className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white focus:border-cyan-400/50 focus:outline-none transition"
              />
            </div>
            <div className="flex items-center gap-3 pt-5">
              <button
                type="button"
                onClick={() => set("is_limited", !form.is_limited)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  form.is_limited ? "bg-amber-500" : "bg-zinc-700"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    form.is_limited ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <span className="text-sm font-black text-zinc-300">Limited</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border-2 border-white/15 bg-white/5 py-3 text-sm font-black text-zinc-300 hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !form.item_id.trim() || !form.name.trim()}
              className="flex-1 rounded-xl py-3 text-sm font-black text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #00CFFF, #4DEEEA)" }}
            >
              {saving ? "⟳ Creating…" : "✅ Create Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit Modal
// ---------------------------------------------------------------------------

function EditModal({
  item,
  onSaved,
  onClose,
  setToast,
}: {
  item: ShopItem;
  onSaved: (item: ShopItem) => void;
  onClose: () => void;
  setToast: (t: ToastMsg) => void;
}) {
  const [form, setFormState] = useState({
    name:           item.name,
    description:    item.description ?? "",
    type:           item.type,
    rarity:         item.rarity ?? "common",
    badge_id:       item.badge_id ?? "",
    role_id:        item.role_id ?? "",
    current_stock:  item.current_stock,
    max_stock:      item.max_stock,
    current_value:  item.current_value,
    min_value:      item.min_value,
    max_value:      item.max_value,
    resale_percent: item.resale_percent,
    is_limited:     item.is_limited,
    is_active:      item.is_active,
    is_sold_out:    item.is_sold_out,
  });
  const [saving, setSaving] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setFormState((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/market-shop/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          badge_id: form.badge_id.trim() || null,
          role_id:  form.role_id.trim()  || null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setToast({ type: "success", text: `✅ "${form.name}" updated` });
        onSaved(data.item);
      } else {
        setToast({ type: "error", text: data.error ?? "Failed to update item" });
      }
    } catch {
      setToast({ type: "error", text: "An unexpected error occurred" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div
        className="w-full max-w-2xl rounded-3xl shadow-2xl my-4"
        style={{ background: "#0d0d1a", border: "2px solid rgba(255,127,80,0.3)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <div>
            <h2 className="text-lg font-black text-white">✏️ Edit Item</h2>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">{item.item_id}</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition text-xl font-black">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Name + type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-1.5">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                required
                className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white placeholder-zinc-600 focus:border-orange-400/50 focus:outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-1.5">Type</label>
              <select
                value={form.type}
                onChange={(e) => set("type", e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white focus:border-orange-400/50 focus:outline-none transition"
              >
                {ITEM_TYPES.map((t) => (
                  <option key={t} value={t}>{TYPE_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white placeholder-zinc-600 focus:border-orange-400/50 focus:outline-none transition resize-none"
            />
          </div>

          {/* Rarity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-1.5">Rarity</label>
              <select
                value={form.rarity}
                onChange={(e) => set("rarity", e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white focus:border-orange-400/50 focus:outline-none transition"
              >
                {RARITIES.map((r) => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
            </div>
            {form.type === "badge" && (
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-1.5">Badge ID</label>
                <input
                  type="text"
                  value={form.badge_id}
                  onChange={(e) => set("badge_id", e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white placeholder-zinc-600 focus:border-orange-400/50 focus:outline-none transition"
                />
              </div>
            )}
            {form.type === "role" && (
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-1.5">Role ID</label>
                <input
                  type="text"
                  value={form.role_id}
                  onChange={(e) => set("role_id", e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white placeholder-zinc-600 focus:border-orange-400/50 focus:outline-none transition"
                />
              </div>
            )}
          </div>

          {/* Stock */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-1.5">Current Stock</label>
              <input
                type="number"
                min={0}
                value={form.current_stock}
                onChange={(e) => set("current_stock", parseInt(e.target.value) || 0)}
                className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white focus:border-orange-400/50 focus:outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-1.5">Max Stock</label>
              <input
                type="number"
                min={1}
                value={form.max_stock}
                onChange={(e) => set("max_stock", parseInt(e.target.value) || 100)}
                className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white focus:border-orange-400/50 focus:outline-none transition"
              />
            </div>
          </div>

          {/* Values */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-1.5">Current Value</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.current_value}
                onChange={(e) => set("current_value", parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white focus:border-orange-400/50 focus:outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-1.5">Min Value</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.min_value}
                onChange={(e) => set("min_value", parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white focus:border-orange-400/50 focus:outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-1.5">Max Value</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.max_value}
                onChange={(e) => set("max_value", parseFloat(e.target.value) || 1000000)}
                className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white focus:border-orange-400/50 focus:outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-1.5">Resale %</label>
              <input
                type="number"
                min={0}
                max={100}
                value={form.resale_percent}
                onChange={(e) => set("resale_percent", parseInt(e.target.value) || 80)}
                className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white focus:border-orange-400/50 focus:outline-none transition"
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-6">
            {(["is_limited", "is_active", "is_sold_out"] as const).map((key) => {
              const labels: Record<string, string> = {
                is_limited:  "Limited",
                is_active:   "Active",
                is_sold_out: "Sold Out",
              };
              const colors: Record<string, string> = {
                is_limited:  "bg-amber-500",
                is_active:   "bg-green-500",
                is_sold_out: "bg-red-500",
              };
              return (
                <div key={key} className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => set(key, !form[key])}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      form[key] ? colors[key] : "bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        form[key] ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <span className="text-sm font-black text-zinc-300">{labels[key]}</span>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border-2 border-white/15 bg-white/5 py-3 text-sm font-black text-zinc-300 hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl py-3 text-sm font-black text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #FF7F50, #FF8C42)" }}
            >
              {saving ? "⟳ Saving…" : "💾 Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Restock Modal
// ---------------------------------------------------------------------------

function RestockModal({
  item,
  onRestocked,
  onClose,
  setToast,
}: {
  item: ShopItem;
  onRestocked: (item: ShopItem) => void;
  onClose: () => void;
  setToast: (t: ToastMsg) => void;
}) {
  const [amount, setAmount] = useState(10);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (amount <= 0) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/market-shop/${item.id}/restock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setToast({ type: "success", text: `✅ Restocked "${item.name}" by ${amount}` });
        onRestocked(data.item);
      } else {
        setToast({ type: "error", text: data.error ?? "Failed to restock" });
      }
    } catch {
      setToast({ type: "error", text: "An unexpected error occurred" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-sm rounded-3xl p-6 shadow-2xl"
        style={{ background: "#0d0d1a", border: "2px solid rgba(16,185,129,0.3)" }}
      >
        <h3 className="text-lg font-black text-white mb-1">📦 Restock Item</h3>
        <p className="text-sm text-zinc-400 mb-4">
          <span className="text-white font-bold">{item.name}</span>
          <span className="text-zinc-500"> — current stock: </span>
          <span className="text-cyan-400 font-bold">{item.current_stock}</span>
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-1.5">Amount to Add</label>
            <input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value) || 1)}
              className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white focus:border-green-400/50 focus:outline-none transition"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border-2 border-white/15 bg-white/5 py-2.5 text-sm font-black text-zinc-300 hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || amount <= 0}
              className="flex-1 rounded-xl py-2.5 text-sm font-black text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
            >
              {saving ? "⟳ Restocking…" : "📦 Restock"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// History Modal
// ---------------------------------------------------------------------------

function HistoryModal({
  item,
  onClose,
}: {
  item: ShopItem;
  onClose: () => void;
}) {
  const [history, setHistory] = useState<ValueHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/market-shop/${item.id}/history?limit=50`)
      .then((r) => r.json())
      .then((d) => setHistory(d.history ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [item.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div
        className="w-full max-w-2xl rounded-3xl shadow-2xl my-4"
        style={{ background: "#0d0d1a", border: "2px solid rgba(0,207,255,0.25)" }}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <div>
            <h2 className="text-lg font-black text-white">📊 Value History</h2>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">{item.item_id} — last 50 changes</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition text-xl font-black">✕</button>
        </div>

        <div className="px-6 py-5">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 rounded-xl animate-pulse" style={{ background: "rgba(0,207,255,0.06)" }} />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-4xl mb-3">📉</p>
              <p className="text-zinc-500 font-bold">No value history yet</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
              {history.map((entry) => {
                const isUp = entry.change_amount >= 0;
                const color = isUp ? "#10b981" : "#ef4444";
                const arrow = isUp ? "▲" : "▼";
                return (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 rounded-xl px-4 py-2.5"
                    style={{ background: "rgba(0,207,255,0.04)", border: "1px solid rgba(0,207,255,0.08)" }}
                  >
                    <span className="text-sm font-black tabular-nums" style={{ color }}>
                      {arrow} {fmtValue(Math.abs(entry.change_amount))}
                    </span>
                    <span className="text-xs font-bold tabular-nums" style={{ color }}>
                      ({entry.change_percent >= 0 ? "+" : ""}{entry.change_percent.toFixed(2)}%)
                    </span>
                    <span className="text-xs text-zinc-500 flex-1 text-right">
                      {fmtValue(entry.old_value)} → {fmtValue(entry.new_value)}
                    </span>
                    <span
                      className="text-[10px] font-black uppercase tracking-widest rounded-full px-2 py-0.5"
                      style={{ background: "rgba(0,207,255,0.08)", color: "#4DEEEA" }}
                    >
                      {entry.reason ?? "manual"}
                    </span>
                    <span className="text-[10px] text-zinc-600 whitespace-nowrap">
                      {fmtDate(entry.created_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function AdminMarketShopPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isOwner, setIsOwner]         = useState(false);

  const [items, setItems]             = useState<ShopItem[]>([]);
  const [loading, setLoading]         = useState(false);
  const [toast, setToastState]        = useState<ToastMsg | null>(null);

  // Filters
  const [search, setSearch]           = useState("");
  const [filterType, setFilterType]   = useState("");
  const [filterRarity, setFilterRarity] = useState("");
  const [filterStatus, setFilterStatus] = useState(""); // "active" | "disabled" | "sold_out" | "limited" | ""

  // Modals
  const [createOpen, setCreateOpen]   = useState(false);
  const [editItem, setEditItem]       = useState<ShopItem | null>(null);
  const [restockItem, setRestockItem] = useState<ShopItem | null>(null);
  const [historyItem, setHistoryItem] = useState<ShopItem | null>(null);
  const [disableTarget, setDisableTarget] = useState<ShopItem | null>(null);
  const [enableTarget, setEnableTarget]   = useState<ShopItem | null>(null);
  const [acting, setActing]           = useState(false);

  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  function setToast(t: ToastMsg | null) { setToastState(t); }

  // Auth check
  useEffect(() => {
    fetch("/api/admin/check")
      .then((r) => r.json())
      .then((d) => { setIsOwner(d.isDeveloper === true); setAuthChecked(true); })
      .catch(() => setAuthChecked(true));
  }, []);

  // Load items
  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim())       params.set("search", search.trim());
      if (filterType)          params.set("type", filterType);
      if (filterRarity)        params.set("rarity", filterRarity);
      if (filterStatus === "active")   params.set("active", "true");
      if (filterStatus === "disabled") params.set("disabled", "true");
      if (filterStatus === "sold_out") params.set("sold_out", "true");
      if (filterStatus === "limited")  params.set("limited", "true");

      const res = await fetch(`/api/admin/market-shop?${params}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [search, filterType, filterRarity, filterStatus]);

  useEffect(() => {
    if (!isOwner) return;
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(loadItems, 300);
    return () => { if (searchDebounce.current) clearTimeout(searchDebounce.current); };
  }, [isOwner, loadItems]);

  // Disable item
  async function confirmDisable() {
    if (!disableTarget || acting) return;
    setActing(true);
    try {
      const res = await fetch(`/api/admin/market-shop/${disableTarget.id}/disable`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        setItems((prev) => prev.map((i) => i.id === data.item.id ? data.item : i));
        setToast({ type: "success", text: `🚫 "${disableTarget.name}" disabled` });
      } else {
        setToast({ type: "error", text: data.error ?? "Failed to disable" });
      }
    } catch {
      setToast({ type: "error", text: "An unexpected error occurred" });
    } finally {
      setActing(false);
      setDisableTarget(null);
    }
  }

  // Enable item
  async function confirmEnable() {
    if (!enableTarget || acting) return;
    setActing(true);
    try {
      const res = await fetch(`/api/admin/market-shop/${enableTarget.id}/enable`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        setItems((prev) => prev.map((i) => i.id === data.item.id ? data.item : i));
        setToast({ type: "success", text: `✅ "${enableTarget.name}" enabled` });
      } else {
        setToast({ type: "error", text: data.error ?? "Failed to enable" });
      }
    } catch {
      setToast({ type: "error", text: "An unexpected error occurred" });
    } finally {
      setActing(false);
      setEnableTarget(null);
    }
  }

  // ── Auth gate ──
  if (!authChecked) {
    return (
      <Shell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="text-4xl mb-4 animate-pulse">🛍️</div>
            <p className="text-zinc-400 font-bold">Checking access…</p>
          </div>
        </div>
      </Shell>
    );
  }

  if (!isOwner) {
    return (
      <Shell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div
            className="rounded-3xl p-10 text-center max-w-md"
            style={{ background: "rgba(239,68,68,0.08)", border: "2px solid rgba(239,68,68,0.3)" }}
          >
            <p className="text-5xl mb-4">🔒</p>
            <h2 className="text-xl font-black text-red-400 mb-2">Access Denied</h2>
            <p className="text-sm text-zinc-400">Developer access required to manage the Market Shop.</p>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="px-4 md:px-8 py-6 max-w-screen-2xl mx-auto space-y-6">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white">🛍️ Market Shop Manager</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              Main server only · {items.length} item{items.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-black text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: "linear-gradient(135deg, #00CFFF, #4DEEEA)", color: "#062B45" }}
          >
            ＋ Create Item
          </button>
        </div>

        {/* Filters */}
        <div
          className="rounded-2xl p-4 flex flex-col sm:flex-row gap-3 flex-wrap"
          style={{ background: "rgba(0,207,255,0.04)", border: "1px solid rgba(0,207,255,0.12)" }}
        >
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name…"
              className="w-full rounded-xl border border-white/10 bg-zinc-900/60 pl-9 pr-3 py-2 text-sm font-bold text-white placeholder-zinc-600 focus:border-cyan-400/50 focus:outline-none transition"
            />
          </div>

          {/* Type filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2 text-sm font-bold text-white focus:border-cyan-400/50 focus:outline-none transition"
          >
            <option value="">All Types</option>
            {ITEM_TYPES.map((t) => (
              <option key={t} value={t}>{TYPE_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>

          {/* Rarity filter */}
          <select
            value={filterRarity}
            onChange={(e) => setFilterRarity(e.target.value)}
            className="rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2 text-sm font-bold text-white focus:border-cyan-400/50 focus:outline-none transition"
          >
            <option value="">All Rarities</option>
            {RARITIES.map((r) => (
              <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2 text-sm font-bold text-white focus:border-cyan-400/50 focus:outline-none transition"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
            <option value="sold_out">Sold Out</option>
            <option value="limited">Limited</option>
          </select>

          {/* Clear filters */}
          {(search || filterType || filterRarity || filterStatus) && (
            <button
              onClick={() => { setSearch(""); setFilterType(""); setFilterRarity(""); setFilterStatus(""); }}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-black text-zinc-400 hover:bg-white/10 transition"
            >
              ✕ Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(0,207,255,0.15)", background: "rgba(6,43,69,0.75)" }}
        >
          {/* Desktop header */}
          <div
            className="hidden lg:grid items-center px-5 py-3 text-[10px] font-bold uppercase tracking-widest"
            style={{
              gridTemplateColumns: "180px 1fr 90px 100px 120px 110px 90px 80px 80px 80px 180px",
              borderBottom: "1px solid rgba(0,207,255,0.10)",
              color: "rgba(168,255,246,0.45)",
            }}
          >
            <span>Item ID</span>
            <span>Name</span>
            <span>Type</span>
            <span>Rarity</span>
            <span>Stock</span>
            <span>Value</span>
            <span>Status</span>
            <span>Limited</span>
            <span>Bought</span>
            <span>Resold</span>
            <span>Actions</span>
          </div>

          {loading ? (
            <div className="space-y-0">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-5 py-4"
                  style={{ borderBottom: "1px solid rgba(0,207,255,0.07)" }}
                >
                  {Array.from({ length: 6 }).map((__, j) => (
                    <div
                      key={j}
                      className="h-4 rounded-lg animate-pulse"
                      style={{ width: `${60 + (j % 3) * 40}px`, background: "rgba(0,207,255,0.08)" }}
                    />
                  ))}
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-4xl mb-3">🛍️</p>
              <p className="text-lg font-black text-zinc-400">No shop items found</p>
              <p className="text-sm text-zinc-600 mt-1">
                {search || filterType || filterRarity || filterStatus
                  ? "Try adjusting your filters"
                  : "Click \"Create Item\" to add the first item"}
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="group"
                style={{ borderBottom: "1px solid rgba(0,207,255,0.07)" }}
              >
                {/* Desktop row */}
                <div
                  className="hidden lg:grid items-center px-5 py-3.5 hover:bg-[rgba(0,207,255,0.04)] transition-colors"
                  style={{ gridTemplateColumns: "180px 1fr 90px 100px 120px 110px 90px 80px 80px 80px 180px" }}
                >
                  <span className="text-xs font-mono text-zinc-500 truncate pr-2">{item.item_id}</span>
                  <div className="min-w-0 pr-2">
                    <p className="text-sm font-bold text-white truncate">{item.name}</p>
                    {item.description && (
                      <p className="text-[10px] text-zinc-600 truncate">{item.description}</p>
                    )}
                  </div>
                  <span className="text-sm">
                    {TYPE_ICONS[item.type] ?? "🛍️"}{" "}
                    <span className="text-xs text-zinc-400 capitalize">{item.type}</span>
                  </span>
                  <RarityBadge rarity={item.rarity} />
                  <span className="text-sm font-bold tabular-nums" style={{ color: "#00CFFF" }}>
                    {item.current_stock}
                    <span className="text-zinc-600"> / {item.max_stock}</span>
                  </span>
                  <span className="text-sm font-black tabular-nums" style={{ color: "#f59e0b" }}>
                    {fmtValue(item.current_value)} SP
                  </span>
                  <StatusBadge item={item} />
                  <span className={`text-xs font-black ${item.is_limited ? "text-amber-400" : "text-zinc-600"}`}>
                    {item.is_limited ? "✦ Yes" : "No"}
                  </span>
                  <span className="text-sm tabular-nums text-zinc-400">{item.total_bought}</span>
                  <span className="text-sm tabular-nums text-zinc-400">{item.total_resold}</span>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setHistoryItem(item)}
                      title="Value History"
                      className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-black text-zinc-400 hover:bg-white/10 hover:text-white transition"
                    >
                      📊
                    </button>
                    <button
                      onClick={() => setEditItem(item)}
                      title="Edit"
                      className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-black text-zinc-400 hover:bg-white/10 hover:text-orange-400 transition"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => setRestockItem(item)}
                      title="Restock"
                      className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-black text-zinc-400 hover:bg-white/10 hover:text-green-400 transition"
                    >
                      📦
                    </button>
                    {item.is_active ? (
                      <button
                        onClick={() => setDisableTarget(item)}
                        title="Disable"
                        className="rounded-lg border border-red-700/30 bg-red-950/20 px-2 py-1 text-[10px] font-black text-red-500 hover:bg-red-500/20 hover:border-red-400 transition"
                      >
                        🚫
                      </button>
                    ) : (
                      <button
                        onClick={() => setEnableTarget(item)}
                        title="Enable"
                        className="rounded-lg border border-green-700/30 bg-green-950/20 px-2 py-1 text-[10px] font-black text-green-500 hover:bg-green-500/20 hover:border-green-400 transition"
                      >
                        ✅
                      </button>
                    )}
                  </div>
                </div>

                {/* Mobile card */}
                <div className="lg:hidden px-4 py-4 hover:bg-[rgba(0,207,255,0.04)] transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">{TYPE_ICONS[item.type] ?? "🛍️"}</span>
                        <p className="text-sm font-bold text-white truncate">{item.name}</p>
                        {item.is_limited && <span className="text-amber-400 text-xs font-black">✦</span>}
                      </div>
                      <p className="text-[10px] font-mono text-zinc-600">{item.item_id}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black tabular-nums" style={{ color: "#f59e0b" }}>
                        {fmtValue(item.current_value)} SP
                      </p>
                      <StatusBadge item={item} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <RarityBadge rarity={item.rarity} />
                    <span className="text-xs text-zinc-500">
                      Stock: <span className="text-cyan-400 font-bold">{item.current_stock}/{item.max_stock}</span>
                    </span>
                    <span className="text-xs text-zinc-500">
                      Bought: <span className="text-white font-bold">{item.total_bought}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setHistoryItem(item)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-black text-zinc-400 hover:bg-white/10 transition">📊 History</button>
                    <button onClick={() => setEditItem(item)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-black text-zinc-400 hover:bg-white/10 transition">✏️ Edit</button>
                    <button onClick={() => setRestockItem(item)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-black text-zinc-400 hover:bg-white/10 transition">📦 Restock</button>
                    {item.is_active ? (
                      <button onClick={() => setDisableTarget(item)} className="rounded-lg border border-red-700/30 bg-red-950/20 px-3 py-1.5 text-xs font-black text-red-500 hover:bg-red-500/20 transition">🚫 Disable</button>
                    ) : (
                      <button onClick={() => setEnableTarget(item)} className="rounded-lg border border-green-700/30 bg-green-950/20 px-3 py-1.5 text-xs font-black text-green-500 hover:bg-green-500/20 transition">✅ Enable</button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Modals ── */}

      {createOpen && (
        <CreateModal
          onCreated={(item) => { setItems((prev) => [item, ...prev]); setCreateOpen(false); }}
          onClose={() => setCreateOpen(false)}
          setToast={setToast}
        />
      )}

      {editItem && (
        <EditModal
          item={editItem}
          onSaved={(updated) => { setItems((prev) => prev.map((i) => i.id === updated.id ? updated : i)); setEditItem(null); }}
          onClose={() => setEditItem(null)}
          setToast={setToast}
        />
      )}

      {restockItem && (
        <RestockModal
          item={restockItem}
          onRestocked={(updated) => { setItems((prev) => prev.map((i) => i.id === updated.id ? updated : i)); setRestockItem(null); }}
          onClose={() => setRestockItem(null)}
          setToast={setToast}
        />
      )}

      {historyItem && (
        <HistoryModal
          item={historyItem}
          onClose={() => setHistoryItem(null)}
        />
      )}

      {disableTarget && (
        <ConfirmModal
          title={`Disable "${disableTarget.name}"`}
          message="This item will no longer be visible or purchasable in the shop. You can re-enable it at any time."
          confirmLabel="🚫 Disable Item"
          confirmColor="linear-gradient(135deg, #ef4444, #dc2626)"
          onConfirm={confirmDisable}
          onCancel={() => setDisableTarget(null)}
          loading={acting}
        />
      )}

      {enableTarget && (
        <ConfirmModal
          title={`Enable "${enableTarget.name}"`}
          message="This item will become visible and purchasable in the shop again."
          confirmLabel="✅ Enable Item"
          confirmColor="linear-gradient(135deg, #10b981, #059669)"
          onConfirm={confirmEnable}
          onCancel={() => setEnableTarget(null)}
          loading={acting}
        />
      )}

      {/* Toast */}
      {toast && <Toast msg={toast} onDismiss={() => setToastState(null)} />}
    </Shell>
  );
}
