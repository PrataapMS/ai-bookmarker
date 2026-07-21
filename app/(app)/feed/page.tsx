import { ViewTransition } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, readingTime } from "@/lib/format";
import { TagFilterDropdown } from "../_components/tag-filter-dropdown";
import { PageTransition } from "../_components/page-transition";
import { VoteButtons } from "../_components/vote-buttons";

export const dynamic = "force-dynamic";

type Sort = "top" | "new";

const VISIBLE_CARD_TAGS = 3;

function feedHref(tag: string | null, sort: Sort): string {
  const params = new URLSearchParams();
  if (tag) params.set("tag", tag);
  if (sort !== "top") params.set("sort", sort);
  const qs = params.toString();
  return qs ? `/feed?${qs}` : "/feed";
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; sort?: string }>;
}) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const sort: Sort = params.sort === "new" ? "new" : "top";

  // Only finished bookmarks are worth showing publicly; pending/failed ones
  // have nothing to read yet.
  const bookmarks = await prisma.bookmark.findMany({
    where: { isPublic: true, status: "ready" },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { email: true } },
      votes: { select: { userId: true, value: true } },
      _count: { select: { takeaways: true, actionItems: true } },
    },
  });

  const tagCounts = new Map<string, number>();
  for (const b of bookmarks)
    for (const t of b.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
  const allTags = [...tagCounts]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const activeTag =
    params.tag && tagCounts.has(params.tag) ? params.tag : undefined;

  const scored = bookmarks
    .filter((b) => !activeTag || b.tags.includes(activeTag))
    .map((b) => ({
      ...b,
      score: b.votes.reduce((sum, v) => sum + v.value, 0),
      myVote: b.votes.find((v) => v.userId === user.id)?.value ?? 0,
    }));

  if (sort === "top") {
    // Ties fall back to recency (findMany already returned newest first).
    scored.sort((a, b) => b.score - a.score);
  }

  // Carried through to the detail page so "back" returns to this exact
  // feed view (tag/sort included) instead of defaulting to /bookmarks.
  const returnHref = feedHref(activeTag ?? null, sort);

  const sortTab = (value: Sort, label: string) => (
    <Link
      href={feedHref(activeTag ?? null, value)}
      aria-current={sort === value ? "page" : undefined}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
        sort === value
          ? "bg-accent text-accent-fg"
          : "text-muted hover:bg-surface hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <PageTransition>
      <div className="space-y-6">
        <section>
          <h1 className="mb-1 text-xl font-semibold tracking-tight">Feed</h1>
          <p className="text-sm text-muted">
            Public bookmarks shared by everyone. Upvote the good ones — make your
            own bookmarks public to share them here.
          </p>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-xl border border-border bg-background p-1">
            {sortTab("top", "🔥 Top")}
            {sortTab("new", "🕐 New")}
          </div>
          <TagFilterDropdown tags={allTags} activeTag={activeTag} />
        </div>

        {/* Crossfade the list when the tag filter or sort changes (same route). */}
        <ViewTransition
          key={`${sort}:${activeTag ?? "all"}`}
          name="feed-list"
          share="auto"
          default="none"
        >
          <div>
            {scored.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
                <p className="text-3xl">🌐</p>
                <p className="mt-2 font-medium">
                  {activeTag ? `Nothing tagged #${activeTag} yet` : "The feed is empty"}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {activeTag
                    ? "Try another tag, or view everything."
                    : "Make one of your bookmarks public to get things started."}
                </p>
              </div>
            ) : (
              <section className="space-y-3">
                {scored.map((b) => (
                  <article
                    key={b.id}
                    className="group relative rounded-xl border border-border bg-surface p-4 transition hover:border-accent/50"
                  >
                    <Link
                      href={`/bookmarks/${b.id}?from=${encodeURIComponent(returnHref)}`}
                      transitionTypes={["nav-forward"]}
                      aria-label={b.title ?? b.url}
                      className="absolute inset-0 z-0 rounded-xl"
                    />

                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <ViewTransition name={`bm-title-${b.id}`} share="morph" default="none">
                          <h2 className="truncate font-medium group-hover:text-accent">
                            {b.title ?? b.url}
                          </h2>
                        </ViewTransition>
                        <p className="mt-0.5 truncate text-xs text-muted">
                          {b.siteName ?? new URL(b.url).hostname} ·{" "}
                          {formatDate(b.createdAt)} · by{" "}
                          {b.userId === user.id ? "you" : b.user.email.split("@")[0]}
                        </p>
                      </div>
                      <span className="relative z-10">
                        <VoteButtons bookmarkId={b.id} score={b.score} myVote={b.myVote} />
                      </span>
                    </div>

                    {b.summary && (
                      <p className="mt-2 line-clamp-3 text-sm text-muted">{b.summary}</p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
                      {b.tags.length > 0 && (
                        <span className="flex flex-wrap gap-1.5">
                          {b.tags.slice(0, VISIBLE_CARD_TAGS).map((t) => (
                            <Link
                              key={t}
                              href={feedHref(t, sort)}
                              className="relative z-10 rounded-full bg-background px-2 py-0.5 transition hover:text-accent"
                            >
                              #{t}
                            </Link>
                          ))}
                          {b.tags.length > VISIBLE_CARD_TAGS && (
                            <span className="rounded-full bg-background px-2 py-0.5">
                              +{b.tags.length - VISIBLE_CARD_TAGS} more
                            </span>
                          )}
                        </span>
                      )}
                      <span>💡 {b._count.takeaways} takeaways</span>
                      {readingTime(b.wordCount) && (
                        <span>🕐 {readingTime(b.wordCount)}</span>
                      )}
                      <span className="ml-auto font-medium text-accent group-hover:underline">
                        Read summary →
                      </span>
                    </div>
                  </article>
                ))}
              </section>
            )}
          </div>
        </ViewTransition>
      </div>
    </PageTransition>
  );
}
