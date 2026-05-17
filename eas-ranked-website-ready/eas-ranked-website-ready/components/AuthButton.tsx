"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import type { DiscordUser } from "@/lib/auth";

interface AuthButtonProps {
  /** Pass the server-resolved user so the button is SSR-friendly */
  initialUser?: DiscordUser | null;
}

function getAvatarUrl(user: DiscordUser): string | null {
  if (!user.avatar) return null;
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`;
}

export default function AuthButton({ initialUser }: AuthButtonProps) {
  const [user, setUser] = useState<DiscordUser | null>(initialUser ?? null);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Hydrate from /api/auth/me on the client so the button stays in sync
  useEffect(() => {
    if (initialUser !== undefined) return; // already provided by server
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => setUser(data.user ?? null))
      .catch(() => setUser(null));
  }, [initialUser]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) {
    return (
      <Link
        href="/auth/login"
        className="flex items-center gap-1.5 rounded-lg bg-[#5865F2] px-3 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.03.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
        </svg>
        <span className="hidden sm:inline">Login</span>
      </Link>
    );
  }

  const avatarUrl = getAvatarUrl(user);
  const displayName = user.global_name || user.username;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.04] px-2.5 py-1.5 text-xs font-bold transition-colors hover:bg-white/[0.08]"
        aria-label="Account menu"
        aria-expanded={open}
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={displayName}
            width={24}
            height={24}
            className="rounded-full"
          />
        ) : (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#5865F2] text-[10px] font-black">
            {displayName.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="hidden max-w-[80px] truncate sm:inline text-zinc-300">{displayName}</span>
        <svg
          className={`h-3 w-3 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-48 overflow-hidden rounded-xl border border-white/[0.07] bg-[#0d0d18] shadow-2xl">
          {/* User info header */}
          <div className="border-b border-white/[0.07] px-3 py-2.5">
            <p className="truncate text-sm font-bold">{displayName}</p>
            <p className="truncate text-xs text-zinc-600">@{user.username}</p>
          </div>

          {/* Menu items */}
          <div className="p-1.5">
            <Link
              href={`/profile/${user.id}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <span>👤</span> My Profile
            </Link>
            <Link
              href="/premium/manage"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <span>⚙️</span> Settings
            </Link>
            <div className="my-1 border-t border-white/[0.07]" />
            <a
              href="/api/auth/logout"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-red-400 transition-colors hover:bg-red-950/20 hover:text-red-300"
            >
              <span>🚪</span> Logout
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
