"use client";

import { useState, useCallback } from "react";

export function usePlayerPremium(
  initialIsPremium = false,
  initialExpiresAt: string | null = null
) {
  const [isPremium, setIsPremium] = useState(initialIsPremium);
  const [premiumExpiresAt, setPremiumExpiresAt] = useState<string | null>(
    initialExpiresAt
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = useCallback(
    (premium: boolean, expiresAt: string | null) => {
      setIsPremium(premium);
      setPremiumExpiresAt(expiresAt);
      setError(null);
    },
    []
  );

  const reset = useCallback(
    (premium = false, expiresAt: string | null = null) => {
      setIsPremium(premium);
      setPremiumExpiresAt(expiresAt);
      setError(null);
      setIsLoading(false);
    },
    []
  );

  return {
    isPremium,
    premiumExpiresAt,
    isLoading,
    error,
    setIsLoading,
    setError,
    update,
    reset,
  };
}
