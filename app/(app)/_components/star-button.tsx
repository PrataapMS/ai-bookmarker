"use client";

import { useState, useTransition, type CSSProperties } from "react";
import { setStarred } from "@/app/actions/stars";

// Sparkles that shoot out of the star when it's switched on.
const SPARKLES: { tx: string; ty: string; color: string; delay: string }[] = [
  { tx: "0px", ty: "-20px", color: "#f59e0b", delay: "0ms" },
  { tx: "18px", ty: "-8px", color: "#ec4899", delay: "30ms" },
  { tx: "12px", ty: "16px", color: "#facc15", delay: "60ms" },
  { tx: "-12px", ty: "16px", color: "#8b5cf6", delay: "30ms" },
  { tx: "-18px", ty: "-8px", color: "#f97316", delay: "60ms" },
  { tx: "9px", ty: "-17px", color: "#facc15", delay: "90ms" },
  { tx: "-9px", ty: "-17px", color: "#ec4899", delay: "90ms" },
];

function StarIcon({ filled, className }: { filled: boolean; className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 2.8l2.85 5.78 6.38.93-4.62 4.5 1.09 6.35L12 17.36l-5.7 3 1.09-6.35-4.62-4.5 6.38-.93L12 2.8z" />
    </svg>
  );
}

/**
 * Personal star toggle. Optimistic like ReadToggle: flips instantly, plays a
 * sparkle burst when starring, and reconciles via `setStarred`'s revalidation.
 *
 * `count` (optional) shows how many people starred it; pass it only for public
 * bookmarks. `variant="card"` is a compact icon button (wrap it in a
 * `relative z-10` element on cards so clicks don't hit the card overlay link);
 * `variant="detail"` is a labelled pill.
 */
export function StarButton({
  bookmarkId,
  starred: serverStarred,
  count: serverCount,
  variant = "card",
}: {
  bookmarkId: string;
  starred: boolean;
  count?: number;
  variant?: "card" | "detail";
}) {
  const [starred, setLocal] = useState(serverStarred);
  const [pending, startTransition] = useTransition();
  const [celebrate, setCelebrate] = useState(false);

  const [prevServer, setPrevServer] = useState(serverStarred);
  if (prevServer !== serverStarred) {
    setPrevServer(serverStarred);
    setLocal(serverStarred);
  }

  // Shift the server count by our own optimistic change.
  const count =
    serverCount === undefined
      ? undefined
      : Math.max(0, serverCount + Number(starred) - Number(serverStarred));

  function toggle() {
    const next = !starred;
    setLocal(next);
    setCelebrate(next);
    startTransition(() => setStarred(bookmarkId, next));
  }

  const detail = variant === "detail";
  const label = starred ? "Unstar" : "Star";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={starred}
      aria-label={label}
      title={starred ? "Starred: click to remove from your stars" : "Star it: save to your Starred list"}
      className={[
        "relative inline-flex select-none items-center gap-1.5 rounded-full font-medium transition-colors",
        detail ? "border px-3 py-1.5 text-xs" : "px-1.5 py-1 text-xs",
        starred
          ? detail
            ? "border-amber-400/60 bg-amber-400/15 text-amber-600 dark:text-amber-300"
            : "text-amber-500"
          : detail
            ? "border-border bg-surface text-muted hover:border-amber-400/60 hover:text-amber-600 dark:hover:text-amber-300"
            : "text-muted hover:bg-amber-400/10 hover:text-amber-500",
        pending ? "opacity-80" : "",
      ].join(" ")}
    >
      <span className={`relative flex ${celebrate ? "star-pop" : ""}`}>
        <StarIcon filled={starred} className={detail ? "h-4 w-4" : "h-[18px] w-[18px]"} />
        {celebrate && (
          <>
            <span
              aria-hidden
              className="star-ring pointer-events-none absolute inset-0 rounded-full ring-2 ring-amber-400"
              onAnimationEnd={() => setCelebrate(false)}
            />
            {SPARKLES.map((s, i) => (
              <span
                key={i}
                aria-hidden
                className="star-sparkle pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full"
                style={
                  {
                    backgroundColor: s.color,
                    "--tx": s.tx,
                    "--ty": s.ty,
                    animationDelay: s.delay,
                  } as CSSProperties
                }
              />
            ))}
          </>
        )}
      </span>
      {detail && (starred ? "Starred" : "Star")}
      {count !== undefined && count > 0 && (
        <span className="tabular-nums">{count}</span>
      )}
    </button>
  );
}
