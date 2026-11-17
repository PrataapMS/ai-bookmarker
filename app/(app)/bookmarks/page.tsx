import { ViewTransition } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, readingMinutes, readingTime } from "@/lib/format";
import { AddBookmarkForm } from "../_components/add-bookmark-form";
import { StatusBadge } from "../_components/status-badge";
import { StatusPoller } from "../_components/status-poller";
import { TagFilterDropdown } from "../_components/tag-filter-dropdown";
import { ReadToggle } from "../_components/read-toggle";
import { PageTransition } from "../_components/page-transition";
import { StarButton } from "../_components/star-button";
import { ReadingStats, type ReadEntry } from "../_components/reading-stats";
import { surpriseMe } from "@/app/actions/stars";

export const dynamic = "force-dynamic";
// Fetch + extract + summarize can take a while; allow the action (and its
// after() work) the platform maximum.
export const maxDuration = 300;

const VISIBLE_CARD_TAGS = 3;

type View = "to-read" | "read" | "all";

function viewHref(view: View, tag?: string): string {
  const params = new URLSearchParams();
  if (view !== "to-read") params.set("view", view);
  if (tag) params.set("tag", tag);
  const qs = params.toString();
  return qs ? `/bookmarks?${qs}` : "/bookmarks";
}

export default async function BookmarksPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; view?: string }>;
}) {
  const [user, { tag, view: viewParam }] = await Promise.all([
    requireUser(),
    searchParams,
  ]);
  const view: View =
    viewParam === "read" ? "read" : viewParam === "all" ? "all" : "to-read";

  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { takeaways: true, actionItems: true } },
      votes: { select: { value: true } },
      stars: { where: { userId: user.id }, select: { id: true } },
    },
  });

  const tagCounts = new Map<string, number>();
  for (const b of bookmarks)
    for (const t of b.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
  const allTags = [...tagCounts]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const activeTag = tag && tagCounts.has(tag) ? tag : undefined;

  // "To read" = anything the reading queue still holds (unread), "Read" = done.
  const byView = bookmarks.filter((b) =>
    view === "read" ? b.readAt : view === "to-read" ? !b.readAt : true,
  );
  const visible = activeTag
    ? byView.filter((b) => b.tags.includes(activeTag))
    : byView;

  // The queue count only means things you can actually read now.
  const toReadCount = bookmarks.filter(
    (b) => !b.readAt && b.status === "ready",
  ).length;
  const readCount = bookmarks.filter((b) => b.readAt).length;

  const anyPending = bookmarks.some((b) => b.status === "pending");

  const reads: ReadEntry[] = bookmarks
    .filter((b) => b.readAt)
    .map((b) => ({
      readAt: b.readAt!.toISOString(),
      minutes: readingMinutes(b.wordCount),
    }));
  const surprise = surpriseMe.bind(null, "queue" as const);

  const viewTab = (value: View, label: string, count?: number) => (
    <Link
      href={viewHref(value, activeTag)}
      aria-current={view === value ? "page" : undefined}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
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

  const emptyCopy: Record<View, { title: string; hint: string }> = {
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
        <StatusPoller active={anyPending} />

        <section>
          <h1 className="mb-1 text-xl font-semibold tracking-tight">Bookmarks</h1>
          <p className="mb-4 text-sm text-muted">
            Drop a link, get the TL;DR. Your future self says thanks. 🫶
          </p>
          <AddBookmarkForm />
        </section>

        <ReadingStats reads={reads} />

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-1 rounded-xl border border-border bg-background p-1">
              {viewTab("to-read", "📖 To read", toReadCount)}
              {viewTab("read", "✓ Read", readCount)}
              {viewTab("all", "All")}
            </div>
            <div className="flex items-center gap-2">
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
            </div>
          </div>

          {/* Crossfade the list when the view or tag filter changes (same route). */}
          <ViewTransition
            key={`${view}:${activeTag ?? "all"}`}
            name="bookmark-list"
            share="auto"
            default="none"
          >
            <div className="space-y-3">
              {visible.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
                  <p className="text-3xl">📚</p>
                  <p className="mt-2 font-medium">{emptyCopy[view].title}</p>
                  <p className="mt-1 text-sm text-muted">{emptyCopy[view].hint}</p>
                </div>
              ) : (
                visible.map((b, i) => {
                  const score = b.votes.reduce((sum, v) => sum + v.value, 0);
                  const minutes = readingTime(b.wordCount);
                  const isRead = Boolean(b.readAt);
                  return (
                    <article
                      key={b.id}
                      className={`card-in group relative rounded-xl border border-border bg-surface p-4 transition hover:border-accent/50 hover:shadow-sm ${
                        isRead ? "opacity-70 hover:opacity-100" : ""
                      }`}
                      style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                    >
                      <Link
                        href={`/bookmarks/${b.id}`}
                        transitionTypes={["nav-forward"]}
                        aria-label={b.title ?? b.url}
                        className="absolute inset-0 z-0 rounded-xl"
                      />

                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <ViewTransition name={`bm-title-${b.id}`} share="morph" default="none">
                            <h2 className="truncate font-medium">
                              {b.title ?? b.url}
                            </h2>
                          </ViewTransition>
                          <p className="mt-0.5 truncate text-xs text-muted">
                            {b.siteName ?? new URL(b.url).hostname} · {formatDate(b.createdAt)}
                          </p>
                        </div>
                        <span className="flex shrink-0 items-center gap-1">
                          <StatusBadge status={b.status} />
                          <span className="relative z-10">
                            <StarButton bookmarkId={b.id} starred={b.stars.length > 0} />
                          </span>
                        </span>
                      </div>

                      {b.status === "ready" && b.summary && (
                        <p className="mt-2 line-clamp-2 text-sm text-muted">
                          {b.summary}
                        </p>
                      )}
                      {b.status === "failed" && (
                        <p className="mt-2 line-clamp-2 text-sm text-red-600 dark:text-red-400">
                          {b.error}
                        </p>
                      )}

                      {b.tags.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {b.tags.slice(0, VISIBLE_CARD_TAGS).map((t) => (
                            <span
                              key={t}
                              className="rounded-full bg-background px-2 py-0.5 text-xs text-muted"
                            >
                              #{t}
                            </span>
                          ))}
                          {b.tags.length > VISIBLE_CARD_TAGS && (
                            <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted">
                              +{b.tags.length - VISIBLE_CARD_TAGS} more
                            </span>
                          )}
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
                        <span title={b.isPublic ? "Visible in the public feed" : "Only you can see this"}>
                          {b.isPublic ? "🌐 Public" : "🔒 Private"}
                        </span>
                        {minutes && <span>🕐 {minutes}</span>}
                        {b.status === "ready" && (
                          <>
                            <span>💡 {b._count.takeaways} takeaways</span>
                            <span>✅ {b._count.actionItems} action items</span>
                          </>
                        )}
                        {b.isPublic && (
                          <span title="Feed score">▲ {score}</span>
                        )}
                        {b.status === "ready" && (
                          <span className="relative z-10 ml-auto">
                            <ReadToggle bookmarkId={b.id} read={isRead} />
                          </span>
                        )}
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </ViewTransition>
        </section>
      </div>
    </PageTransition>
  );
}
