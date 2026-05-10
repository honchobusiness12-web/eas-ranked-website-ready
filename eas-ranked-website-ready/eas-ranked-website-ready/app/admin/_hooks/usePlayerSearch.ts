"use client";

import { useState, useRef, useCallback } from "react";
import { searchPlayers } from "../_actions";
import type { PlayerRow } from "../_actions";

export function usePlayerSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerRow[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setIsSearching(true);
    try {
      const result = await searchPlayers(trimmed);
      if (result.success && result.data) {
        setResults(result.data);
        setIsOpen(true);
      }
    } finally {
      setIsSearching(false);
    }
  }, []);

  function handleQueryChange(q: string) {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => runSearch(q), 300);
  }

  function clear() {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }

  function close() {
    setIsOpen(false);
  }

  return {
    query,
    results,
    isSearching,
    isOpen,
    handleQueryChange,
    clear,
    close,
  };
}
