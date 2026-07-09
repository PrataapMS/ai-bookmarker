import { ViewTransition } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import {
  retryBookmark,
  deleteBookmark,
  promoteActionItem,
  toggleBookmarkVisibility,
  addBookmarkTag,
  removeBookmarkTag,
} from "@/app/actions/bookmarks";
import { StatusBadge } from "../../_components/status-badge";
import { StatusPoller } from "../../_components/status-poller";
import { PageTransition } from "../../_components/page-transition";
import { VoteButtons } from "../../_components/vote-buttons";

export const dynamic = "force-dynamic";
// Retry re-runs fetch + summarize via after(); allow the platform maximum.
export const maxDuration = 300;

export default async function BookmarkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  // Owners see their own bookmarks; public ones are readable by anyone signed in.
  const bookmark = await prisma.bookmark.findFirst({
    where: { id, OR: [{ userId: user.id }, { isPublic: true }] },
    include: {
      takeaways: { orderBy: { order: "asc" } },
      actionItems: { orderBy: { order: "asc" } },
      votes: { select: { userId: true, value: true } },
      user: { select: { email: true } },
    },
  });
  if (!bookmark) notFound();

  const isOwner = bookmark.userId === user.id;
  const score = bookmark.votes.reduce((sum, v) => sum + v.value, 0);
  const myVote = bookmark.votes.find((v) => v.userId === user.id)?.value ?? 0;

  const retry = retryBookmark.bind(null, bookmark.id);
  const remove = deleteBookmark.bind(null, bookmark.id);
  const toggleVisibility = toggleBookmarkVisibility.bind(null, bookmark.id);
  const addTag = addBookmarkTag.bind(null, bookmark.id);

  return (
    <PageTransition>
    <div className="space-y-6">
      <StatusPoller active={bookmark.status === "pending"} />

      <div>
        <Link
          href={isOwner ? "/bookmarks" : "/feed"}
          transitionTypes={["nav-back"]}
          className="text-sm text-muted hover:text-foreground"
        >
          ← {isOwner ? "All bookmarks" : "Back to feed"}
        </Link>
      </div>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={bookmark.status} />
          {bookmark.contentType && (
            <span className="text-xs text-muted capitalize">
              {bookmark.contentType}
            </span>
          )}
          <span className="text-xs text-muted">
            · saved {formatDate(bookmark.createdAt)}
          </span>
          {!isOwner && (
            <span className="text-xs text-muted">
              · by {bookmark.user.email.split("@")[0]}
            </span>
          )}
        </div>
        <ViewTransition name={`bm-title-${bookmark.id}`} share="morph" default="none">
          <h1 className="text-2xl font-semibold tracking-tight">
            {bookmark.title ?? bookmark.url}
          </h1>
        </ViewTransition>
        <a
          href={bookmark.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block break-all text-sm text-accent hover:underline"
        >
          {bookmark.url} ↗
        </a>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <VoteButtons bookmarkId={bookmark.id} score={score} myVote={myVote} />
          {isOwner ? (
            <form action={toggleVisibility}>
              <button
                type="submit"
                title={
                  bookmark.isPublic
                    ? "Anyone signed in can see this in the feed. Click to make it private."
                    : "Only you can see this. Click to share it in the feed."
                }
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  bookmark.isPublic
                    ? "border-accent/40 bg-accent/10 text-accent hover:bg-accent/20"
                    : "border-border bg-surface text-muted hover:text-foreground"
                }`}
              >
                <span aria-hidden>{bookmark.isPublic ? "🌐" : "🔒"}</span>
                {bookmark.isPublic ? "Public — in the feed" : "Private — only you"}
                <span className="text-muted">· switch</span>
              </button>
            </form>
          ) : (
            <span className="text-xs text-muted">🌐 Public bookmark</span>
          )}
        </div>
      </header>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          🏷️ Tags
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {bookmark.tags.length === 0 && (
            <p className="text-sm text-muted">
              {isOwner
                ? "No tags yet — add one below, or they'll be suggested automatically when the summary runs."
                : "No tags."}
            </p>
          )}
          {bookmark.tags.map((tag) => {
            const removeTag = removeBookmarkTag.bind(null, bookmark.id, tag);
            return (
              <span
                key={tag}
                className="flex items-center gap-1 rounded-full bg-background px-2.5 py-1 text-xs font-medium"
              >
                #{tag}
                {isOwner && (
                  <form action={removeTag} className="flex">
                    <button
                      type="submit"
                      aria-label={`Remove tag ${tag}`}
                      className="ml-0.5 text-muted transition hover:text-red-600 dark:hover:text-red-400"
                    >
                      ✕
                    </button>
                  </form>
                )}
              </span>
            );
          })}
        </div>
        {isOwner && (
          <form action={addTag} className="mt-3 flex gap-2">
            <input
              name="tag"
              type="text"
              maxLength={30}
              placeholder="Add a tag…"
              className="w-40 rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
            <button
              type="submit"
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium transition hover:border-accent/50"
            >
              Add
            </button>
          </form>
        )}
      </section>

      {bookmark.status === "pending" && (
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-border border-t-accent" />
          <p className="font-medium">Reading and summarizing…</p>
          <p className="mt-1 text-sm text-muted">
            This usually takes a few seconds. The page will update on its own.
          </p>
        </div>
      )}

      {bookmark.status === "failed" && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6">
          <p className="font-medium text-red-600 dark:text-red-400">
            Couldn&apos;t summarize this link
          </p>
          <p className="mt-1 text-sm text-red-600/90 dark:text-red-400/90">
            {bookmark.error}
          </p>
          {isOwner && (
            <form action={retry} className="mt-4">
              <button
                type="submit"
                className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium transition hover:bg-background"
              >
                Try again
              </button>
            </form>
          )}
        </div>
      )}

      {bookmark.status === "ready" && (
        <>
          <section className="rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
              Summary
            </h2>
            <p className="leading-relaxed">{bookmark.summary}</p>
          </section>

          {bookmark.takeaways.length > 0 && (
            <section className="rounded-xl border border-border bg-surface p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
                💡 Key takeaways
              </h2>
              <ul className="space-y-2">
                {bookmark.takeaways.map((t) => (
                  <li key={t.id} className="flex gap-2.5 text-sm leading-relaxed">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    <span>{t.text}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
              ✅ Action items
            </h2>
            {bookmark.actionItems.length === 0 ? (
              <p className="text-sm text-muted">
                No action items suggested for this piece.
              </p>
            ) : (
              <ul className="space-y-2">
                {bookmark.actionItems.map((a) => {
                  const promote = promoteActionItem.bind(null, a.id);
                  return (
                    <li
                      key={a.id}
                      className="flex items-start justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5"
                    >
                      <span className="text-sm leading-relaxed">{a.text}</span>
                      {isOwner &&
                        (a.promotedToTodo ? (
                          <span className="shrink-0 whitespace-nowrap text-xs text-emerald-600 dark:text-emerald-400">
                            ✓ In todos
                          </span>
                        ) : (
                          <form action={promote} className="shrink-0">
                            <button
                              type="submit"
                              className="whitespace-nowrap rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-accent-fg transition hover:opacity-90"
                            >
                              + Add to todos
                            </button>
                          </form>
                        ))}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}

      {isOwner && (
        <div className="border-t border-border pt-4">
          <form action={remove}>
            <button
              type="submit"
              className="text-sm text-muted transition hover:text-red-600 dark:hover:text-red-400"
            >
              Delete bookmark
            </button>
          </form>
        </div>
      )}
    </div>
    </PageTransition>
  );
}
