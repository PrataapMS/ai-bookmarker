import { ViewTransition } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { AddBookmarkForm } from "../_components/add-bookmark-form";
import { StatusBadge } from "../_components/status-badge";
import { StatusPoller } from "../_components/status-poller";
import { TagFilterDropdown } from "../_components/tag-filter-dropdown";
import { PageTransition } from "../_components/page-transition";

export const dynamic = "force-dynamic";
// Fetch + extract + summarize can take a while; allow the action (and its
// after() work) the platform maximum.
export const maxDuration = 300;

const VISIBLE_CARD_TAGS = 3;

export default async function BookmarksPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const [user, { tag }] = await Promise.all([requireUser(), searchParams]);

  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { takeaways: true, actionItems: true } },
      votes: { select: { value: true } },
    },
  });

  const tagCounts = new Map<string, number>();
  for (const b of bookmarks)
    for (const t of b.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
  const allTags = [...tagCounts]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const activeTag = tag && tagCounts.has(tag) ? tag : undefined;
  const visible = activeTag
    ? bookmarks.filter((b) => b.tags.includes(activeTag))
    : bookmarks;

  const anyPending = bookmarks.some((b) => b.status === "pending");

  return (
    <PageTransition>
      <div className="space-y-8">
        <StatusPoller active={anyPending} />

        <section>
          <h1 className="mb-1 text-xl font-semibold tracking-tight">Bookmarks</h1>
          <p className="mb-4 text-sm text-muted">
            Save any article or blog post and get an instant summary.
          </p>
          <AddBookmarkForm />
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TagFilterDropdown tags={allTags} activeTag={activeTag} />
            {activeTag && (
              <p className="text-xs text-muted">
                {visible.length} of {bookmarks.length} bookmarks
              </p>
            )}
          </div>

          {/* Crossfade the list when the tag filter changes (same route). */}
          <ViewTransition
            key={activeTag ?? "all"}
            name="bookmark-list"
            share="auto"
            default="none"
          >
            <div className="space-y-3">
              {visible.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
                  <p className="text-3xl">📚</p>
                  <p className="mt-2 font-medium">
                    {activeTag ? `No bookmarks tagged #${activeTag}` : "No bookmarks yet"}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {activeTag
                      ? "Try another tag, or view all bookmarks."
                      : "Paste a link above to save your first read."}
                  </p>
                </div>
              ) : (
                visible.map((b) => {
                  const score = b.votes.reduce((sum, v) => sum + v.value, 0);
                  return (
                    <Link
                      key={b.id}
                      href={`/bookmarks/${b.id}`}
                      transitionTypes={["nav-forward"]}
                      className="block rounded-xl border border-border bg-surface p-4 transition hover:border-accent/50 hover:shadow-sm"
                    >
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
                        <StatusBadge status={b.status} />
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

                      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted">
                        <span title={b.isPublic ? "Visible in the public feed" : "Only you can see this"}>
                          {b.isPublic ? "🌐 Public" : "🔒 Private"}
                        </span>
                        {b.status === "ready" && (
                          <>
                            <span>💡 {b._count.takeaways} takeaways</span>
                            <span>✅ {b._count.actionItems} action items</span>
                          </>
                        )}
                        {b.isPublic && (
                          <span title="Feed score">▲ {score}</span>
                        )}
                      </div>
                    </Link>
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
