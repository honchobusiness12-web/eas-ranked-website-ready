'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Shell from '@/components/Shell';
import type { ShopItem, ValueHistoryEntry } from '@/lib/market-shop';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ITEM_TYPES = ['badge', 'role', 'cosmetic', 'title', 'trophy'] as const;
const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'] as const;

const RARITY_COLORS: Record<string, string> = {
  common: '#9ca3af',
  uncommon: '#22c55e',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
  mythic: '#ef4444',
};

const TYPE_ICONS: Record<string, string> = {
  badge: '🏅',
  role: '👑',
  cosmetic: '🎨',
  title: '📛',
  trophy: '🏆',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ToastMsg {
  type: 'success' | 'error';
  text: string;
}

type FilterStatus = 'all' | 'active' | 'disabled' | 'limited' | 'sold_out';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n: number): string {
  return n.toLocaleString();
}

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function generateItemId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40);
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
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border-2 px-5 py-4 text-sm font-black shadow-2xl max-w-sm animate-fade-in ${
        msg.type === 'success'
          ? 'border-green-400/60 bg-green-950/90 text-green-300 shadow-green-900/40'
          : 'border-red-400/60 bg-red-950/90 text-red-300 shadow-red-900/40'
      }`}
    >
      <span className="flex-1">{msg.text}</span>
      <button onClick={onDismiss} className="opacity-60 hover:opacity-100 transition font-black text-base">
        ✕
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rarity badge
// ---------------------------------------------------------------------------

function RarityBadge({ rarity }: { rarity: string | null }) {
  if (!rarity) return null;
  const color = RARITY_COLORS[rarity] ?? '#6b7280';
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
// Confirm modal
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
        style={{ background: '#0d0d1a', border: '2px solid rgba(255,255,255,0.12)' }}
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
            {loading ? '⟳ Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Restock modal
// ---------------------------------------------------------------------------

function RestockModal({
  item,
  onConfirm,
  onCancel,
  loading,
}: {
  item: ShopItem;
  onConfirm: (amount: number) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [amount, setAmount] = useState(10);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-md rounded-3xl p-6 shadow-2xl"
        style={{ background: '#0d0d1a', border: '2px solid rgba(255,255,255,0.12)' }}
      >
        <h3 className="text-lg font-black text-white mb-1">Restock — {item.name}</h3>
        <p className="text-sm text-zinc-400 mb-5">
          Current stock: <span className="font-black text-white">{item.current_stock}</span> / {item.max_stock}
        </p>
        <div className="mb-5">
          <label className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">
            Amount to add
          </label>
          <input
            type="number"
            min={1}
            max={item.max_stock}
            value={amount}
            onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white placeholder-zinc-600 focus:border-white/25 focus:outline-none transition"
          />
          <p className="text-xs text-zinc-600 mt-1">
            New stock will be: {Math.min(item.max_stock, item.current_stock + amount)} / {item.max_stock}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border-2 border-white/15 bg-white/5 py-2.5 text-sm font-black text-zinc-300 hover:bg-white/10 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(amount)}
            disabled={loading}
            className="flex-1 rounded-xl py-2.5 text-sm font-black text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
          >
            {loading ? '⟳ Restocking…' : '📦 Restock'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Value history panel
// ---------------------------------------------------------------------------

function ValueHistoryPanel({
  item,
  history,
  onClose,
}: {
  item: ShopItem;
  history: ValueHistoryEntry[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[80vh]"
        style={{ background: '#0d0d1a', border: '2px solid rgba(255,255,255,0.12)' }}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <div>
            <h3 className="text-lg font-black text-white">{item.name} — Value History</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Current: <span className="text-cyan-400 font-black">{fmt(item.current_value)} SP</span>
              {' · '}Base: <span className="text-zinc-400 font-bold">{fmt(item.base_value)} SP</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-black text-zinc-400 hover:bg-white/10 transition"
          >
            ✕ Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-3xl mb-3">📊</p>
              <p className="text-sm font-bold text-zinc-500">No value history yet</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8">
                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-zinc-500">Time</th>
                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-zinc-500">Old Value</th>
                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-zinc-500">New Value</th>
                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-zinc-500">Change</th>
                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-zinc-500">Reason</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => {
                  const isPositive = h.change_amount >= 0;
                  const changeColor = isPositive ? '#10b981' : '#ef4444';
                  return (
                    <tr key={h.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3 text-zinc-500 text-xs">{timeAgo(h.created_at)}</td>
                      <td className="px-5 py-3 font-bold text-zinc-400">{fmtCurrency(h.old_value)}</td>
                      <td className="px-5 py-3 font-black text-white">{fmtCurrency(h.new_value)}</td>
                      <td className="px-5 py-3 font-bold tabular-nums" style={{ color: changeColor }}>
                        {isPositive ? '+' : ''}{fmtCurrency(h.change_amount)} ({isPositive ? '+' : ''}{Number(h.change_percent).toFixed(1)}%)
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold capitalize"
                          style={{ background: 'rgba(0,207,255,0.08)', border: '1px solid rgba(0,207,255,0.18)', color: '#4DEEEA' }}
                        >
                          {h.reason}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Item form (create / edit)
// ---------------------------------------------------------------------------

const DEFAULT_FORM = {
  item_id: '',
  name: '',
  description: '',
  type: 'badge' as string,
  rarity: 'common' as string,
  badge_id: '',
  role_id: '',
  current_stock: 10,
  max_stock: 100,
  resale_supply: 0,
  is_limited: false,
  is_active: true,
  is_sold_out: false,
  base_value: 100000,
  current_value: 100000,
  min_value: 50000,
  max_value: 500000,
  resale_percent: 80,
  demand_score: 1.0,
};

type FormState = typeof DEFAULT_FORM;

function ItemFormModal({
  mode,
  initial,
  onSave,
  onCancel,
  loading,
}: {
  mode: 'create' | 'edit';
  initial?: Partial<FormState>;
  onSave: (data: FormState) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<FormState>({ ...DEFAULT_FORM, ...initial });
  const [autoId, setAutoId] = useState(mode === 'create');

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      // Auto-sync current_value with base_value on create
      if (key === 'base_value' && mode === 'create') {
        next.current_value = value as number;
      }
      return next;
    });
  }

  function handleNameChange(name: string) {
    set('name', name);
    if (autoId && mode === 'create') {
      set('item_id', generateItemId(name));
    }
  }

  const inputCls =
    'w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white placeholder-zinc-600 focus:border-cyan-400/50 focus:outline-none transition';
  const labelCls = 'block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh]"
        style={{ background: '#0d0d1a', border: '2px solid rgba(255,255,255,0.12)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 shrink-0">
          <h3 className="text-lg font-black text-white">
            {mode === 'create' ? '➕ Create Shop Item' : `✏️ Edit — ${initial?.name ?? 'Item'}`}
          </h3>
          <button
            onClick={onCancel}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-black text-zinc-400 hover:bg-white/10 transition"
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Row 1: Name + Item ID */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Gold Investor Badge"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Item ID *</label>
              <input
                type="text"
                value={form.item_id}
                onChange={(e) => { setAutoId(false); set('item_id', e.target.value); }}
                placeholder="e.g. gold_investor_badge"
                className={inputCls}
                disabled={mode === 'edit'}
              />
              {mode === 'create' && (
                <p className="text-[10px] text-zinc-600 mt-1">Auto-generated from name. Must be unique.</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Optional description…"
              rows={2}
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Row 2: Type + Rarity */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Type *</label>
              <select
                value={form.type}
                onChange={(e) => set('type', e.target.value)}
                className={inputCls}
                style={{ appearance: 'none' }}
              >
                {ITEM_TYPES.map((t) => (
                  <option key={t} value={t} style={{ background: '#0d0d1a' }}>
                    {TYPE_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Rarity</label>
              <select
                value={form.rarity}
                onChange={(e) => set('rarity', e.target.value)}
                className={inputCls}
                style={{ appearance: 'none' }}
              >
                <option value="" style={{ background: '#0d0d1a' }}>— None —</option>
                {RARITIES.map((r) => (
                  <option key={r} value={r} style={{ background: '#0d0d1a' }}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Badge ID + Role ID */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Badge ID</label>
              <input
                type="text"
                value={form.badge_id}
                onChange={(e) => set('badge_id', e.target.value)}
                placeholder="e.g. market_badge_gold"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Role ID</label>
              <input
                type="text"
                value={form.role_id}
                onChange={(e) => set('role_id', e.target.value)}
                placeholder="Discord role snowflake"
                className={inputCls}
              />
            </div>
          </div>

          {/* Row 4: Stock */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className={labelCls}>Current Stock</label>
              <input
                type="number"
                min={0}
                value={form.current_stock}
                onChange={(e) => set('current_stock', parseInt(e.target.value) || 0)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Max Stock</label>
              <input
                type="number"
                min={1}
                value={form.max_stock}
                onChange={(e) => set('max_stock', parseInt(e.target.value) || 1)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Resale Supply</label>
              <input
                type="number"
                min={0}
                value={form.resale_supply}
                onChange={(e) => set('resale_supply', parseInt(e.target.value) || 0)}
                className={inputCls}
              />
            </div>
          </div>

          {/* Row 5: Values */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Base Value (SP)</label>
              <input
                type="number"
                min={0}
                value={form.base_value}
                onChange={(e) => set('base_value', parseInt(e.target.value) || 0)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Current Value (SP)</label>
              <input
                type="number"
                min={0}
                value={form.current_value}
                onChange={(e) => set('current_value', parseInt(e.target.value) || 0)}
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className={labelCls}>Min Value (SP)</label>
              <input
                type="number"
                min={0}
                value={form.min_value}
                onChange={(e) => set('min_value', parseInt(e.target.value) || 0)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Max Value (SP)</label>
              <input
                type="number"
                min={0}
                value={form.max_value}
                onChange={(e) => set('max_value', parseInt(e.target.value) || 0)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Resale % (0–100)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={form.resale_percent}
                onChange={(e) => set('resale_percent', Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                className={inputCls}
              />
            </div>
          </div>

          {/* Row 6: Demand score */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Demand Score (multiplier)</label>
              <input
                type="number"
                min={0}
                step={0.1}
                value={form.demand_score}
                onChange={(e) => set('demand_score', parseFloat(e.target.value) || 1.0)}
                className={inputCls}
              />
              <p className="text-[10px] text-zinc-600 mt-1">1.0 = neutral, &gt;1 = high demand, &lt;1 = low demand</p>
            </div>
          </div>

          {/* Row 7: Flags */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
            <p className={labelCls}>Flags</p>
            <div className="flex flex-wrap gap-4">
              {(
                [
                  { key: 'is_active', label: '✅ Active', desc: 'Visible in public shop' },
                  { key: 'is_limited', label: '⏳ Limited', desc: 'Limited edition item' },
                  { key: 'is_sold_out', label: '🚫 Sold Out', desc: 'Mark as sold out' },
                ] as const
              ).map(({ key, label, desc }) => (
                <label key={key} className="flex items-start gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={form[key]}
                    onChange={(e) => set(key, e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded accent-cyan-400"
                  />
                  <div>
                    <p className="text-sm font-black text-white group-hover:text-cyan-300 transition">{label}</p>
                    <p className="text-[10px] text-zinc-600">{desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-5 border-t border-white/10 shrink-0">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border-2 border-white/15 bg-white/5 py-2.5 text-sm font-black text-zinc-300 hover:bg-white/10 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={loading || !form.name.trim() || !form.item_id.trim()}
            className="flex-1 rounded-xl py-2.5 text-sm font-black text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #00CFFF, #4DEEEA)' }}
          >
            {loading
              ? '⟳ Saving…'
              : mode === 'create'
              ? '➕ Create Item'
              : '💾 Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AdminMarketShopPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastMsg | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterType, setFilterType] = useState('');
  const [filterRarity, setFilterRarity] = useState('');

  // Modals
  const [createModal, setCreateModal] = useState(false);
  const [editItem, setEditItem] = useState<ShopItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<ShopItem | null>(null);
  const [restockItem, setRestockItem] = useState<ShopItem | null>(null);
  const [historyItem, setHistoryItem] = useState<ShopItem | null>(null);
  const [historyData, setHistoryData] = useState<ValueHistoryEntry[]>([]);
  const [disableItem, setDisableItem] = useState<ShopItem | null>(null);
  const [enableItem, setEnableItem] = useState<ShopItem | null>(null);

  // Action loading states
  const [acting, setActing] = useState(false);

  const showToast = useCallback((type: 'success' | 'error', text: string) => {
    setToast({ type, text });
  }, []);

  // Auth check
  useEffect(() => {
    fetch('/api/admin/check')
      .then((r) => r.json())
      .then((data) => {
        setIsOwner(data.isDeveloper === true);
        setAuthChecked(true);
      })
      .catch(() => setAuthChecked(true));
  }, []);

  // Load items
  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/market-shop');
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
      } else {
        showToast('error', 'Failed to load shop items');
      }
    } catch {
      showToast('error', 'Network error loading shop items');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (isOwner) loadItems();
  }, [isOwner, loadItems]);

  // Filtered items
  const filteredItems = items.filter((item) => {
    if (search) {
      const q = search.toLowerCase();
      if (
        !item.name.toLowerCase().includes(q) &&
        !item.item_id.toLowerCase().includes(q) &&
        !(item.description ?? '').toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    if (filterStatus === 'active' && !item.is_active) return false;
    if (filterStatus === 'disabled' && item.is_active) return false;
    if (filterStatus === 'limited' && !item.is_limited) return false;
    if (filterStatus === 'sold_out' && !item.is_sold_out) return false;
    if (filterType && item.type !== filterType) return false;
    if (filterRarity && item.rarity !== filterRarity) return false;
    return true;
  });

  // Create
  async function handleCreate(form: FormState) {
    setActing(true);
    try {
      const res = await fetch('/api/admin/market-shop/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok && data.item) {
        setItems((prev) => [...prev, data.item].sort((a, b) => a.name.localeCompare(b.name)));
        setCreateModal(false);
        showToast('success', `✅ "${data.item.name}" created successfully`);
      } else {
        showToast('error', data.error ?? 'Failed to create item');
      }
    } catch {
      showToast('error', 'Network error creating item');
    } finally {
      setActing(false);
    }
  }

  // Edit
  async function handleEdit(form: FormState) {
    if (!editItem) return;
    setActing(true);
    try {
      const res = await fetch(`/api/admin/market-shop/${editItem.item_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok && data.item) {
        setItems((prev) =>
          prev.map((i) => (i.item_id === data.item.item_id ? data.item : i))
        );
        setEditItem(null);
        showToast('success', `✅ "${data.item.name}" updated`);
      } else {
        showToast('error', data.error ?? 'Failed to update item');
      }
    } catch {
      showToast('error', 'Network error updating item');
    } finally {
      setActing(false);
    }
  }

  // Delete
  async function handleDelete() {
    if (!deleteItem) return;
    setActing(true);
    try {
      const res = await fetch(`/api/admin/market-shop/${deleteItem.item_id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.item_id !== deleteItem.item_id));
        showToast('success', `🗑️ "${deleteItem.name}" deleted`);
        setDeleteItem(null);
      } else {
        const data = await res.json();
        showToast('error', data.error ?? 'Failed to delete item');
      }
    } catch {
      showToast('error', 'Network error deleting item');
    } finally {
      setActing(false);
    }
  }

  // Restock
  async function handleRestock(amount: number) {
    if (!restockItem) return;
    setActing(true);
    try {
      const res = await fetch(`/api/admin/market-shop/${restockItem.item_id}/restock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (res.ok && data.item) {
        setItems((prev) =>
          prev.map((i) => (i.item_id === data.item.item_id ? data.item : i))
        );
        showToast('success', `📦 "${data.item.name}" restocked to ${data.item.current_stock}`);
        setRestockItem(null);
      } else {
        showToast('error', data.error ?? 'Failed to restock item');
      }
    } catch {
      showToast('error', 'Network error restocking item');
    } finally {
      setActing(false);
    }
  }

  // Disable
  async function handleDisable() {
    if (!disableItem) return;
    setActing(true);
    try {
      const res = await fetch(`/api/admin/market-shop/${disableItem.item_id}/disable`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.item) {
        setItems((prev) =>
          prev.map((i) => (i.item_id === data.item.item_id ? data.item : i))
        );
        showToast('success', `🔴 "${data.item.name}" disabled`);
        setDisableItem(null);
      } else {
        showToast('error', data.error ?? 'Failed to disable item');
      }
    } catch {
      showToast('error', 'Network error disabling item');
    } finally {
      setActing(false);
    }
  }

  // Enable
  async function handleEnable() {
    if (!enableItem) return;
    setActing(true);
    try {
      const res = await fetch(`/api/admin/market-shop/${enableItem.item_id}/enable`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.item) {
        setItems((prev) =>
          prev.map((i) => (i.item_id === data.item.item_id ? data.item : i))
        );
        showToast('success', `🟢 "${data.item.name}" enabled`);
        setEnableItem(null);
      } else {
        showToast('error', data.error ?? 'Failed to enable item');
      }
    } catch {
      showToast('error', 'Network error enabling item');
    } finally {
      setActing(false);
    }
  }

  // View history
  async function handleViewHistory(item: ShopItem) {
    setHistoryItem(item);
    setHistoryData([]);
    try {
      const res = await fetch(`/api/admin/market-shop/${item.item_id}`);
      if (res.ok) {
        const data = await res.json();
        setHistoryData(data.history ?? []);
      }
    } catch {
      // ignore — panel will show empty state
    }
  }

  // ---------------------------------------------------------------------------
  // Auth gate
  // ---------------------------------------------------------------------------

  if (!authChecked) {
    return (
      <Shell>
        <div className="flex items-center justify-center py-32">
          <p className="text-zinc-500 animate-pulse font-bold">Checking access…</p>
        </div>
      </Shell>
    );
  }

  if (!isOwner) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <p className="text-5xl mb-4">🔒</p>
          <h1 className="text-2xl font-black text-white mb-2">Access Denied</h1>
          <p className="text-zinc-500">Developer access required to manage the market shop.</p>
        </div>
      </Shell>
    );
  }

  // ---------------------------------------------------------------------------
  // Stats bar
  // ---------------------------------------------------------------------------

  const totalItems = items.length;
  const activeItems = items.filter((i) => i.is_active).length;
  const soldOutItems = items.filter((i) => i.is_sold_out).length;
  const limitedItems = items.filter((i) => i.is_limited).length;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Shell>
      {/* Modals */}
      {createModal && (
        <ItemFormModal
          mode="create"
          onSave={handleCreate}
          onCancel={() => setCreateModal(false)}
          loading={acting}
        />
      )}
      {editItem && (
        <ItemFormModal
          mode="edit"
          initial={{
            item_id: editItem.item_id,
            name: editItem.name,
            description: editItem.description ?? '',
            type: editItem.type,
            rarity: editItem.rarity ?? 'common',
            badge_id: editItem.badge_id ?? '',
            role_id: editItem.role_id ?? '',
            current_stock: editItem.current_stock,
            max_stock: editItem.max_stock,
            resale_supply: editItem.resale_supply,
            is_limited: editItem.is_limited,
            is_active: editItem.is_active,
            is_sold_out: editItem.is_sold_out,
            base_value: editItem.base_value,
            current_value: editItem.current_value,
            min_value: editItem.min_value,
            max_value: editItem.max_value,
            resale_percent: editItem.resale_percent,
            demand_score: Number(editItem.demand_score),
          }}
          onSave={handleEdit}
          onCancel={() => setEditItem(null)}
          loading={acting}
        />
      )}
      {deleteItem && (
        <ConfirmModal
          title={`Delete "${deleteItem.name}"`}
          message={`This will permanently delete "${deleteItem.name}" and all its value history. This action cannot be undone.`}
          confirmLabel="🗑️ Delete"
          confirmColor="linear-gradient(135deg, #ef4444, #dc2626)"
          onConfirm={handleDelete}
          onCancel={() => setDeleteItem(null)}
          loading={acting}
        />
      )}
      {restockItem && (
        <RestockModal
          item={restockItem}
          onConfirm={handleRestock}
          onCancel={() => setRestockItem(null)}
          loading={acting}
        />
      )}
      {disableItem && (
        <ConfirmModal
          title={`Disable "${disableItem.name}"`}
          message={`This will hide "${disableItem.name}" from the public shop. You can re-enable it at any time.`}
          confirmLabel="🔴 Disable"
          confirmColor="linear-gradient(135deg, #f59e0b, #d97706)"
          onConfirm={handleDisable}
          onCancel={() => setDisableItem(null)}
          loading={acting}
        />
      )}
      {enableItem && (
        <ConfirmModal
          title={`Enable "${enableItem.name}"`}
          message={`This will make "${enableItem.name}" visible in the public shop again.`}
          confirmLabel="🟢 Enable"
          confirmColor="linear-gradient(135deg, #10b981, #059669)"
          onConfirm={handleEnable}
          onCancel={() => setEnableItem(null)}
          loading={acting}
        />
      )}
      {historyItem && (
        <ValueHistoryPanel
          item={historyItem}
          history={historyData}
          onClose={() => { setHistoryItem(null); setHistoryData([]); }}
        />
      )}
      {toast && <Toast msg={toast} onDismiss={() => setToast(null)} />}

      {/* Page header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-2xl text-xl"
            style={{ background: 'rgba(255,127,80,0.12)', border: '1px solid rgba(255,127,80,0.28)' }}
          >
            🛍️
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight" style={{ color: '#e2f4ff' }}>
              Market Shop Manager
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(168,255,246,0.5)' }}>
              Admin panel · Main server only (Guild: 1467697766837915804)
            </p>
          </div>
        </div>

        <button
          onClick={() => setCreateModal(true)}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black text-white transition-all hover:opacity-90 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #FF7F50, #FF8C42)' }}
        >
          ➕ New Item
        </button>
      </div>

      {/* Stats bar */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total Items', value: totalItems, icon: '🛍️', color: '#00CFFF' },
          { label: 'Active', value: activeItems, icon: '✅', color: '#10b981' },
          { label: 'Sold Out', value: soldOutItems, icon: '🚫', color: '#ef4444' },
          { label: 'Limited', value: limitedItems, icon: '⏳', color: '#f59e0b' },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl p-4"
            style={{ border: '1px solid rgba(0,207,255,0.15)', background: 'rgba(6,43,69,0.75)' }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">{s.icon}</span>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(168,255,246,0.5)' }}>
                {s.label}
              </p>
            </div>
            <p className="text-2xl font-black tabular-nums" style={{ color: s.color }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div
        className="mb-5 rounded-2xl p-4 flex flex-wrap gap-3 items-center"
        style={{ border: '1px solid rgba(0,207,255,0.15)', background: 'rgba(6,43,69,0.75)' }}
      >
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-cyan-400 pointer-events-none">🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items…"
            className="w-full rounded-xl border border-white/10 bg-zinc-900/60 pl-9 pr-3 py-2 text-sm font-bold text-white placeholder-zinc-600 focus:border-cyan-400/50 focus:outline-none transition"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Status filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
          className="rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2 text-sm font-bold text-white focus:border-cyan-400/50 focus:outline-none transition"
          style={{ appearance: 'none' }}
        >
          <option value="all" style={{ background: '#0d0d1a' }}>All Status</option>
          <option value="active" style={{ background: '#0d0d1a' }}>Active</option>
          <option value="disabled" style={{ background: '#0d0d1a' }}>Disabled</option>
          <option value="limited" style={{ background: '#0d0d1a' }}>Limited</option>
          <option value="sold_out" style={{ background: '#0d0d1a' }}>Sold Out</option>
        </select>

        {/* Type filter */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2 text-sm font-bold text-white focus:border-cyan-400/50 focus:outline-none transition"
          style={{ appearance: 'none' }}
        >
          <option value="" style={{ background: '#0d0d1a' }}>All Types</option>
          {ITEM_TYPES.map((t) => (
            <option key={t} value={t} style={{ background: '#0d0d1a' }}>
              {TYPE_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>

        {/* Rarity filter */}
        <select
          value={filterRarity}
          onChange={(e) => setFilterRarity(e.target.value)}
          className="rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2 text-sm font-bold text-white focus:border-cyan-400/50 focus:outline-none transition"
          style={{ appearance: 'none' }}
        >
          <option value="" style={{ background: '#0d0d1a' }}>All Rarities</option>
          {RARITIES.map((r) => (
            <option key={r} value={r} style={{ background: '#0d0d1a' }}>
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </option>
          ))}
        </select>

        {/* Clear filters */}
        {(search || filterStatus !== 'all' || filterType || filterRarity) && (
          <button
            onClick={() => { setSearch(''); setFilterStatus('all'); setFilterType(''); setFilterRarity(''); }}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-zinc-400 hover:bg-white/10 transition"
          >
            ✕ Clear
          </button>
        )}

        <button
          onClick={loadItems}
          className="ml-auto rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-zinc-400 hover:bg-white/10 transition"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Items table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: '1px solid rgba(0,207,255,0.18)', background: 'rgba(6,43,69,0.75)' }}
      >
        {/* Desktop header */}
        <div
          className="hidden lg:grid items-center px-5 py-3 text-[10px] font-black uppercase tracking-widest"
          style={{
            gridTemplateColumns: '1fr 90px 90px 110px 110px 80px 80px 200px',
            borderBottom: '1px solid rgba(0,207,255,0.10)',
            color: 'rgba(168,255,246,0.45)',
          }}
        >
          <span>Item</span>
          <span>Type</span>
          <span>Rarity</span>
          <span>Value</span>
          <span>Stock</span>
          <span>Bought</span>
          <span>Status</span>
          <span>Actions</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-zinc-500 animate-pulse font-bold">Loading shop items…</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-4xl mb-3">🛍️</p>
            <p className="text-lg font-black text-zinc-400">
              {items.length === 0 ? 'No shop items yet' : 'No items match your filters'}
            </p>
            {items.length === 0 && (
              <button
                onClick={() => setCreateModal(true)}
                className="mt-4 rounded-xl px-4 py-2 text-sm font-black text-white transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #FF7F50, #FF8C42)' }}
              >
                ➕ Create First Item
              </button>
            )}
          </div>
        ) : (
          filteredItems.map((item) => {
            const stockPct = item.max_stock > 0 ? (item.current_stock / item.max_stock) * 100 : 0;
            const stockColor = item.is_sold_out
              ? '#ef4444'
              : stockPct <= 10
              ? '#f59e0b'
              : '#10b981';

            const valueChange = item.current_value - item.base_value;
            const valueChangePct = item.base_value > 0 ? (valueChange / item.base_value) * 100 : 0;
            const valueColor = valueChange >= 0 ? '#10b981' : '#ef4444';

            return (
              <div
                key={item.item_id}
                className="group transition-all duration-150"
                style={{ borderBottom: '1px solid rgba(0,207,255,0.07)' }}
              >
                {/* Desktop row */}
                <div
                  className="hidden lg:grid items-center px-5 py-4 hover:bg-[rgba(0,207,255,0.03)] transition-colors"
                  style={{ gridTemplateColumns: '1fr 90px 90px 110px 110px 80px 80px 200px' }}
                >
                  {/* Name + ID */}
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base shrink-0">{TYPE_ICONS[item.type] ?? '🛍️'}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-black truncate" style={{ color: '#e2f4ff' }}>{item.name}</p>
                        <p className="text-[10px] font-mono truncate" style={{ color: 'rgba(168,255,246,0.35)' }}>
                          {item.item_id}
                        </p>
                      </div>
                    </div>
                    {item.description && (
                      <p className="text-[11px] text-zinc-600 mt-0.5 truncate pl-7">{item.description}</p>
                    )}
                  </div>

                  {/* Type */}
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold capitalize w-fit"
                    style={{ background: 'rgba(0,207,255,0.08)', border: '1px solid rgba(0,207,255,0.18)', color: '#4DEEEA' }}
                  >
                    {item.type}
                  </span>

                  {/* Rarity */}
                  <div><RarityBadge rarity={item.rarity} /></div>

                  {/* Value */}
                  <div>
                    <p className="text-sm font-black tabular-nums" style={{ color: '#00CFFF' }}>
                      {fmtCurrency(item.current_value)} SP
                    </p>
                    {valueChange !== 0 && (
                      <p className="text-[10px] font-bold tabular-nums" style={{ color: valueColor }}>
                        {valueChange >= 0 ? '▲' : '▼'} {valueChangePct >= 0 ? '+' : ''}{valueChangePct.toFixed(1)}%
                      </p>
                    )}
                  </div>

                  {/* Stock */}
                  <div>
                    <p className="text-sm font-bold tabular-nums" style={{ color: stockColor }}>
                      {item.current_stock} / {item.max_stock}
                    </p>
                    {item.resale_supply > 0 && (
                      <p className="text-[10px] text-zinc-500">+{item.resale_supply} resale</p>
                    )}
                  </div>

                  {/* Total bought */}
                  <span className="text-sm tabular-nums" style={{ color: 'rgba(168,255,246,0.5)' }}>
                    {fmt(item.total_bought)}
                  </span>

                  {/* Status badges */}
                  <div className="flex flex-col gap-1">
                    {item.is_active ? (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold w-fit"
                        style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981' }}>
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold w-fit"
                        style={{ background: 'rgba(107,114,128,0.12)', border: '1px solid rgba(107,114,128,0.3)', color: '#6b7280' }}>
                        Disabled
                      </span>
                    )}
                    {item.is_sold_out && (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold w-fit"
                        style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                        Sold Out
                      </span>
                    )}
                    {item.is_limited && (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold w-fit"
                        style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}>
                        Limited
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => setEditItem(item)}
                      className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black text-zinc-300 hover:bg-white/10 transition"
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => setRestockItem(item)}
                      className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black text-zinc-300 hover:bg-white/10 transition"
                      title="Restock"
                    >
                      📦
                    </button>
                    <button
                      onClick={() => handleViewHistory(item)}
                      className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black text-zinc-300 hover:bg-white/10 transition"
                      title="Value History"
                    >
                      📊
                    </button>
                    {item.is_active ? (
                      <button
                        onClick={() => setDisableItem(item)}
                        className="rounded-lg border border-yellow-700/40 bg-yellow-950/20 px-2.5 py-1 text-[10px] font-black text-yellow-400 hover:bg-yellow-500/20 transition"
                        title="Disable"
                      >
                        🔴
                      </button>
                    ) : (
                      <button
                        onClick={() => setEnableItem(item)}
                        className="rounded-lg border border-green-700/40 bg-green-950/20 px-2.5 py-1 text-[10px] font-black text-green-400 hover:bg-green-500/20 transition"
                        title="Enable"
                      >
                        🟢
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteItem(item)}
                      className="rounded-lg border border-red-700/40 bg-red-950/20 px-2.5 py-1 text-[10px] font-black text-red-400 hover:bg-red-500/20 transition"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Mobile card */}
                <div className="lg:hidden px-4 py-4 hover:bg-[rgba(0,207,255,0.03)] transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl shrink-0">{TYPE_ICONS[item.type] ?? '🛍️'}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-black truncate" style={{ color: '#e2f4ff' }}>{item.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <RarityBadge rarity={item.rarity} />
                          {item.is_sold_out && (
                            <span className="text-[9px] font-bold text-red-400">Sold Out</span>
                          )}
                          {item.is_limited && (
                            <span className="text-[9px] font-bold text-yellow-400">Limited</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black tabular-nums" style={{ color: '#00CFFF' }}>
                        {fmtCurrency(item.current_value)} SP
                      </p>
                      <p className="text-[10px]" style={{ color: 'rgba(168,255,246,0.4)' }}>
                        Stock: {item.current_stock}/{item.max_stock}
                      </p>
                    </div>
                  </div>

                  {/* Mobile actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setEditItem(item)}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-black text-zinc-300 hover:bg-white/10 transition"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => setRestockItem(item)}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-black text-zinc-300 hover:bg-white/10 transition"
                    >
                      📦 Restock
                    </button>
                    <button
                      onClick={() => handleViewHistory(item)}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-black text-zinc-300 hover:bg-white/10 transition"
                    >
                      📊 History
                    </button>
                    {item.is_active ? (
                      <button
                        onClick={() => setDisableItem(item)}
                        className="rounded-lg border border-yellow-700/40 bg-yellow-950/20 px-3 py-1.5 text-xs font-black text-yellow-400 hover:bg-yellow-500/20 transition"
                      >
                        🔴 Disable
                      </button>
                    ) : (
                      <button
                        onClick={() => setEnableItem(item)}
                        className="rounded-lg border border-green-700/40 bg-green-950/20 px-3 py-1.5 text-xs font-black text-green-400 hover:bg-green-500/20 transition"
                      >
                        🟢 Enable
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteItem(item)}
                      className="rounded-lg border border-red-700/40 bg-red-950/20 px-3 py-1.5 text-xs font-black text-red-400 hover:bg-red-500/20 transition"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer note */}
      <div className="mt-4 text-center">
        <p className="text-[11px]" style={{ color: 'rgba(168,255,246,0.3)' }}>
          Market Shop Manager · Main Server only (Guild: 1467697766837915804) · Developer access required
        </p>
      </div>
    </Shell>
  );
}
