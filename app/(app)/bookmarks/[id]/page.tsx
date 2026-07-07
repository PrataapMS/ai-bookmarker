import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  retryBookmark,
  deleteBookmark,
  promoteActionItem,
} from "@/app/actions/bookmarks";
import { StatusBadge } from "../../_components/status-badge";
import { StatusPoller } from "../../_components/status-poller";

export const dynamic = "force-dynamic";

export default async function BookmarkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const bookmark = await prisma.bookmark.findFirst({
    where: { id, userId: user.id },
    include: {
      takeaways: { orderBy: { order: "asc" } },
      actionItems: { orderBy: { order: "asc" } },
    },
  });
  if (!bookmark) notFound();

  const retry = retryBookmark.bind(null, bookmark.id);
  const remove = deleteBookmark.bind(null, bookmark.id);

  return (
    <div className="space-y-6">
      <StatusPoller active={bookmark.status === "pending"} />

      <div>
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          ← All bookmarks
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
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {bookmark.title ?? bookmark.url}
        </h1>
        <a
          href={bookmark.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block break-all text-sm text-accent hover:underline"
        >
          {bookmark.url} ↗
        </a>
      </header>

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
          <form action={retry} className="mt-4">
            <button
              type="submit"
              className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium transition hover:bg-background"
            >
              Try again
            </button>
          </form>
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
                      {a.promotedToTodo ? (
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
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}

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
    </div>
  );
}
