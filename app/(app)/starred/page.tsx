import { ViewTransition } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, readingTime } from "@/lib/format";
import { TagFilterDropdown } from "../_components/tag-filter-dropdown";
import { PageTransition } from "../_components/page-transition";
import { StarButton } from "../_components/star-button";
import { StatusBadge } from "../_components/status-badge";

export const dynamic = "force-dynamic";

type Scope = "all" | "mine" | "community";

const VISIBLE_CARD_TAGS = 3;

function starredHref(scope: Scope, tag?: string): string {
  const params = new URLSearchParams();
  if (scope !== "all") params.set("scope", scope);
  if (tag) params.set("tag", tag);
  const qs = params.toString();
  return qs ? `/starred?${qs}` : "/starred";
}

export default async function StarredPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; scope?: string }>;
}) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const scope: Scope =
    params.scope === "mine" ? "mine" : params.scope === "community" ? "community" : "all";

  // A public bookmark you starred that its owner later made private drops out
  // here (the star row stays, so it comes back if they re-share it).
  const stars = await prisma.star.findMany({
    where: {
      userId: user.id,
      bookmark: { OR: [{ userId: user.id }, { isPublic: true }] },
    },
    orderBy: { createdAt: "desc" },
    include: {
      bookmark: {
        include: {
          user: { select: { email: true } },
          _count: { select: { takeaways: true, stars: true } },
        },
      },
    },
  });

  const tagCounts = new Map<string, number>();
  for (const { bookmark: b } of stars)
    for (const t of b.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
  const allTags = [...tagCounts]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const activeTag = params.tag && tagCounts.has(params.tag) ? params.tag : undefined;

  const mineCount = stars.filter((s) => s.bookmark.userId === user.id).length;
  const visible = stars.filter(({ bookmark: b }) => {
    const mine = b.userId === user.id;
    if (scope === "mine" && !mine) return false;
    if (scope === "community" && mine) return false;
    return !activeTag || b.tags.includes(activeTag);
  });

  const returnHref = starredHref(scope, activeTag);

  const scopeTab = (value: Scope, label: string, count: number) => (
    <Link
      href={starredHref(value, activeTag)}
      aria-current={scope === value ? "page" : undefined}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
        scope === value
          ? "bg-accent text-accent-fg"
          : "text-muted hover:bg-surface hover:text-foreground"
      }`}
    >
      {label}
      {count > 0 && (
        <span
          className={`rounded-full px-1.5 text-xs ${
            scope === value ? "bg-accent-fg/20" : "bg-surface"
          }`}
        >
          {count}
        </span>
      )}
    </Link>
  );

  return (
    <PageTransition>
      <div className="space-y-6">
        <section>
          <h1 className="mb-1 text-xl font-semibold tracking-tight">
            <span className="gradient-text">Starred</span> ⭐
          </h1>
          <p className="text-sm text-muted">
            Your hall of fame. Only you can see what you&apos;ve starred, from
            your own saves or the feed.
          </p>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-xl border border-border bg-background p-1">
            {scopeTab("all", "All", stars.length)}
            {scopeTab("mine", "🔖 Mine", mineCount)}
            {scopeTab("community", "🌐 Feed", stars.length - mineCount)}
          </div>
          <TagFilterDropdown tags={allTags} activeTag={activeTag} />
        </div>

        <ViewTransition
          key={`${scope}:${activeTag ?? "all"}`}
          name="starred-list"
          share="auto"
          default="none"
        >
          <div className="space-y-3">
            {visible.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
                <p className="text-3xl">✨</p>
                <p className="mt-2 font-medium">
                  {stars.length === 0 ? "No stars yet" : "Nothing starred here"}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {stars.length === 0 ? (
                    <>
                      Tap the ☆ on anything that slaps, in{" "}
                      <Link href="/bookmarks" className="text-accent hover:underline">
                        your bookmarks
                      </Link>{" "}
                      or{" "}
                      <Link href="/feed" className="text-accent hover:underline">
                        the feed
                      </Link>
                      .
                    </>
                  ) : (
                    "Try another tab or tag."
                  )}
                </p>
              </div>
            ) : (
              visible.map(({ bookmark: b, createdAt: starredAt }, i) => {
                const mine = b.userId === user.id;
                const minutes = readingTime(b.wordCount);
                return (
                  <article
                    key={b.id}
                    className="card-in group relative rounded-xl border border-border bg-surface p-4 transition hover:border-amber-400/60 hover:shadow-sm"
                    style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
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
                          <h2 className="truncate font-medium">{b.title ?? b.url}</h2>
                        </ViewTransition>
                        <p className="mt-0.5 truncate text-xs text-muted">
                          {b.siteName ?? new URL(b.url).hostname} · starred{" "}
                          {formatDate(starredAt)} · by{" "}
                          {mine ? "you" : b.user.email.split("@")[0]}
                        </p>
                      </div>
                      <span className="flex shrink-0 items-center gap-2">
                        {b.status !== "ready" && <StatusBadge status={b.status} />}
                        <span className="relative z-10">
                          <StarButton
                            bookmarkId={b.id}
                            starred
                            count={b.isPublic ? b._count.stars : undefined}
                          />
                        </span>
                      </span>
                    </div>

                    {b.status === "ready" && b.summary && (
                      <p className="mt-2 line-clamp-2 text-sm text-muted">{b.summary}</p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
                      <span>{b.isPublic ? "🌐 Public" : "🔒 Private"}</span>
                      {b.tags.length > 0 && (
                        <span className="flex flex-wrap gap-1.5">
                          {b.tags.slice(0, VISIBLE_CARD_TAGS).map((t) => (
                            <span key={t} className="rounded-full bg-background px-2 py-0.5">
                              #{t}
                            </span>
                          ))}
                          {b.tags.length > VISIBLE_CARD_TAGS && (
                            <span className="rounded-full bg-background px-2 py-0.5">
                              +{b.tags.length - VISIBLE_CARD_TAGS} more
                            </span>
                          )}
                        </span>
                      )}
                      {minutes && <span>🕐 {minutes}</span>}
                      {b.status === "ready" && <span>💡 {b._count.takeaways} takeaways</span>}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </ViewTransition>
      </div>
    </PageTransition>
  );
}
