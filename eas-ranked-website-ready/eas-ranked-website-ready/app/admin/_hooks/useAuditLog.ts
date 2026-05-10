"use client";

import { useState, useCallback } from "react";
import { getAuditLogs } from "../_actions";
import type { AuditLogEntry } from "../_actions";

const PAGE_SIZE = 15;

export function useAuditLog(userId?: string) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (p: number, action?: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getAuditLogs({
          limit: PAGE_SIZE,
          offset: p * PAGE_SIZE,
          userId,
          action,
        });
        if (result.success && result.data) {
          setLogs(result.data.logs);
          setTotal(result.data.total);
          setPage(p);
        } else {
          setError(result.error ?? "Failed to load audit logs.");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [userId]
  );

  const refresh = useCallback(() => load(0), [load]);

  return {
    logs,
    total,
    page,
    pageSize: PAGE_SIZE,
    isLoading,
    error,
    load,
    refresh,
  };
}
