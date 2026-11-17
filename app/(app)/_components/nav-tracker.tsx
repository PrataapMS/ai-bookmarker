"use client";

import { addTransitionType, startTransition, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/*
 * Tracks in-app navigation so back links can use real history, and decides
 * how back/forward (popstate) navigations animate:
 *
 * - Traversals the app starts itself (back links, section switches that step
 *   back in history) carry the transition types they ask for, e.g. a
 *   'nav-back' slide.
 * - The installed Android app's system back gets the 'nav-back' slide, like a
 *   native app.
 * - Anywhere else, back/forward is the browser's: iOS and Safari swipe
 *   gestures (and Chrome's on Android) already animate the page, so ours is
 *   switched off to avoid a second animation and a flash of the old screen.
 */

let currentUrl: string | null = null;
let previousUrl: string | null = null;
// Set by popstate, consumed when the new URL lands: after a traversal the
// previous URL isn't known (it may have been forward or back).
let pendingTraverse = false;
let arrivedByTraverse = false;
let ownTraverse: { types: string[]; at: number } | null = null;
let animationTimer: ReturnType<typeof setTimeout> | undefined;

function urlOf(pathname: string, search: string) {
  const query = new URLSearchParams(search).toString();
  return query ? `${pathname}?${query}` : pathname;
}

function isAndroidStandalone() {
  return (
    /Android/i.test(navigator.userAgent) &&
    window.matchMedia("(display-mode: standalone)").matches
  );
}

/** The URL (path + query) shown before this one, if it's known. */
export function previousInAppUrl(): string | null {
  return arrivedByTraverse ? null : previousUrl;
}

/**
 * Runs a history traversal the app started itself (history.back(),
 * navigation.traverseTo…), giving it these view-transition types.
 */
export function traverseWith(types: string[], traverse: () => void) {
  ownTraverse = { types, at: Date.now() };
  traverse();
}

function suppressAnimations() {
  const root = document.documentElement;
  root.dataset.vt = "off";
  clearTimeout(animationTimer);
  animationTimer = setTimeout(() => delete root.dataset.vt, 1000);
}

function onPopState(event: PopStateEvent) {
  // Not a Next.js history entry: the router reloads the page itself.
  if (!(event.state as { __NA?: unknown } | null)?.__NA) return;
  const own = ownTraverse && Date.now() - ownTraverse.at < 1000 ? ownTraverse.types : null;
  ownTraverse = null;
  // Same screen (e.g. the Android exit guard entry): nothing to animate.
  const sameScreen = urlOf(location.pathname, location.search) === currentUrl;
  if (!sameScreen) pendingTraverse = true;
  const types =
    own ?? (sameScreen ? [] : isAndroidStandalone() ? ["nav-back"] : null);
  if (types === null) {
    suppressAnimations();
  } else if (types.length > 0) {
    // Runs after the router's own popstate listener has scheduled the
    // restore, so these types join that same transition.
    startTransition(() => types.forEach((t) => addTransitionType(t)));
  }
}

export function NavTracker() {
  const pathname = usePathname();
  const search = useSearchParams().toString();

  useEffect(() => {
    const url = urlOf(pathname, search);
    if (url === currentUrl) return;
    previousUrl = currentUrl;
    currentUrl = url;
    arrivedByTraverse = pendingTraverse;
    pendingTraverse = false;
  }, [pathname, search]);

  useEffect(() => {
    // Registered after this commit's effects, so it runs after the router's
    // popstate listener (see onPopState).
    const timer = setTimeout(() => window.addEventListener("popstate", onPopState), 0);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  return null;
}
