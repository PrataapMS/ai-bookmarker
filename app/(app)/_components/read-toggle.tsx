"use client";

import { useState, useTransition, type CSSProperties } from "react";
import { setBookmarkRead } from "@/app/actions/bookmarks";

// Confetti particles that fan out of the check circle on completion. Each has
// its own flight vector (--tx/--ty), spin, and colour for a lively burst.
const CONFETTI: { tx: string; ty: string; rot: string; color: string; round: boolean }[] = [
  { tx: "-18px", ty: "-16px", rot: "140deg", color: "#10b981", round: false },
  { tx: "16px", ty: "-18px", rot: "-120deg", color: "#6366f1", round: true },
  { tx: "22px", ty: "2px", rot: "90deg", color: "#f59e0b", round: false },
  { tx: "14px", ty: "18px", rot: "-160deg", color: "#ec4899", round: true },
  { tx: "-6px", ty: "22px", rot: "60deg", color: "#10b981", round: false },
  { tx: "-20px", ty: "10px", rot: "-90deg", color: "#f59e0b", round: true },
  { tx: "4px", ty: "-22px", rot: "45deg", color: "#6366f1", round: false },
  { tx: "-14px", ty: "-6px", rot: "-45deg", color: "#ec4899", round: true },
];

/**
 * Owner-only toggle for a bookmark's reading lifecycle, styled as an emerald
 * check-circle so it reads as "complete" rather than a settings switch.
 *
 * It's a client component: the read state flips optimistically on click and a
 * celebration (pop + ring-burst + tick draw + confetti) plays only when marking
 * as read. The server value reconciles afterwards via `setBookmarkRead`'s
 * revalidation.
 *
 * `variant="detail"` is a labelled pill for the bookmark header; `variant="card"`
 * is a compact version for list/feed cards (keep it in a `relative z-10` wrapper
 * there so clicks don't fall through to the card's overlay link).
 */
export function ReadToggle({
  bookmarkId,
  read: serverRead,
  variant = "card",
}: {
  bookmarkId: string;
  read: boolean;
  variant?: "card" | "detail";
}) {
  const [read, setRead] = useState(serverRead);
  const [pending, startTransition] = useTransition();
  const [celebrate, setCelebrate] = useState(false);

  // Reconcile when the server value genuinely changes (navigation to another
  // bookmark, an edit elsewhere) — without clobbering the optimistic flip.
  const [prevServer, setPrevServer] = useState(serverRead);
  if (prevServer !== serverRead) {
    setPrevServer(serverRead);
    setRead(serverRead);
  }

  function toggle() {
    const next = !read;
    setRead(next);
    setCelebrate(next); // only celebrate the transition into "read"
    startTransition(() => setBookmarkRead(bookmarkId, next));
  }

  const detail = variant === "detail";
  const label = read ? "Read" : detail ? "Mark as read" : "Mark read";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={read}
      title={read ? "Read — click to move it back to your queue" : "Mark as read"}
      className={[
        "relative inline-flex select-none items-center gap-2 rounded-full font-medium shadow-sm transition-colors",
        detail ? "px-3.5 py-1.5 text-sm" : "px-2.5 py-1 text-xs",
        celebrate ? "read-pop" : "",
        read
          ? "border border-emerald-600 bg-emerald-600 text-white shadow-emerald-600/25 hover:bg-emerald-700"
          : "border border-emerald-500/60 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300",
        pending ? "opacity-70" : "",
      ].join(" ")}
    >
      <span
        className={[
          "relative flex items-center justify-center rounded-full border-2 transition-colors",
          detail ? "h-5 w-5" : "h-4 w-4",
          read
            ? "border-white bg-white text-emerald-600"
            : "border-emerald-600/70 text-emerald-600 dark:border-emerald-400/70 dark:text-emerald-400",
        ].join(" ")}
      >
        {celebrate && (
          <>
            <span
              className="read-burst pointer-events-none absolute inset-0 rounded-full ring-2 ring-emerald-400"
              onAnimationEnd={() => setCelebrate(false)}
            />
            {CONFETTI.map((p, i) => (
              <span
                key={i}
                aria-hidden
                className={`read-confetti pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 ${
                  p.round ? "rounded-full" : "rounded-[1px]"
                }`}
                style={
                  {
                    backgroundColor: p.color,
                    "--tx": p.tx,
                    "--ty": p.ty,
                    "--rot": p.rot,
                  } as CSSProperties
                }
              />
            ))}
          </>
        )}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={detail ? "h-3.5 w-3.5" : "h-3 w-3"}
          aria-hidden
        >
          <path
            d="M5 13l4 4L19 7"
            className={read ? (celebrate ? "read-check" : "") : "opacity-0"}
          />
        </svg>
      </span>
      {label}
    </button>
  );
}
