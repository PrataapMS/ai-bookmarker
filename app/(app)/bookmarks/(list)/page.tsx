import { ViewTransition } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readingMinutes } from "@/lib/format";
import { bookmarkTagCounts, fetchListPage, type BookmarksView, type ListQuery } from "@/lib/lists";
import { getTimeZone } from "@/lib/timezone";
import { AddBookmarkForm } from "@/app/(app)/_components/add-bookmark-form";
import { StatusPoller } from "@/app/(app)/_components/status-poller";
import { TagFilterDropdown } from "@/app/(app)/_components/tag-filter-dropdown";
import { PageTransition } from "@/app/(app)/_components/page-transition";
import { ReadingStats, type ReadEntry } from "@/app/(app)/_components/reading-stats";
import { DensityToggle } from "@/app/(app)/_components/density-toggle";
import { InfiniteList } from "@/app/(app)/_components/infinite-list";
import { listHref, renderListItems } from "@/app/(app)/_components/bookmark-card";
import { surpriseMe } from "@/app/actions/stars";
import { loadListPage } from "@/app/actions/lists";

export const dynamic = "force-dynamic";
// Fetch + extract + summarize can take a while; allow the action (and its
// after() work) the platform maximum.
export const maxDuration = 300;

export default async function BookmarksPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; view?: string }>;
}) {
  const [user, { tag, view: viewParam }, timeZone] = await Promise.all([
    requireUser(),
    searchParams,
    getTimeZone(),
  ]);
  const view: BookmarksView =
    viewParam === "read" ? "read" : viewParam === "all" ? "all" : "to-read";

  // Everything in one round of parallel queries; the list is fetched with the
  // requested tag up front and only refetched if that tag turns out not to exist.
  const [allTags, toReadCount, readCount, pending, readRows, firstTry] = await Promise.all([
    bookmarkTagCounts(user.id),
    // The queue count only means things you can actually read now.
    prisma.bookmark.count({ where: { userId: user.id, readAt: null, status: "ready" } }),
    prisma.bookmark.count({ where: { userId: user.id, readAt: { not: null } } }),
    prisma.bookmark.findMany({
      where: { userId: user.id, status: "pending" },
      select: { id: true },
      take: 20,
    }),
    prisma.bookmark.findMany({
      where: { userId: user.id, readAt: { not: null } },
      select: { readAt: true, wordCount: true },
    }),
    fetchListPage(user.id, { kind: "bookmarks", view, tag }, null),
  ]);

  const activeTag = tag && allTags.some((t) => t.name === tag) ? tag : undefined;
  const query: ListQuery = { kind: "bookmarks", view, tag: activeTag };
  const first =
    tag && !activeTag ? await fetchListPage(user.id, query, null) : firstTry;

  const reads: ReadEntry[] = readRows.map((b) => ({
    readAt: b.readAt!.toISOString(),
    minutes: readingMinutes(b.wordCount),
  }));
  const surprise = surpriseMe.bind(null, "queue" as const);

  const viewTab = (value: BookmarksView, label: string, count?: number) => (
    <Link
      href={listHref({ kind: "bookmarks", view: value, tag: activeTag })}
      aria-current={view === value ? "page" : undefined}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition sm:flex-none sm:py-1.5 ${
        view === value
          ? "bg-accent text-accent-fg"
          : "text-muted hover:bg-surface hover:text-foreground"
      }`}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span
          className={`rounded-full px-1.5 text-xs ${
            view === value ? "bg-accent-fg/20" : "bg-surface"
          }`}
        >
          {count}
        </span>
      )}
    </Link>
  );

  const emptyCopy: Record<BookmarksView, { title: string; hint: string }> = {
    "to-read": {
      title: activeTag ? `Nothing tagged #${activeTag} to read` : "Queue cleared. Main character energy ✨",
      hint: activeTag
        ? "Try another tag, or view all bookmarks."
        : "Paste a link above, or hit 🎲 Surprise me to find something in the feed.",
    },
    read: {
      title: activeTag ? `Nothing tagged #${activeTag} read yet` : "Nothing read yet",
      hint: "Mark a bookmark as read and it'll land here (and start your 🔥 streak).",
    },
    all: {
      title: activeTag ? `No bookmarks tagged #${activeTag}` : "No bookmarks yet",
      hint: activeTag
        ? "Try another tag, or view all bookmarks."
        : "Paste a link above to save your first read.",
    },
  };

  return (
    <PageTransition>
      <div className="space-y-8">
        <StatusPoller pendingIds={pending.map((b) => b.id)} />

        <section>
          <h1 className="mb-1 text-xl font-semibold tracking-tight">Bookmarks</h1>
          <p className="mb-4 text-sm text-muted">
            Drop a link, get the TL;DR. Your future self says thanks. 🫶
          </p>
          <AddBookmarkForm />
        </section>

        <ReadingStats reads={reads} />

        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex w-full gap-1 rounded-xl border border-border bg-background p-1 sm:w-auto">
              {viewTab("to-read", "📖 To read", toReadCount)}
              {viewTab("read", "✓ Read", readCount)}
              {viewTab("all", "All")}
            </div>
            <div className="flex items-center justify-between gap-2 sm:justify-start">
              <form action={surprise}>
                <button
                  type="submit"
                  title="Open a random unread pick"
                  className="dice-btn flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted transition hover:border-accent/50 hover:text-foreground"
                >
                  <span className="dice" aria-hidden>🎲</span>
                  Surprise me
                </button>
              </form>
              <TagFilterDropdown tags={allTags} activeTag={activeTag} />
              <DensityToggle />
            </div>
          </div>

          {/* Crossfade the list when the view or tag filter changes (same route). */}
          <ViewTransition
            key={`${view}:${activeTag ?? "all"}`}
            name="bookmark-list"
            share="auto"
            default="none"
          >
            <InfiniteList
              key={`${view}:${activeTag ?? "all"}`}
              initialItems={renderListItems(first.items, query, user.id, timeZone)}
              initialCursor={first.nextCursor}
              loadMore={loadListPage.bind(null, query)}
              empty={
                <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
                  <p className="text-3xl">📚</p>
                  <p className="mt-2 font-medium">{emptyCopy[view].title}</p>
                  <p className="mt-1 text-sm text-muted">{emptyCopy[view].hint}</p>
                </div>
              }
            />
          </ViewTransition>
        </section>
      </div>
    </PageTransition>
  );
}
