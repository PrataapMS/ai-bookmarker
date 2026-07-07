import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AddBookmarkForm } from "./_components/add-bookmark-form";
import { StatusBadge } from "./_components/status-badge";
import { StatusPoller } from "./_components/status-poller";

export const dynamic = "force-dynamic";
// Fetch + extract + summarize can take a while; allow the action (and its
// after() work) the platform maximum.
export const maxDuration = 300;

export default async function BookmarksPage() {
  const user = await requireUser();

  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { takeaways: true, actionItems: true } },
    },
  });

  const anyPending = bookmarks.some((b) => b.status === "pending");

  return (
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
        {bookmarks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
            <p className="text-3xl">📚</p>
            <p className="mt-2 font-medium">No bookmarks yet</p>
            <p className="mt-1 text-sm text-muted">
              Paste a link above to save your first read.
            </p>
          </div>
        ) : (
          bookmarks.map((b) => (
            <Link
              key={b.id}
              href={`/bookmarks/${b.id}`}
              className="block rounded-xl border border-border bg-surface p-4 transition hover:border-accent/50 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate font-medium">
                    {b.title ?? b.url}
                  </h2>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {b.siteName ?? new URL(b.url).hostname}
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

              {b.status === "ready" && (
                <div className="mt-3 flex gap-4 text-xs text-muted">
                  <span>💡 {b._count.takeaways} takeaways</span>
                  <span>✅ {b._count.actionItems} action items</span>
                </div>
              )}
            </Link>
          ))
        )}
      </section>
    </div>
  );
}
