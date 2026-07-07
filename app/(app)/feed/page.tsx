import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { TagFilterBar } from "../_components/tag-filter-bar";
import { VoteButtons } from "../_components/vote-buttons";

export const dynamic = "force-dynamic";

type Sort = "top" | "new";

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

  const allTags = [...new Set(bookmarks.flatMap((b) => b.tags))].sort();
  const activeTag =
    params.tag && allTags.includes(params.tag) ? params.tag : undefined;

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
      </div>

      <TagFilterBar
        tags={allTags}
        activeTag={activeTag}
        hrefFor={(t) => feedHref(t, sort)}
      />

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
              className="rounded-xl border border-border bg-surface p-4 transition hover:border-accent/50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/bookmarks/${b.id}`} className="group block">
                    <h2 className="truncate font-medium group-hover:text-accent">
                      {b.title ?? b.url}
                    </h2>
                  </Link>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {b.siteName ?? new URL(b.url).hostname} ·{" "}
                    {formatDate(b.createdAt)} · by{" "}
                    {b.userId === user.id ? "you" : b.user.email.split("@")[0]}
                  </p>
                </div>
                <VoteButtons bookmarkId={b.id} score={b.score} myVote={b.myVote} />
              </div>

              {b.summary && (
                <p className="mt-2 line-clamp-3 text-sm text-muted">{b.summary}</p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
                {b.tags.length > 0 && (
                  <span className="flex flex-wrap gap-1.5">
                    {b.tags.map((t) => (
                      <Link
                        key={t}
                        href={feedHref(t, sort)}
                        className="rounded-full bg-background px-2 py-0.5 transition hover:text-accent"
                      >
                        #{t}
                      </Link>
                    ))}
                  </span>
                )}
                <span>💡 {b._count.takeaways} takeaways</span>
                <Link
                  href={`/bookmarks/${b.id}`}
                  className="ml-auto font-medium text-accent hover:underline"
                >
                  Read summary →
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
