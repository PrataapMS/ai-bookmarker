"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { traverseWith } from "./nav-tracker";

/*
 * Native-style back navigation for the installed Android app.
 *
 * In a browser tab, every screen visited stays in history, so the back button
 * replays them all. Installed apps should instead behave like a native app:
 *
 * - Switching tabs doesn't stack history, so back from a tab returns to the
 *   screen the app started on, and back from there exits.
 * - Navigating to a screen that's already in history (e.g. "All bookmarks"
 *   from a bookmark, or a redirect after deleting one) steps back to it
 *   instead of piling on a duplicate.
 * - Back on the start screen asks before exiting. A guard entry (a copy of
 *   the start screen) sits on top of the first one; pressing back lands on the
 *   real first entry, where the prompt shows and one more back closes the app.
 *
 * Only active in the installed Android app (the only place with a system back
 * button that can exit) and only where the Navigation API exists; elsewhere
 * the browser's own behaviour is untouched.
 */

type NavEntry = { key: string; index: number; url: string | null };
type NavigationLike = EventTarget & {
  currentEntry: NavEntry | null;
  entries(): NavEntry[];
  traverseTo(key: string): { finished: Promise<unknown> };
};
type EntryChangeEvent = Event & {
  navigationType: "push" | "replace" | "reload" | "traverse" | null;
  from: NavEntry;
};

const GUARD_KEY_STORAGE = "app-history-guard";

function getNavigation(): NavigationLike | null {
  if (typeof window === "undefined") return null;
  if (!/Android/i.test(navigator.userAgent)) return null;
  if (!window.matchMedia("(display-mode: standalone)").matches) return null;
  return (window as unknown as { navigation?: NavigationLike }).navigation ?? null;
}

function readGuardKey(): string | null {
  try {
    return sessionStorage.getItem(GUARD_KEY_STORAGE);
  } catch {
    return null;
  }
}

function writeGuardKey(key: string) {
  try {
    sessionStorage.setItem(GUARD_KEY_STORAGE, key);
  } catch {}
}

function sameUrl(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  const ua = new URL(a, location.href);
  const ub = new URL(b, location.href);
  return ua.pathname === ub.pathname && ua.search === ub.search;
}

/** The entry back presses unwind to: the guard when armed, else the first. */
function rootIndex(nav: NavigationLike): number {
  return nav.entries()[1]?.key === readGuardKey() ? 1 : 0;
}

/** The most recent entry behind the current one showing `url`, if any. */
function findEarlier(nav: NavigationLike, url: string): NavEntry | null {
  const entries = nav.entries();
  const current = nav.currentEntry?.index ?? 0;
  for (let i = current - 1; i >= 0; i--) {
    if (sameUrl(entries[i].url, url)) return entries[i];
  }
  return null;
}

/**
 * Steps back to an earlier entry. The page is restored from the router cache
 * and refreshes its own data in the background (see RefreshOnRevisit).
 */
function stepBackTo(nav: NavigationLike, entry: NavEntry, transitionTypes: string[] = []) {
  traverseWith(transitionTypes, () => {
    nav.traverseTo(entry.key).finished.catch(() => {});
  });
}

/**
 * Navigates to a top-level section. In the installed Android app the first
 * step away from the start screen is a normal push (so back returns to it);
 * from there, section switches replace the current screen instead of
 * stacking, and a section already in history is stepped back to. Elsewhere
 * it's a plain push.
 */
export function useSectionNavigate() {
  const router = useRouter();
  return useCallback(
    (href: string, transitionTypes: string[] = []) => {
      if (sameUrl(href, location.href)) return;
      const nav = getNavigation();
      if (!nav?.currentEntry) {
        router.push(href, { transitionTypes });
        return;
      }
      const earlier = findEarlier(nav, href);
      if (earlier) stepBackTo(nav, earlier, transitionTypes);
      else if (nav.currentEntry.index <= rootIndex(nav)) router.push(href, { transitionTypes });
      else router.replace(href, { transitionTypes });
    },
    [router],
  );
}

/** Click handler for section links; leaves modified clicks (new tab…) alone. */
export function useSectionLinkClick() {
  const navigate = useSectionNavigate();
  return useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string, transitionTypes?: string[]) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      navigate(href, transitionTypes);
    },
    [navigate],
  );
}

export function AppHistory() {
  const [exitPrompt, setExitPrompt] = useState<"closed" | "open" | "closeFailed">(
    "closed",
  );
  const promptOpen = useRef(false);

  const armGuard = useCallback(() => {
    const nav = getNavigation();
    if (!nav?.currentEntry || nav.currentEntry.index !== 0) return;
    window.history.pushState(null, "", location.href);
    if (nav.currentEntry) writeGuardKey(nav.currentEntry.key);
  }, []);

  useEffect(() => {
    const nav = getNavigation();
    if (!nav) return;

    // Chrome's back button skips history entries added without a user
    // gesture, so the guard is only pushed from inside one.
    const onGesture = () => {
      if (!promptOpen.current) armGuard();
    };

    const onEntryChange = (event: Event) => {
      const { navigationType, from } = event as EntryChangeEvent;
      const current = nav.currentEntry;
      if (!current) return;

      if (navigationType === "traverse") {
        if (current.index === 0 && from?.key === readGuardKey()) {
          promptOpen.current = true;
          setExitPrompt("open");
        }
        return;
      }

      if (navigationType === "push") {
        // Deferred: this fires mid-pushState, inside the router's own update.
        setTimeout(() => {
          const now = nav.currentEntry;
          if (!now?.url || now.key === readGuardKey()) return;
          const earlier = findEarlier(nav, now.url);
          if (earlier) stepBackTo(nav, earlier);
        }, 0);
      }
    };

    window.addEventListener("pointerup", onGesture, true);
    window.addEventListener("keydown", onGesture, true);
    nav.addEventListener("currententrychange", onEntryChange);
    return () => {
      window.removeEventListener("pointerup", onGesture, true);
      window.removeEventListener("keydown", onGesture, true);
      nav.removeEventListener("currententrychange", onEntryChange);
    };
  }, [armGuard]);

  const stay = () => {
    promptOpen.current = false;
    setExitPrompt("closed");
    armGuard();
  };

  const exit = () => {
    window.close();
    // Closing a window the script didn't open isn't always allowed; if the
    // app is still here, the system back button will do it.
    setTimeout(() => setExitPrompt("closeFailed"), 300);
  };

  if (exitPrompt === "closed") return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={stay}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="exit-prompt-title"
        aria-describedby="exit-prompt-body"
        className="w-full max-w-sm rounded-xl border border-border bg-surface p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="exit-prompt-title" className="text-base font-semibold">
          Exit BookmarkAI?
        </h2>
        <p id="exit-prompt-body" className="mt-1 text-sm text-muted">
          {exitPrompt === "closeFailed"
            ? "Press back again to close the app."
            : "Press back again, or tap Exit, to close the app."}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            autoFocus
            onClick={stay}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition hover:bg-background"
          >
            Stay
          </button>
          <button
            type="button"
            onClick={exit}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition hover:opacity-90"
          >
            Exit
          </button>
        </div>
      </div>
    </div>
  );
}
