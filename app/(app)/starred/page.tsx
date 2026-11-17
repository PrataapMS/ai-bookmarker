import { ViewTransition } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import {
  fetchListPage,
  starredCount,
  starredTagCounts,
  type ListQuery,
  type StarredScope,
} from "@/lib/lists";
import { getTimeZone } from "@/lib/timezone";
import { TagFilterDropdown } from "../_components/tag-filter-dropdown";
import { PageTransition } from "../_components/page-transition";
import { DensityToggle } from "../_components/density-toggle";
import { InfiniteList } from "../_components/infinite-list";
import { listHref, renderListItems } from "../_components/bookmark-card";
import { loadListPage } from "@/app/actions/lists";

export const dynamic = "force-dynamic";

export default async function StarredPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; scope?: string }>;
}) {
  const [user, params, timeZone] = await Promise.all([
    requireUser(),
    searchParams,
    getTimeZone(),
  ]);
  const scope: StarredScope =
    params.scope === "mine" ? "mine" : params.scope === "community" ? "community" : "all";

  // A public bookmark you starred that its owner later made private drops out
  // here (the star row stays, so it comes back if they re-share it).
  const [allTags, totalCount, mineCount, firstTry] = await Promise.all([
    starredTagCounts(user.id),
    starredCount(user.id, "all"),
    starredCount(user.id, "mine"),
    fetchListPage(user.id, { kind: "starred", scope, tag: params.tag }, null),
  ]);
  const activeTag =
    params.tag && allTags.some((t) => t.name === params.tag) ? params.tag : undefined;
  const query: ListQuery = { kind: "starred", scope, tag: activeTag };
  const first =
    params.tag && !activeTag ? await fetchListPage(user.id, query, null) : firstTry;

  const scopeTab = (value: StarredScope, label: string, count: number) => (
    <Link
      href={listHref({ kind: "starred", scope: value, tag: activeTag })}
      aria-current={scope === value ? "page" : undefined}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition sm:flex-none sm:py-1.5 ${
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

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full gap-1 rounded-xl border border-border bg-background p-1 sm:w-auto">
            {scopeTab("all", "All", totalCount)}
            {scopeTab("mine", "🔖 Mine", mineCount)}
            {scopeTab("community", "🌐 Feed", totalCount - mineCount)}
          </div>
          <div className="flex items-center justify-end gap-2">
            <TagFilterDropdown tags={allTags} activeTag={activeTag} />
            <DensityToggle />
          </div>
        </div>

        <ViewTransition
          key={`${scope}:${activeTag ?? "all"}`}
          name="starred-list"
          share="auto"
          default="none"
        >
          <InfiniteList
            key={`${scope}:${activeTag ?? "all"}`}
            initialItems={renderListItems(first.items, query, user.id, timeZone)}
            initialCursor={first.nextCursor}
            loadMore={loadListPage.bind(null, query)}
            empty={
              <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
                <p className="text-3xl">✨</p>
                <p className="mt-2 font-medium">
                  {totalCount === 0 ? "No stars yet" : "Nothing starred here"}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {totalCount === 0 ? (
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
            }
          />
        </ViewTransition>
      </div>
    </PageTransition>
  );
}
