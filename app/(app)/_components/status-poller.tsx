"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * While a bookmark is still processing, refresh the current route periodically
 * so the summary appears without a manual reload.
 */
export function StatusPoller({
  active,
  intervalMs = 2500,
}: {
  active: boolean;
  intervalMs?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs, router]);

  return null;
}
