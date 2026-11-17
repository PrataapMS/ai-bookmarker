"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Processing worst case is ~255s (see lib/process-bookmark.ts); stop a little
// after that so a lost bookmark can never keep the page busy forever.
const GIVE_UP_MS = 5 * 60 * 1000;

/**
 * While bookmarks are processing, check their status with a lightweight
 * fetch and refresh the page once, when one finishes. Checks back off
 * (2s up to 8s), pause while the app is in the background, and never overlap,
 * so the page stays responsive however slow the server is.
 */
export function StatusPoller({ pendingIds }: { pendingIds: string[] }) {
  const router = useRouter();
  const key = pendingIds.join(",");

  useEffect(() => {
    if (!key) return;
    const started = Date.now();
    let delay = 2000;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    async function check() {
      if (stopped) return;
      if (document.visibilityState !== "visible") return; // resumes on visibilitychange
      try {
        const res = await fetch(`/api/bookmarks/status?ids=${encodeURIComponent(key)}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const { pending } = (await res.json()) as { pending: string[] };
          if (pending.length < key.split(",").length) {
            stopped = true;
            router.refresh();
            return;
          }
        }
      } catch {
        // Offline or a blip: just try again later.
      }
      if (Date.now() - started > GIVE_UP_MS) {
        stopped = true;
        router.refresh();
        return;
      }
      delay = Math.min(delay * 1.5, 8000);
      schedule();
    }

    function schedule() {
      clearTimeout(timer);
      timer = setTimeout(check, delay);
    }

    function onVisible() {
      if (document.visibilityState === "visible" && !stopped) {
        delay = 2000;
        schedule();
      }
    }

    schedule();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [key, router]);

  return null;
}
