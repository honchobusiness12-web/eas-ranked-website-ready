"use client";

import { useTransition } from "react";

/**
 * Thin wrapper around React's useTransition for components that need to
 * know when a page-level transition is in flight (e.g. to show a spinner).
 */
export function usePageTransition() {
  const [isPending, startTransition] = useTransition();
  return { isLoading: isPending, startTransition };
}
