"use client";

import { useLayoutEffect } from "react";
import { useRouter } from "next/navigation";

// Coming back to a screen within this long of its data being fetched shows it
// as is, with no network request: the app's own changes (server actions)
// already invalidate it, and bookmarks still processing poll on their own.
const FRESH_MS = 30_000;

// Render stamps already shown in this session, with when they first were
// (i.e. roughly when that data was fetched).
const shown = new Map<string, number>();
let awaitingRefresh = false;

/**
 * Stale-while-revalidate for screens: returning to a screen (switching tabs,
 * going back) shows the copy the router kept straight away and, if that data
 * is more than 30 seconds old, fetches fresh data in the background and
 * swaps it in without a loading state. A fresh render is left alone.
 *
 * Also marks the document as a revisit (html[data-revisit]) so list entry
 * animations don't replay on content that's already been seen.
 */
export function RefreshOnRevisit({ stamp }: { stamp: string }) {
  const router = useRouter();

  useLayoutEffect(() => {
    const root = document.documentElement;
    const firstShown = shown.get(stamp);
    if (firstShown === undefined) {
      shown.set(stamp, Date.now());
      // The background refresh landing re-renders the same cards: keep their
      // animations off. Any other fresh render is a new screen.
      if (awaitingRefresh) awaitingRefresh = false;
      else delete root.dataset.revisit;
      return;
    }
    // Shown again: a revisit (or React's dev-only double mount, which the
    // freshness window also covers).
    root.dataset.revisit = "";
    if (Date.now() - firstShown > FRESH_MS) {
      awaitingRefresh = true;
      router.refresh();
    }
  }, [stamp, router]);

  return null;
}
