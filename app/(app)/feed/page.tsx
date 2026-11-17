import { ViewTransition } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { feedTagCounts, fetchListPage, type FeedSort, type ListQuery } from "@/lib/lists";
import { getTimeZone } from "@/lib/timezone";
import { TagFilterDropdown } from "../_components/tag-filter-dropdown";
import { PageTransition } from "../_components/page-transition";
import { LiveData } from "../_components/live-data";
import { DensityToggle } from "../_components/density-toggle";
import { InfiniteList } from "../_components/infinite-list";
import { listHref, renderListItems } from "../_components/bookmark-card";
import { surpriseMe } from "@/app/actions/stars";
import { loadListPage } from "@/app/actions/lists";

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; sort?: string }>;
}) {
  const [user, params, timeZone] = await Promise.all([
    requireUser(),
    searchParams,
    getTimeZone(),
  ]);
  const sort: FeedSort = params.sort === "new" ? "new" : "top";

  // Only finished public bookmarks are listed; pending/failed ones have
  // nothing to read yet.
  const [allTags, firstTry] = await Promise.all([
    feedTagCounts(),
    fetchListPage(user.id, { kind: "feed", sort, tag: params.tag }, null),
  ]);
  const activeTag =
    params.tag && allTags.some((t) => t.name === params.tag) ? params.tag : undefined;
  const query: ListQuery = { kind: "feed", sort, tag: activeTag };
  const first =
    params.tag && !activeTag ? await fetchListPage(user.id, query, null) : firstTry;

  const surprise = surpriseMe.bind(null, "feed" as const);

  const sortTab = (value: FeedSort, label: string) => (
    <Link
      href={listHref({ kind: "feed", sort: value, tag: activeTag })}
      aria-current={sort === value ? "page" : undefined}
      className={`flex flex-1 items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition sm:flex-none sm:py-1.5 ${
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
        <LiveData />
        <section>
          <h1 className="mb-1 text-xl font-semibold tracking-tight">Feed</h1>
          <p className="text-sm text-muted">
            What everyone&apos;s reading rn. Upvote the bangers, ⭐ star the
            keepers, and make your own bookmarks public to join the chat.
          </p>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full gap-1 rounded-xl border border-border bg-background p-1 sm:w-auto">
            {sortTab("top", "🔥 Top")}
            {sortTab("new", "🕐 New")}
          </div>
          <div className="flex items-center justify-between gap-2 sm:justify-start">
            <form action={surprise}>
              <button
                type="submit"
                title="Open a random pick you haven't seen"
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

        {/* Crossfade the list when the tag filter or sort changes (same route). */}
        <ViewTransition
          key={`${sort}:${activeTag ?? "all"}`}
          name="feed-list"
          share="auto"
          default="none"
        >
          <InfiniteList
            key={`${sort}:${activeTag ?? "all"}`}
            initialItems={renderListItems(first.items, query, user.id, timeZone)}
            initialCursor={first.nextCursor}
            loadMore={loadListPage.bind(null, query)}
            empty={
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
            }
          />
        </ViewTransition>
      </div>
    </PageTransition>
  );
}
