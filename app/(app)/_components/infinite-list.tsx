"use client";

import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from "react";

export type RenderedItem = { id: string; group: string | null; node: ReactNode };
export type LoadMore = (
  cursor: string,
  limit?: number,
) => Promise<{ items: RenderedItem[]; nextCursor: string | null }>;

/**
 * The server renders the first page; this appends further pages (rendered by
 * the `loadMore` server action) as the end of the list nears the viewport.
 *
 * Whenever the server re-renders the first page (after a vote, marking
 * something read, a new bookmark arriving), the already-loaded pages are
 * fetched again from the new first page's cursor, so they're up to date and
 * rows are never duplicated or skipped. Until that refill lands, rows already
 * shown on the first page are hidden from the loaded pages.
 */
export function InfiniteList({
  initialItems,
  initialCursor,
  loadMore,
  empty,
}: {
  initialItems: RenderedItem[];
  initialCursor: string | null;
  loadMore: LoadMore;
  empty: ReactNode;
}) {
  const [extra, setExtra] = useState<RenderedItem[]>([]);
  // Cursor for the next page after `extra`; undefined = continue from the first page.
  const [extraCursor, setExtraCursor] = useState<string | null | undefined>(undefined);
  const [renderedFirstPage, setRenderedFirstPage] = useState(initialItems);
  const [refill, setRefill] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const busy = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);

  // A new first page means the server re-rendered (after a vote, a status
  // change, a new bookmark…), so pages loaded here may be stale too.
  if (renderedFirstPage !== initialItems) {
    setRenderedFirstPage(initialItems);
    if (extra.length > 0) {
      if (initialCursor) setRefill(extra.length);
      else {
        setExtra([]);
        setExtraCursor(undefined);
      }
    }
  }

  const nextCursor = extraCursor === undefined ? initialCursor : extraCursor;

  const fetchPage = useCallback(
    async (cursor: string) => {
      if (busy.current) return;
      busy.current = true;
      setStatus("loading");
      try {
        const page = await loadMore(cursor);
        setExtra((prev) => [...prev, ...page.items]);
        setExtraCursor(page.nextCursor);
        setStatus("idle");
      } catch {
        setStatus("error");
      } finally {
        busy.current = false;
      }
    },
    [loadMore],
  );

  // Refill: re-fetch the pages already shown, from the new first page onward.
  // Waits for any in-flight page load (it re-runs when `status` settles).
  useEffect(() => {
    if (refill === 0 || !initialCursor || status !== "idle" || busy.current) return;
    busy.current = true;
    let cancelled = false;
    loadMore(initialCursor, refill)
      .then(
        (page) => {
          if (cancelled) return;
          setExtra(page.items);
          setExtraCursor(page.nextCursor);
          setRefill(0);
        },
        () => {
          if (!cancelled) setStatus("error");
        },
      )
      .finally(() => {
        busy.current = false;
      });
    return () => {
      cancelled = true;
    };
  }, [refill, initialCursor, status, loadMore]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !nextCursor || status !== "idle" || refill > 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void fetchPage(nextCursor);
      },
      // Start loading well before the end so scrolling rarely has to wait.
      { rootMargin: "800px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [nextCursor, status, refill, fetchPage]);

  const seen = new Set(initialItems.map((i) => i.id));
  const items = [...initialItems, ...extra.filter((i) => !seen.has(i.id))];

  if (items.length === 0) return <>{empty}</>;

  return (
    <div>
      <div className="space-y-3 compact:space-y-1.5">
        {items.map((item, i) => {
          const heading = item.group && item.group !== items[i - 1]?.group ? item.group : null;
          return (
            <Fragment key={item.id}>
              {heading && (
                <h3 className="sticky top-14 z-20 -mx-1 bg-background/90 px-1 pb-1.5 pt-3 text-xs font-semibold uppercase tracking-wider text-muted backdrop-blur first:pt-0 md:top-0">
                  {heading}
                </h3>
              )}
              {item.node}
            </Fragment>
          );
        })}
      </div>

      <div ref={sentinel} className="flex justify-center py-6 text-sm text-muted">
        {status === "loading" && (
          <span className="flex items-center gap-2" role="status">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Loading more…
          </span>
        )}
        {status === "error" && (
          <button
            type="button"
            // Back to idle re-arms the pending refill or the scroll sentinel.
            onClick={() => setStatus("idle")}
            className="rounded-lg border border-border px-3 py-1.5 hover:bg-surface"
          >
            Couldn&apos;t load more. Retry
          </button>
        )}
        {status === "idle" && !nextCursor && items.length > 10 && (
          <span>You&apos;ve reached the end ✨</span>
        )}
      </div>
    </div>
  );
}
