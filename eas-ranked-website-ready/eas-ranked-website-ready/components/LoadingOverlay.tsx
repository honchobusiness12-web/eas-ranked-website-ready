"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function LoadingOverlay() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    // Kick off the progress bar on every route change
    setActive(true);
    setWidth(0);

    // Animate to ~80% quickly, then finish on next tick
    const t1 = requestAnimationFrame(() => setWidth(72));
    const t2 = setTimeout(() => setWidth(100), 200);
    const t3 = setTimeout(() => setActive(false), 420);

    return () => {
      cancelAnimationFrame(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [pathname]);

  if (!active) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "2px",
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${width}%`,
          background: "linear-gradient(90deg, #7C3AED, #4F8EF7, #00D4FF)",
          transition: width === 100 ? "width 0.18s ease-out" : "width 0.2s ease-in",
          boxShadow: "0 0 8px rgba(168,85,247,0.7)",
          borderRadius: "0 999px 999px 0",
        }}
      />
    </div>
  );
}
