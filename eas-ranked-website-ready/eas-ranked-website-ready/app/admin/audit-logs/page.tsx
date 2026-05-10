"use client";

import { useState, useEffect } from "react";
import Shell from "@/components/Shell";
import SoundLink from "@/components/SoundLink";
import { AuditLog } from "../_components/AuditLog";

export default function AuditLogsPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    fetch("/api/admin/check")
      .then((r) => r.json())
      .then((d) => {
        setIsOwner(d.isDeveloper === true);
        setAuthChecked(true);
      })
      .catch(() => setAuthChecked(true));
  }, []);

  if (!authChecked) {
    return (
      <Shell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-zinc-400 animate-pulse">Checking access…</p>
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
            <p className="mt-2 text-zinc-400">
              This page is restricted to the EAS Arena developer.
            </p>
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

  return (
    <Shell>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <SoundLink
            href="/admin/players"
            soundType="click"
            className="text-xs text-zinc-500 hover:text-zinc-300 transition"
          >
            ← Player Management
          </SoundLink>
        </div>
        <h1 className="text-4xl font-black">📋 Audit Log</h1>
        <p className="mt-2 text-zinc-400">
          Complete history of all admin actions — badge assignments, premium
          grants, stat edits, and resets. Every action is tracked with the
          admin who performed it and a before/after snapshot.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0d0d14] p-6">
        <AuditLog />
      </div>
    </Shell>
  );
}
