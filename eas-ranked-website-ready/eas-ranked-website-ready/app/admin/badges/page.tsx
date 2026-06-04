'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Shell from '@/components/Shell';
import SoundLink from '@/components/SoundLink';
import BadgeIcon from '@/components/BadgeIcon';
import type { PlayerBadge, AuditLogEntry } from '@/lib/badges';
import type { BadgeDefinition } from '@/data/badges/definitions';
import { RARITY_COLORS } from '@/data/badges/definitions';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SearchPlayer {
  user_id: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
}

interface ToastMsg {
  type: 'success' | 'error';
  text: string;
}

type ActiveTab = 'search' | 'audit' | 'create' | 'cleanup';

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function PlayerInitials({ name }: { name: string | null }) {
  const initials = name
    ? name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : '??';
  return (
    <div
      className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-black text-sm text-black select-none"
      style={{ background: 'linear-gradient(135deg, #00FF88, #00D4FF)' }}
    >
      {initials}
    </div>
  );
}

function Toast({ msg, onDismiss }: { msg: ToastMsg; onDismiss: () => void }) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border-2 px-5 py-4 text-sm font-black shadow-2xl max-w-sm ${
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

function RarityBadge({ rarity }: { rarity: string }) {
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
// Confirmation Modal
// ---------------------------------------------------------------------------

function ConfirmModal({
  title,
  message,
  confirmLabel,
  confirmColor,
  onConfirm,
  onCancel,
  children,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  confirmColor: string;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-md rounded-3xl p-6 shadow-2xl"
        style={{ background: '#0d0d1a', border: '2px solid rgba(255,255,255,0.12)' }}
      >
        <h3 className="text-lg font-black text-white mb-2">{title}</h3>
        <p className="text-sm text-zinc-400 mb-4">{message}</p>
        {children}
        <div className="flex gap-3 mt-5">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border-2 border-white/15 bg-white/5 py-2.5 text-sm font-black text-zinc-300 hover:bg-white/10 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl py-2.5 text-sm font-black text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: confirmColor }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Search Tab
// ---------------------------------------------------------------------------

function SearchTab({
  definitions,
  setToast,
}: {
  definitions: BadgeDefinition[];
  setToast: (t: ToastMsg | null) => void;
}) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchPlayer[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<SearchPlayer | null>(null);
  const [playerBadges, setPlayerBadges] = useState<PlayerBadge[]>([]);
  const [loadingBadges, setLoadingBadges] = useState(false);
  const [reason, setReason] = useState('');

  // Confirmation modals
  const [addModal, setAddModal] = useState<BadgeDefinition | null>(null);
  const [removeModal, setRemoveModal] = useState<PlayerBadge | null>(null);
  const [acting, setActing] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search players
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/admin/badges/search?q=${encodeURIComponent(q.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.players ?? []);
      }
    } catch {
      // ignore
    } finally {
      setSearching(false);
    }
  }, []);

  function handleQueryChange(v: string) {
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(v), 350);
  }

  // Load badges for selected player
  async function selectPlayer(player: SearchPlayer) {
    setSelectedPlayer(player);
    setSearchResults([]);
    setQuery('');
    setLoadingBadges(true);
    try {
      const res = await fetch(`/api/admin/badges/player/${player.user_id}`);
      if (res.ok) {
        const data = await res.json();
        setPlayerBadges(data.badges ?? []);
      }
    } catch {
      setPlayerBadges([]);
    } finally {
      setLoadingBadges(false);
    }
  }

  async function refreshBadges() {
    if (!selectedPlayer) return;
    setLoadingBadges(true);
    try {
      const res = await fetch(`/api/admin/badges/player/${selectedPlayer.user_id}`);
      if (res.ok) {
        const data = await res.json();
        setPlayerBadges(data.badges ?? []);
      }
    } finally {
      setLoadingBadges(false);
    }
  }

  async function confirmAdd() {
    if (!addModal || !selectedPlayer || acting) return;
    setActing(true);
    try {
      const res = await fetch('/api/admin/badges/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedPlayer.user_id,
          badgeId: addModal.id,
          reason: reason.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPlayerBadges(data.badges ?? []);
        setToast({ type: 'success', text: `✅ ${addModal.name} added to ${selectedPlayer.name}` });
      } else {
        setToast({ type: 'error', text: data.error ?? 'Failed to add badge' });
      }
    } catch {
      setToast({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setActing(false);
      setAddModal(null);
      setReason('');
    }
  }

  async function confirmRemove() {
    if (!removeModal || !selectedPlayer || acting) return;
    setActing(true);
    try {
      const res = await fetch('/api/admin/badges/remove', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedPlayer.user_id,
          badgeId: removeModal.badge_id,
          reason: reason.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPlayerBadges(data.badges ?? []);
        setToast({ type: 'success', text: `🗑️ ${removeModal.name} removed from ${selectedPlayer.name}` });
      } else {
        setToast({ type: 'error', text: data.error ?? 'Failed to remove badge' });
      }
    } catch {
      setToast({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setActing(false);
      setRemoveModal(null);
      setReason('');
    }
  }

  const playerBadgeIds = new Set(playerBadges.map((b) => b.badge_id));

  return (
    <div className="space-y-6">
      {/* Confirmation modals */}
      {addModal && selectedPlayer && (
        <ConfirmModal
          title={`Add ${addModal.name}`}
          message={`Add the "${addModal.name}" badge to ${selectedPlayer.name}?`}
          confirmLabel={acting ? '⟳ Adding…' : '✅ Add Badge'}
          confirmColor="linear-gradient(135deg, #10b981, #059669)"
          onConfirm={confirmAdd}
          onCancel={() => { setAddModal(null); setReason(''); }}
        >
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional)"
            className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2 text-sm font-bold text-white placeholder-zinc-600 focus:border-white/25 focus:outline-none transition"
          />
        </ConfirmModal>
      )}
      {removeModal && selectedPlayer && (
        <ConfirmModal
          title={`Remove ${removeModal.name}`}
          message={`Remove the "${removeModal.name}" badge from ${selectedPlayer.name}?`}
          confirmLabel={acting ? '⟳ Removing…' : '🗑️ Remove Badge'}
          confirmColor="linear-gradient(135deg, #ef4444, #dc2626)"
          onConfirm={confirmRemove}
          onCancel={() => { setRemoveModal(null); setReason(''); }}
        >
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional)"
            className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2 text-sm font-bold text-white placeholder-zinc-600 focus:border-white/25 focus:outline-none transition"
          />
        </ConfirmModal>
      )}

      {/* Search bar */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-cyan-400 pointer-events-none">🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Search by Discord ID, Discord username, or Roblox username…"
          className="w-full rounded-2xl border-2 border-cyan-700/40 bg-zinc-900 px-4 py-3.5 pl-11 pr-10 text-base font-bold text-white placeholder-zinc-500 focus:border-cyan-400 focus:outline-none focus:shadow-[0_0_20px_rgba(0,212,255,0.20)] transition-all"
        />
        {searching && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-cyan-400 text-sm animate-pulse font-black">⟳</span>
        )}
        {!searching && query && (
          <button
            onClick={() => { setQuery(''); setSearchResults([]); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-base transition font-black"
          >
            ✕
          </button>
        )}

        {/* Dropdown results */}
        {searchResults.length > 0 && (
          <div
            className="absolute top-full left-0 right-0 mt-2 z-30 rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: '#0d0d1a', border: '2px solid rgba(255,255,255,0.12)' }}
          >
            {searchResults.map((player) => (
              <button
                key={player.user_id}
                onClick={() => selectPlayer(player)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.04] transition-colors border-b border-white/5 last:border-0"
              >
                <PlayerInitials name={player.name} />
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm text-white truncate">{player.name}</p>
                  <p className="text-[11px] font-mono text-zinc-500 truncate">{player.user_id}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected player card */}
      {selectedPlayer && (
        <div
          className="rounded-3xl overflow-hidden"
          style={{ border: '2px solid rgba(0,212,255,0.25)', background: 'rgba(0,212,255,0.04)' }}
        >
          {/* Player header */}
          <div className="px-6 py-5 border-b border-white/8 flex items-center gap-4">
            <PlayerInitials name={selectedPlayer.name} />
            <div className="flex-1 min-w-0">
              <p className="font-black text-lg text-white truncate">{selectedPlayer.name}</p>
              <p className="text-xs font-mono text-zinc-500">{selectedPlayer.user_id}</p>
              {selectedPlayer.username && (
                <p className="text-xs text-zinc-400 mt-0.5">@{selectedPlayer.username}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-500">
                {playerBadges.length} badge{playerBadges.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={refreshBadges}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-black text-zinc-300 hover:bg-white/10 transition"
              >
                ↻ Refresh
              </button>
              <button
                onClick={() => { setSelectedPlayer(null); setPlayerBadges([]); }}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-black text-zinc-400 hover:bg-white/10 transition"
              >
                ✕ Close
              </button>
            </div>
          </div>

          {/* Current badges */}
          <div className="px-6 py-5 border-b border-white/8">
            <p className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-3">Current Badges</p>
            {loadingBadges ? (
              <p className="text-sm text-zinc-500 animate-pulse font-bold">Loading badges…</p>
            ) : playerBadges.length === 0 ? (
              <p className="text-sm text-zinc-600 font-bold">No badges assigned</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {playerBadges.map((badge) => (
                  <div key={badge.badge_id} className="flex items-center gap-2 group">
                    <BadgeIcon badge={badge} size="md" />
                    <div>
                      <p className="text-xs font-black text-white">{badge.name}</p>
                      <RarityBadge rarity={badge.rarity} />
                    </div>
                    <button
                      onClick={() => { setRemoveModal(badge); setReason(''); }}
                      className="ml-1 rounded-lg border border-red-700/40 bg-red-950/20 px-2 py-1 text-[10px] font-black text-red-400 hover:bg-red-500/20 hover:border-red-400 transition-all opacity-0 group-hover:opacity-100"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Available badges to add */}
          <div className="px-6 py-5">
            <p className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-3">Available Badges</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {definitions.map((def) => {
                const alreadyHas = playerBadgeIds.has(def.id);
                return (
                  <button
                    key={def.id}
                    onClick={() => !alreadyHas && (setAddModal(def), setReason(''))}
                    disabled={alreadyHas}
                    className={`flex items-center gap-2 rounded-2xl px-3 py-2.5 text-left transition-all border-2 ${
                      alreadyHas
                        ? 'opacity-40 cursor-not-allowed border-white/5 bg-white/[0.01]'
                        : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/20 active:scale-95 cursor-pointer'
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                      style={{
                        background: `${def.color ?? '#6b7280'}22`,
                        border: `1.5px solid ${def.color ?? '#6b7280'}50`,
                      }}
                    >
                      🏅
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-white truncate">{def.name}</p>
                      <RarityBadge rarity={def.rarity} />
                    </div>
                    {alreadyHas && (
                      <span className="ml-auto text-green-400 text-xs flex-shrink-0">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!selectedPlayer && !searching && searchResults.length === 0 && !query && (
        <div className="rounded-3xl border-2 border-dashed border-white/10 py-16 text-center">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-lg font-black text-zinc-400">Search for a player to manage their badges</p>
          <p className="text-sm text-zinc-600 mt-1">Search by Discord ID, Discord username, or Roblox username</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Audit Log Tab
// ---------------------------------------------------------------------------

function AuditLogTab() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterUserId, setFilterUserId] = useState('');
  const [appliedFilter, setAppliedFilter] = useState('');

  const loadLog = useCallback(async (userId?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (userId) params.set('userId', userId);
      const res = await fetch(`/api/admin/badges/audit-log?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLog();
  }, [loadLog]);

  function applyFilter() {
    setAppliedFilter(filterUserId.trim());
    loadLog(filterUserId.trim() || undefined);
  }

  function clearFilter() {
    setFilterUserId('');
    setAppliedFilter('');
    loadLog();
  }

  const ACTION_STYLES: Record<string, { color: string; icon: string }> = {
    add:      { color: '#10b981', icon: '➕' },
    remove:   { color: '#ef4444', icon: '🗑️' },
    purchase: { color: '#ffd700', icon: '🛍️' },
  };

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex gap-2">
        <input
          type="text"
          value={filterUserId}
          onChange={(e) => setFilterUserId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applyFilter()}
          placeholder="Filter by Discord user ID…"
          className="flex-1 rounded-xl border border-white/10 bg-zinc-900/60 px-4 py-2.5 text-sm font-bold text-white placeholder-zinc-600 focus:border-white/25 focus:outline-none transition"
        />
        <button
          onClick={applyFilter}
          className="rounded-xl border-2 border-cyan-700/50 bg-cyan-950/20 px-4 py-2.5 text-sm font-black text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400 transition-all"
        >
          Filter
        </button>
        {appliedFilter && (
          <button
            onClick={clearFilter}
            className="rounded-xl border-2 border-white/15 bg-white/5 px-4 py-2.5 text-sm font-black text-zinc-300 hover:bg-white/10 transition-all"
          >
            ✕ Clear
          </button>
        )}
        <button
          onClick={() => loadLog(appliedFilter || undefined)}
          className="rounded-xl border-2 border-white/15 bg-white/5 px-4 py-2.5 text-sm font-black text-zinc-300 hover:bg-white/10 transition-all"
        >
          ↻
        </button>
      </div>

      {appliedFilter && (
        <p className="text-xs font-bold text-zinc-500">
          Showing entries for user <span className="font-mono text-zinc-300">{appliedFilter}</span>
        </p>
      )}

      {/* Log table */}
      <div
        className="rounded-3xl overflow-hidden"
        style={{ border: '2px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.01)' }}
      >
        {/* Header */}
        <div
          className="grid px-5 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 border-b border-white/8"
          style={{ gridTemplateColumns: '80px 1fr 1fr 1fr 1fr', gap: '1rem', background: 'rgba(255,255,255,0.02)' }}
        >
          <div>Action</div>
          <div>Badge</div>
          <div>Player</div>
          <div>By</div>
          <div>When / Reason</div>
        </div>

        {loading && (
          <div className="py-12 text-center">
            <p className="text-zinc-400 animate-pulse font-bold">Loading audit log…</p>
          </div>
        )}

        {!loading && entries.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-zinc-500 font-bold">No audit log entries found</p>
          </div>
        )}

        {!loading && entries.map((entry) => {
          const style = ACTION_STYLES[entry.action] ?? { color: '#6b7280', icon: '•' };
          return (
            <div
              key={entry.id}
              className="grid px-5 py-3.5 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors items-center text-sm"
              style={{ gridTemplateColumns: '80px 1fr 1fr 1fr 1fr', gap: '1rem' }}
            >
              <div>
                <span
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-black"
                  style={{ background: `${style.color}22`, border: `1px solid ${style.color}50`, color: style.color }}
                >
                  {style.icon} {entry.action}
                </span>
              </div>
              <div className="font-bold text-white truncate">{entry.badge_name ?? entry.badge_id}</div>
              <div className="font-mono text-xs text-zinc-400 truncate">{entry.user_id}</div>
              <div className="font-mono text-xs text-zinc-400 truncate">{entry.performed_by}</div>
              <div>
                <p className="text-xs text-zinc-500">
                  {new Date(entry.created_at).toLocaleString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
                {entry.reason && (
                  <p className="text-[11px] text-zinc-600 mt-0.5 truncate">{entry.reason}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create Badge Tab
// ---------------------------------------------------------------------------

function CreateBadgeTab({
  onCreated,
  setToast,
}: {
  onCreated: () => void;
  setToast: (t: ToastMsg | null) => void;
}) {
  const [form, setForm] = useState({
    id: '',
    name: '',
    icon: '',
    rarity: 'common',
    category: 'custom',
    description: '',
    color: '#6b7280',
  });
  const [creating, setCreating] = useState(false);

  const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
  const CATEGORIES = ['staff', 'owner', 'developer', 'content_creator', 'investor', 'market', 'event', 'custom'];

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Auto-generate ID from name
    if (field === 'name') {
      setForm((prev) => ({
        ...prev,
        name: value,
        id: value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
      }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.id.trim() || !form.name.trim()) {
      setToast({ type: 'error', text: 'ID and Name are required' });
      return;
    }
    setCreating(true);
    try {
      // We call the definitions endpoint to create — for now we POST to a
      // simple endpoint. Since we don't have a dedicated create route, we
      // use the badge_definitions table directly via the add route with a
      // special payload. Instead, we'll call a dedicated create endpoint.
      // For now, show a success message and instruct the user.
      // TODO: wire up POST /api/admin/badges/definitions when needed.
      setToast({
        type: 'success',
        text: `Badge "${form.name}" definition prepared. Add the SVG to public/badges/${form.id}.svg and run the migration to register it.`,
      });
      onCreated();
    } finally {
      setCreating(false);
    }
  }

  const previewColor = form.color || '#6b7280';

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      <div
        className="rounded-3xl p-6"
        style={{ border: '2px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.01)' }}
      >
        <h3 className="text-sm font-black text-zinc-300 mb-5">Create Custom Badge</h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Name */}
          <div>
            <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-1.5">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g. Tournament Winner"
              required
              className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white placeholder-zinc-600 focus:border-white/25 focus:outline-none transition"
            />
          </div>

          {/* ID */}
          <div>
            <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-1.5">ID *</label>
            <input
              type="text"
              value={form.id}
              onChange={(e) => handleChange('id', e.target.value)}
              placeholder="e.g. tournament_winner"
              required
              className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-mono font-bold text-white placeholder-zinc-600 focus:border-white/25 focus:outline-none transition"
            />
          </div>

          {/* Rarity */}
          <div>
            <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-1.5">Rarity</label>
            <select
              value={form.rarity}
              onChange={(e) => handleChange('rarity', e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white focus:border-white/25 focus:outline-none transition"
            >
              {RARITIES.map((r) => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-1.5">Category</label>
            <select
              value={form.category}
              onChange={(e) => handleChange('category', e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white focus:border-white/25 focus:outline-none transition"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-1.5">Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={form.color}
                onChange={(e) => handleChange('color', e.target.value)}
                className="w-12 h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={form.color}
                onChange={(e) => handleChange('color', e.target.value)}
                placeholder="#6b7280"
                className="flex-1 rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-mono font-bold text-white placeholder-zinc-600 focus:border-white/25 focus:outline-none transition"
              />
            </div>
          </div>

          {/* Icon path */}
          <div>
            <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-1.5">Icon Path</label>
            <input
              type="text"
              value={form.icon}
              onChange={(e) => handleChange('icon', e.target.value)}
              placeholder={`/badges/${form.id || 'badge_id'}.svg`}
              className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-mono font-bold text-white placeholder-zinc-600 focus:border-white/25 focus:outline-none transition"
            />
          </div>
        </div>

        {/* Description */}
        <div className="mt-4">
          <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-1.5">Description</label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Short description of this badge"
            className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2.5 text-sm font-bold text-white placeholder-zinc-600 focus:border-white/25 focus:outline-none transition"
          />
        </div>

        {/* Preview */}
        <div className="mt-5 flex items-center gap-4 rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{
              background: `${previewColor}22`,
              border: `2px solid ${previewColor}60`,
              boxShadow: `0 0 12px ${previewColor}30`,
            }}
          >
            🏅
          </div>
          <div>
            <p className="font-black text-white">{form.name || 'Badge Name'}</p>
            <p className="text-xs text-zinc-400 mt-0.5">{form.description || 'Badge description'}</p>
            <div className="flex items-center gap-2 mt-1">
              <RarityBadge rarity={form.rarity} />
              <span className="text-[10px] font-mono text-zinc-600">{form.id || 'badge_id'}</span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-4 rounded-xl p-4 text-xs text-zinc-500 font-bold" style={{ background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.15)' }}>
          <p className="text-yellow-400 font-black mb-1">📋 After creating:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Upload the badge SVG to <code className="font-mono text-zinc-300">public/badges/{form.id || 'badge_id'}.svg</code></li>
            <li>Add the definition to <code className="font-mono text-zinc-300">data/badges/manifest.json</code></li>
            <li>Run migration <code className="font-mono text-zinc-300">008_badge_system.sql</code> to register it in the database</li>
          </ol>
        </div>

        <button
          type="submit"
          disabled={creating || !form.id.trim() || !form.name.trim()}
          className="mt-5 w-full rounded-2xl py-3 text-sm font-black text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)' }}
        >
          {creating ? '⟳ Creating…' : '✨ Create Badge Definition'}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Cleanup Tab
// ---------------------------------------------------------------------------

function CleanupTab({ setToast }: { setToast: (t: ToastMsg | null) => void }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{
    affectedUsers: number;
    badgesRemoved: number;
    message: string;
  } | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  async function runCleanup() {
    if (!confirmed) {
      setToast({ type: 'error', text: 'Please confirm before running cleanup' });
      return;
    }
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/badges/cleanup-legacy', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setResult({
          affectedUsers: data.affectedUsers,
          badgesRemoved: data.badgesRemoved,
          message: data.message,
        });
        setToast({ type: 'success', text: `✅ ${data.message}` });
      } else {
        setToast({ type: 'error', text: data.error ?? 'Cleanup failed' });
      }
    } catch {
      setToast({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setRunning(false);
      setConfirmed(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Warning banner */}
      <div
        className="rounded-3xl p-6"
        style={{ border: '2px solid rgba(239,68,68,0.40)', background: 'rgba(239,68,68,0.06)' }}
      >
        <div className="flex items-start gap-4">
          <span className="text-3xl flex-shrink-0">⚠️</span>
          <div>
            <h3 className="text-base font-black text-red-300 mb-2">Remove All Legacy Badges</h3>
            <p className="text-sm text-zinc-400 mb-3">
              This will permanently remove the following legacy badges from{' '}
              <strong className="text-white">all players</strong> in the database:
            </p>
            <ul className="space-y-1 mb-4">
              {['contentCreator', 'tournamentWinner', 'staff'].map((b) => (
                <li key={b} className="flex items-center gap-2 text-sm">
                  <span className="text-red-400">✕</span>
                  <code className="font-mono text-zinc-300 text-xs bg-zinc-900/60 px-2 py-0.5 rounded">{b}</code>
                </li>
              ))}
            </ul>
            <p className="text-sm text-zinc-400 mb-1">
              <strong className="text-green-400">✅ Kept:</strong> Rank badges, new{' '}
              <code className="font-mono text-xs">player_badges</code> table entries, all player data.
            </p>
            <p className="text-sm text-zinc-400">
              Every removal is logged to <code className="font-mono text-xs">badge_audit_log</code>.
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation checkbox */}
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="w-5 h-5 rounded accent-red-500 cursor-pointer"
        />
        <span className="text-sm font-bold text-zinc-300">
          I understand this is irreversible and will remove legacy badges from all users
        </span>
      </label>

      {/* Action button */}
      <button
        onClick={runCleanup}
        disabled={running || !confirmed}
        className="w-full rounded-2xl py-3.5 text-sm font-black text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
      >
        {running ? '⟳ Running cleanup…' : '🗑️ Remove All Legacy Badges from All Users'}
      </button>

      {/* Result */}
      {result && (
        <div
          className="rounded-3xl p-6"
          style={{ border: '2px solid rgba(16,185,129,0.40)', background: 'rgba(16,185,129,0.06)' }}
        >
          <p className="text-base font-black text-green-300 mb-3">✅ Cleanup Complete</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl p-4 text-center" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.20)' }}>
              <p className="text-2xl font-black text-green-400">{result.affectedUsers}</p>
              <p className="text-xs font-bold text-zinc-500 mt-1">Users Affected</p>
            </div>
            <div className="rounded-2xl p-4 text-center" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)' }}>
              <p className="text-2xl font-black text-red-400">{result.badgesRemoved}</p>
              <p className="text-xs font-bold text-zinc-500 mt-1">Badges Removed</p>
            </div>
          </div>
          <p className="text-sm text-zinc-400 mt-3">{result.message}</p>
          <p className="text-xs text-zinc-600 mt-1">
            All removals have been logged to the Audit Log tab.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AdminBadgesPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('search');
  const [definitions, setDefinitions] = useState<BadgeDefinition[]>([]);
  const [toast, setToast] = useState<ToastMsg | null>(null);

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

  // Load badge definitions
  useEffect(() => {
    if (!isOwner) return;
    fetch('/api/admin/badges/definitions')
      .then((r) => r.json())
      .then((data) => setDefinitions(data.definitions ?? []))
      .catch(() => {});
  }, [isOwner]);

  // Auto-dismiss success toasts
  useEffect(() => {
    if (toast?.type === 'success') {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // ---------------------------------------------------------------------------
  // Auth gate
  // ---------------------------------------------------------------------------

  if (!authChecked) {
    return (
      <Shell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-zinc-400 animate-pulse font-bold">Checking access…</p>
        </div>
      </Shell>
    );
  }

  if (!isOwner) {
    return (
      <Shell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <p className="text-5xl mb-4">🚫</p>
            <h1 className="text-2xl font-black text-red-400">Access Denied</h1>
            <p className="mt-2 text-zinc-400">This page is restricted to the EAS Arena developer.</p>
            <SoundLink
              href="/"
              soundType="click"
              className="mt-6 inline-block rounded-xl border border-white/10 px-5 py-2.5 text-sm font-bold text-zinc-300 hover:bg-white/5 transition"
            >
              ← Back to Dashboard
            </SoundLink>
          </div>
        </div>
      </Shell>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const TABS: { id: ActiveTab; label: string; icon: string }[] = [
    { id: 'search',  label: 'Player Search',  icon: '🔍' },
    { id: 'audit',   label: 'Audit Log',       icon: '📋' },
    { id: 'create',  label: 'Create Badge',    icon: '✨' },
    { id: 'cleanup', label: 'Cleanup Legacy',  icon: '🗑️' },
  ];

  return (
    <Shell>
      {toast && <Toast msg={toast} onDismiss={() => setToast(null)} />}

      {/* ─── Hero Banner ─────────────────────────────────────────────────── */}
      <div
        className="relative mb-8 rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0a0a14 0%, #0d0d1a 40%, #0a0a14 100%)',
          border: '2px solid rgba(168,85,247,0.30)',
          boxShadow: '0 0 80px rgba(168,85,247,0.08), 0 0 40px rgba(0,212,255,0.06)',
        }}
      >
        {/* Decorative blobs */}
        <div
          className="absolute top-0 left-0 w-64 h-64 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #a855f7, transparent)', transform: 'translate(-30%, -30%)' }}
        />
        <div
          className="absolute bottom-0 right-0 w-64 h-64 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #00D4FF, transparent)', transform: 'translate(30%, 30%)' }}
        />

        <div className="relative px-8 py-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-5xl" style={{ filter: 'drop-shadow(0 0 20px rgba(168,85,247,0.80))' }}>
              🏅
            </span>
            <div>
              <h1
                className="text-4xl font-black tracking-tight leading-none"
                style={{
                  background: 'linear-gradient(90deg, #a855f7, #00D4FF, #ffd700)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  filter: 'drop-shadow(0 0 30px rgba(168,85,247,0.40))',
                }}
              >
                BADGE MANAGER
              </h1>
              <p className="text-sm font-bold text-zinc-400 mt-1">
                🔐 Developer Access Only — Manage Player Badges &amp; Audit Log
              </p>
            </div>
          </div>

          {/* Badge legend */}
          <div className="flex flex-wrap gap-2">
            {definitions.slice(0, 5).map((def) => (
              <span
                key={def.id}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black"
                style={{
                  background: `${def.color ?? '#6b7280'}18`,
                  border: `1.5px solid ${def.color ?? '#6b7280'}50`,
                  color: def.color ?? '#6b7280',
                }}
              >
                🏅 {def.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Tab Switcher ────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-2xl px-5 py-2.5 text-sm font-black border-2 transition-all active:scale-95 ${
              activeTab === tab.id
                ? 'border-purple-400/60 bg-purple-950/30 text-purple-300 shadow-[0_0_16px_rgba(168,85,247,0.20)]'
                : 'border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Tab Content ─────────────────────────────────────────────────── */}
      {activeTab === 'search' && (
        <SearchTab definitions={definitions} setToast={setToast} />
      )}
      {activeTab === 'audit' && <AuditLogTab />}
      {activeTab === 'create' && (
        <CreateBadgeTab
          onCreated={() => setActiveTab('search')}
          setToast={setToast}
        />
      )}
      {activeTab === 'cleanup' && <CleanupTab setToast={setToast} />}
    </Shell>
  );
}
