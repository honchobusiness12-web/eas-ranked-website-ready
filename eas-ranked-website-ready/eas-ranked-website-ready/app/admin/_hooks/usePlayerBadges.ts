"use client";

import { useState, useCallback } from "react";
import type { BadgeInfo } from "../_actions";

export function usePlayerBadges(initialBadges: BadgeInfo[] = []) {
  const [badges, setBadges] = useState<BadgeInfo[]>(initialBadges);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setBadgesFromAction = useCallback((newBadges: BadgeInfo[]) => {
    setBadges(newBadges);
    setError(null);
  }, []);

  const reset = useCallback((newBadges: BadgeInfo[] = []) => {
    setBadges(newBadges);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    badges,
    isLoading,
    error,
    setIsLoading,
    setError,
    setBadges: setBadgesFromAction,
    reset,
  };
}
