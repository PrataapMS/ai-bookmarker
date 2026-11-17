"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSectionNavigate } from "./app-history";
import { NAV_ITEMS } from "./nav-items";

// Ignore touches starting this close to the screen edge: that's where the
// Android back gesture lives.
const EDGE_PX = 24;
const COMMIT_PX = 80;
const FLICK_PX = 40;
const FLICK_SPEED = 0.4; // px per ms

/**
 * Swipe left/right on a section's main screen (Bookmarks, Feed, Starred,
 * Todos) to move to the next/previous one, like tabs in a native app. The
 * content follows the finger a little, with a rubber band at either end.
 * Detail pages don't swipe.
 */
export function SectionSwipe({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const navigate = useSectionNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const index = NAV_ITEMS.findIndex((item) => item.href === pathname);

  useEffect(() => {
    const el = ref.current;
    if (!el || index < 0) return;

    let start: { x: number; y: number; t: number } | null = null;
    let axis: "x" | "y" | null = null;
    let dx = 0;

    const settle = () => {
      el.style.transition = "transform 200ms ease-out";
      el.style.transform = "";
      start = null;
    };

    const onStart = (e: TouchEvent) => {
      start = null;
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      if (t.clientX < EDGE_PX || t.clientX > window.innerWidth - EDGE_PX) return;
      const target = e.target as Element | null;
      if (target?.closest("input, textarea, select, [contenteditable], [data-no-swipe]")) return;
      start = { x: t.clientX, y: t.clientY, t: e.timeStamp };
      axis = null;
      dx = 0;
    };

    const onMove = (e: TouchEvent) => {
      if (!start) return;
      const t = e.touches[0];
      const mx = t.clientX - start.x;
      const my = t.clientY - start.y;
      if (!axis) {
        if (Math.abs(mx) < 10 && Math.abs(my) < 10) return;
        axis = Math.abs(mx) > Math.abs(my) * 1.2 ? "x" : "y";
      }
      if (axis !== "x") return;
      dx = mx;
      const hasNeighbour = mx < 0 ? index < NAV_ITEMS.length - 1 : index > 0;
      el.style.transition = "none";
      el.style.transform = `translateX(${mx * (hasNeighbour ? 0.35 : 0.1)}px)`;
    };

    const onEnd = (e: TouchEvent) => {
      if (!start || axis !== "x") {
        start = null;
        return;
      }
      const speed = Math.abs(dx) / Math.max(1, e.timeStamp - start.t);
      const next = NAV_ITEMS[dx < 0 ? index + 1 : index - 1];
      settle();
      if (next && (Math.abs(dx) > COMMIT_PX || (Math.abs(dx) > FLICK_PX && speed > FLICK_SPEED))) {
        navigate(next.href, [dx < 0 ? "nav-forward" : "nav-back"]);
      }
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: true });
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("touchcancel", settle, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", settle);
      el.style.transform = "";
    };
  }, [index, navigate]);

  // pan-y hands horizontal drags to us instead of the browser.
  return (
    <div ref={ref} className={index >= 0 ? "touch-pan-y" : undefined}>
      {children}
    </div>
  );
}
