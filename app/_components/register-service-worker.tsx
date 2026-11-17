"use client";

import { useEffect } from "react";

/**
 * Registers public/sw.js, which is what makes the app installable (and so
 * share-targetable) on Android.
 *
 * Production only: a service worker scoped to localhost:3000 would outlive
 * `next dev` and shadow anything else served on that port.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}
