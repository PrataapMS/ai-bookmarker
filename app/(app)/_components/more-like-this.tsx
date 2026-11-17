import Link from "next/link";
import { cacheLife } from "next/cache";
import { prisma } from "@/lib/prisma";
import { readingMinutes } from "@/lib/format";

const MAX_SUGGESTIONS = 3;

// Suggestions don't need to be up to the second: cached for a few minutes
// per bookmark and viewer, so reopening a bookmark skips this query.
async function relatedCandidates(bookmarkId: string, tags: string[], userId: string) {
  "use cache";
  cacheLife("minutes");
  return prisma.bookmark.findMany({
    where: {
      id: { not: bookmarkId },
      status: "ready",
      tags: { hasSome: tags },
      OR: [{ userId }, { isPublic: true }],
    },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: {
      id: true,
      url: true,
      title: true,
      siteName: true,
      tags: true,
      wordCount: true,
      userId: true,
      readAt: true,
    },
  });
}

/**
 * "More like this": related bookmarks the viewer can open (their own, or any
 * public one) ranked by shared tags. Unread picks float above ones already
 * read, so the next click is something new.
 */
export async function MoreLikeThis({
  bookmarkId,
  tags,
  userId,
  from,
}: {
  bookmarkId: string;
  tags: string[];
  userId: string;
  from?: string;
}) {
  if (tags.length === 0) return null;

  const candidates = await relatedCandidates(bookmarkId, tags, userId);

  const tagSet = new Set(tags);
  const ranked = candidates
    .map((b) => ({
      ...b,
      overlap: b.tags.filter((t) => tagSet.has(t)).length,
      seen: b.userId === userId && b.readAt !== null,
    }))
    .sort((a, b) => Number(a.seen) - Number(b.seen) || b.overlap - a.overlap)
    .slice(0, MAX_SUGGESTIONS);

  if (ranked.length === 0) return null;

  const suffix = from ? `?from=${encodeURIComponent(from)}` : "";

  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        🧠 More like this
      </h2>
      <ul className="grid gap-2 sm:grid-cols-3">
        {ranked.map((b, i) => {
          const shared = b.tags.filter((t) => tagSet.has(t)).slice(0, 2);
          const minutes = readingMinutes(b.wordCount);
          return (
            <li key={b.id} className="card-in" style={{ animationDelay: `${i * 70}ms` }}>
              <Link
                href={`/bookmarks/${b.id}${suffix}`}
                transitionTypes={["nav-forward"]}
                className="flex h-full flex-col rounded-lg border border-border bg-background p-3 transition hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-md"
              >
                <span className="line-clamp-2 text-sm font-medium">
                  {b.title ?? b.url}
                </span>
                <span className="mt-1 truncate text-xs text-muted">
                  {b.siteName ?? new URL(b.url).hostname}
                </span>
                <span className="mt-auto flex flex-wrap gap-1 pt-2 text-[11px] text-muted">
                  {shared.map((t) => (
                    <span key={t} className="rounded-full bg-surface px-1.5 py-0.5">
                      #{t}
                    </span>
                  ))}
                  {minutes > 0 && <span className="px-0.5 py-0.5">🕐 {minutes} min</span>}
                  {b.seen && <span className="px-0.5 py-0.5">✓ read</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
