import { ViewTransition } from "react";
import Link from "next/link";
import { dateGroup, formatShortDate, readingMinutes } from "@/lib/format";
import type { ListItem, ListQuery } from "@/lib/lists";
import { ReadToggle } from "./read-toggle";
import { StarButton } from "./star-button";
import { StatusBadge } from "./status-badge";
import { VoteButtons } from "./vote-buttons";
import type { RenderedItem } from "./infinite-list";

/*
 * One card design for every list. It renders both densities at once and the
 * `compact:` variant (set by DensityToggle on <html>) hides what a compact row
 * doesn't show, so switching density is instant and needs no refetch.
 */

const VISIBLE_TAGS = 3;
const MEDALS = ["🥇", "🥈", "🥉"];

function withParams(path: string, params: Record<string, string | undefined>): string {
  const qs = new URLSearchParams(
    Object.entries(params).filter((e): e is [string, string] => Boolean(e[1])),
  ).toString();
  return qs ? `${path}?${qs}` : path;
}

/** URL of a list with the given filters (defaults are left out of the URL). */
export function listHref(query: ListQuery): string {
  switch (query.kind) {
    case "bookmarks":
      return withParams("/bookmarks", {
        view: query.view === "to-read" ? undefined : query.view,
        tag: query.tag,
      });
    case "feed":
      return withParams("/feed", {
        tag: query.tag,
        sort: query.sort === "top" ? undefined : query.sort,
      });
    case "starred":
      return withParams("/starred", {
        scope: query.scope === "all" ? undefined : query.scope,
        tag: query.tag,
      });
  }
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function BookmarkCard({
  item,
  query,
  userId,
  timeZone,
  index,
}: {
  item: ListItem;
  query: ListQuery;
  userId: string;
  timeZone: string;
  index: number;
}) {
  const b = item.bookmark;
  const mine = b.userId === userId;
  const isRead = Boolean(b.readAt);
  const minutes = readingMinutes(b.wordCount);
  // Feed and Starred pass their filters along so the bookmark's back link
  // returns to the same view; your own list is the default back target.
  const href =
    query.kind === "bookmarks"
      ? `/bookmarks/${b.id}`
      : `/bookmarks/${b.id}?from=${encodeURIComponent(listHref(query))}`;
  const medal =
    query.kind === "feed" &&
    query.sort === "top" &&
    item.rank !== undefined &&
    item.rank < MEDALS.length &&
    (item.score ?? 0) > 0
      ? MEDALS[item.rank]
      : null;

  const meta = [
    b.siteName ?? hostname(b.url),
    minutes ? `${minutes} min` : null,
    query.kind === "starred" ? `starred ${formatShortDate(item.listedAt, timeZone)}` : formatShortDate(item.listedAt, timeZone),
    query.kind !== "bookmarks" ? `by ${mine ? "you" : b.user.email.split("@")[0]}` : null,
  ].filter(Boolean);

  const tagLinks = b.tags.slice(0, VISIBLE_TAGS);
  const footerAction =
    query.kind === "bookmarks" && b.status === "ready" ? (
      <ReadToggle bookmarkId={b.id} read={isRead} />
    ) : query.kind === "feed" ? (
      <VoteButtons bookmarkId={b.id} score={item.score ?? 0} myVote={item.myVote ?? 0} />
    ) : null;

  return (
    <article
      className={`card-in group relative rounded-xl border border-border bg-surface px-4 py-3.5 transition hover:border-accent/50 hover:shadow-sm sm:px-5 sm:py-4 compact:rounded-lg compact:px-3 compact:py-2.5 ${
        query.kind === "bookmarks" && isRead ? "opacity-70 hover:opacity-100" : ""
      }`}
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      <Link
        href={href}
        transitionTypes={["nav-forward"]}
        aria-label={b.title ?? b.url}
        className="absolute inset-0 z-0 rounded-xl compact:rounded-lg"
      />

      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <ViewTransition name={`bm-title-${b.id}`} share="morph" default="none">
            <h2 className="line-clamp-2 font-medium leading-snug compact:line-clamp-1 compact:text-sm">
              {medal && (
                <span className="mr-1.5" title={`#${item.rank! + 1} on the feed`}>
                  {medal}
                </span>
              )}
              {b.title ?? hostname(b.url)}
            </h2>
          </ViewTransition>
          <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-muted compact:mt-0.5">
            {b.status !== "ready" && <StatusBadge status={b.status} />}
            {mine && !b.isPublic && (
              <span title="Private: only you can see this" aria-label="Private">
                🔒
              </span>
            )}
            <span className="truncate">{meta.join(" · ")}</span>
            {query.kind === "feed" && (
              <span className="hidden shrink-0 tabular-nums compact:inline" title="Feed score">
                ▲ {item.score ?? 0}
              </span>
            )}
          </div>
        </div>
        <span className="relative z-10 -mr-1.5 -mt-0.5 shrink-0">
          <StarButton
            bookmarkId={b.id}
            starred={b.stars.length > 0}
            count={b.isPublic && query.kind !== "bookmarks" ? b._count.stars : undefined}
          />
        </span>
      </div>

      {b.status === "ready" && b.summary && (
        <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-muted compact:hidden">
          {b.summary}
        </p>
      )}
      {b.status === "failed" && b.error && (
        <p className="mt-2.5 line-clamp-2 text-sm text-red-600 compact:hidden dark:text-red-400">
          {b.error}
        </p>
      )}

      {(tagLinks.length > 0 || footerAction) && (
        <div className="mt-3 flex items-center justify-between gap-3 compact:hidden">
          <div className="flex min-w-0 flex-wrap gap-1.5 text-xs text-muted">
            {tagLinks.map((t) => (
              <Link
                key={t}
                href={listHref({ ...query, tag: t })}
                className="relative z-10 rounded-full bg-background px-2 py-0.5 transition hover:text-accent"
              >
                #{t}
              </Link>
            ))}
            {b.tags.length > VISIBLE_TAGS && (
              <span className="rounded-full bg-background px-2 py-0.5">
                +{b.tags.length - VISIBLE_TAGS}
              </span>
            )}
          </div>
          {footerAction && <span className="relative z-10 shrink-0">{footerAction}</span>}
        </div>
      )}
    </article>
  );
}

/** Server-rendered cards for the infinite list, with their section headings. */
export function renderListItems(
  items: ListItem[],
  query: ListQuery,
  userId: string,
  timeZone: string,
): RenderedItem[] {
  // The ranked feed isn't in date order, so it has no date sections.
  const grouped = !(query.kind === "feed" && query.sort === "top");
  const now = new Date();
  return items.map((item, i) => ({
    id: item.bookmark.id,
    group: grouped ? dateGroup(item.listedAt, timeZone, now) : null,
    node: (
      <BookmarkCard
        item={item}
        query={query}
        userId={userId}
        timeZone={timeZone}
        index={i}
      />
    ),
  }));
}
