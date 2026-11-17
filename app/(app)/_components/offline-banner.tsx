"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/** Tells the user they're looking at saved copies while the device is offline. */
export function OfflineBanner() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  if (online) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-14 z-40 mx-auto w-fit max-w-[calc(100%-2rem)] rounded-b-xl border border-t-0 border-border bg-surface px-4 py-1.5 text-center text-xs font-medium text-muted shadow md:top-0"
    >
      📡 Offline: showing saved pages. Changes need a connection.
    </div>
  );
}
