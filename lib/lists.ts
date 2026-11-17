import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

/*
 * Paged queries behind the Bookmarks, Feed and Starred lists.
 *
 * Lists only ever load what a card shows (never `rawText`, the full extracted
 * article) and only one page at a time. Tag and tab counts are aggregated in
 * Postgres instead of by loading every row.
 */

export const PAGE_SIZE = 20;
/** Upper bound for a single fetch (a refill after the first page shifts). */
export const MAX_FETCH = 200;

export type BookmarksView = "to-read" | "read" | "all";
export type FeedSort = "top" | "new";
export type StarredScope = "all" | "mine" | "community";

export type ListQuery =
  | { kind: "bookmarks"; view: BookmarksView; tag?: string }
  | { kind: "feed"; sort: FeedSort; tag?: string }
  | { kind: "starred"; scope: StarredScope; tag?: string };

function cardSelect(userId: string) {
  return {
    id: true,
    url: true,
    title: true,
    siteName: true,
    status: true,
    error: true,
    summary: true,
    tags: true,
    wordCount: true,
    readAt: true,
    isPublic: true,
    createdAt: true,
    userId: true,
    user: { select: { email: true } },
    stars: { where: { userId }, select: { id: true } },
    _count: { select: { stars: true } },
  } satisfies Prisma.BookmarkSelect;
}

export type CardBookmark = Prisma.BookmarkGetPayload<{
  select: ReturnType<typeof cardSelect>;
}>;

export type ListItem = {
  bookmark: CardBookmark;
  /** The date the list is ordered (and grouped) by. */
  listedAt: Date;
  /** Feed only. */
  score?: number;
  myVote?: number;
  /** Zero-based position in the ranked "top" feed. */
  rank?: number;
};

export type ListPage = { items: ListItem[]; nextCursor: string | null };

/** Rejects anything a client could send that isn't a real filter value. */
export function parseListQuery(raw: unknown): ListQuery | null {
  if (!raw || typeof raw !== "object") return null;
  const q = raw as Record<string, unknown>;
  const tag = typeof q.tag === "string" && q.tag ? q.tag : undefined;
  if (q.kind === "bookmarks" && ["to-read", "read", "all"].includes(q.view as string))
    return { kind: "bookmarks", view: q.view as BookmarksView, tag };
  if (q.kind === "feed" && ["top", "new"].includes(q.sort as string))
    return { kind: "feed", sort: q.sort as FeedSort, tag };
  if (q.kind === "starred" && ["all", "mine", "community"].includes(q.scope as string))
    return { kind: "starred", scope: q.scope as StarredScope, tag };
  return null;
}

// --- Cursors ---
// Date-ordered lists use a keyset cursor (createdAt + id of the last row), so
// pages stay stable while new rows arrive. The ranked feed uses an offset.

function encodeKeyset(date: Date, id: string): string {
  return `k${date.getTime()}_${id}`;
}

function decodeKeyset(cursor?: string | null): { date: Date; id: string } | null {
  const m = cursor?.match(/^k(\d+)_(.+)$/);
  return m ? { date: new Date(Number(m[1])), id: m[2] } : null;
}

function decodeOffset(cursor?: string | null): number {
  const m = cursor?.match(/^o(\d+)$/);
  return m ? Number(m[1]) : 0;
}

/** Rows strictly after the cursor in (createdAt desc, id desc) order. */
function afterKeyset(cursor?: string | null) {
  const k = decodeKeyset(cursor);
  if (!k) return {};
  return {
    OR: [{ createdAt: { lt: k.date } }, { createdAt: k.date, id: { lt: k.id } }],
  };
}

const newestFirst = [{ createdAt: "desc" as const }, { id: "desc" as const }];

// --- Pages ---

export async function fetchListPage(
  userId: string,
  query: ListQuery,
  cursor: string | null,
  limit: number = PAGE_SIZE,
): Promise<ListPage> {
  const take = Math.min(Math.max(1, limit), MAX_FETCH);
  switch (query.kind) {
    case "bookmarks":
      return bookmarksPage(userId, query, cursor, take);
    case "feed":
      return query.sort === "top"
        ? topFeedPage(userId, query.tag, cursor, take)
        : newFeedPage(userId, query.tag, cursor, take);
    case "starred":
      return starredPage(userId, query, cursor, take);
  }
}

async function bookmarksPage(
  userId: string,
  query: Extract<ListQuery, { kind: "bookmarks" }>,
  cursor: string | null,
  take: number,
): Promise<ListPage> {
  const rows = await prisma.bookmark.findMany({
    where: {
      userId,
      ...(query.view === "read" && { readAt: { not: null } }),
      ...(query.view === "to-read" && { readAt: null }),
      ...(query.tag && { tags: { has: query.tag } }),
      ...afterKeyset(cursor),
    },
    orderBy: newestFirst,
    take: take + 1,
    select: cardSelect(userId),
  });
  const page = rows.slice(0, take);
  const last = page.at(-1);
  return {
    items: page.map((b) => ({ bookmark: b, listedAt: b.createdAt })),
    nextCursor: rows.length > take && last ? encodeKeyset(last.createdAt, last.id) : null,
  };
}

const publicReady = { isPublic: true, status: "ready" } as const;

async function withVotes(userId: string, items: ListItem[]): Promise<ListItem[]> {
  const ids = items.map((i) => i.bookmark.id);
  if (ids.length === 0) return items;
  const [sums, mine] = await Promise.all([
    prisma.vote.groupBy({
      by: ["bookmarkId"],
      where: { bookmarkId: { in: ids } },
      _sum: { value: true },
    }),
    prisma.vote.findMany({
      where: { userId, bookmarkId: { in: ids } },
      select: { bookmarkId: true, value: true },
    }),
  ]);
  const score = new Map(sums.map((s) => [s.bookmarkId, s._sum.value ?? 0]));
  const myVote = new Map(mine.map((v) => [v.bookmarkId, v.value]));
  return items.map((i) => ({
    ...i,
    score: i.score ?? score.get(i.bookmark.id) ?? 0,
    myVote: myVote.get(i.bookmark.id) ?? 0,
  }));
}

async function newFeedPage(
  userId: string,
  tag: string | undefined,
  cursor: string | null,
  take: number,
): Promise<ListPage> {
  const rows = await prisma.bookmark.findMany({
    where: { ...publicReady, ...(tag && { tags: { has: tag } }), ...afterKeyset(cursor) },
    orderBy: newestFirst,
    take: take + 1,
    select: cardSelect(userId),
  });
  const page = rows.slice(0, take);
  const last = page.at(-1);
  return {
    items: await withVotes(
      userId,
      page.map((b) => ({ bookmark: b, listedAt: b.createdAt })),
    ),
    nextCursor: rows.length > take && last ? encodeKeyset(last.createdAt, last.id) : null,
  };
}

async function topFeedPage(
  userId: string,
  tag: string | undefined,
  cursor: string | null,
  take: number,
): Promise<ListPage> {
  const offset = decodeOffset(cursor);
  const tagFilter = tag ? Prisma.sql`AND ${tag} = ANY(b."tags")` : Prisma.empty;
  // Ties fall back to recency, as before.
  const ranked = await prisma.$queryRaw<{ id: string; score: number }[]>`
    SELECT b."id", COALESCE(SUM(v."value"), 0)::int AS "score"
    FROM "Bookmark" b
    LEFT JOIN "Vote" v ON v."bookmarkId" = b."id"
    WHERE b."isPublic" = true AND b."status" = 'ready' ${tagFilter}
    GROUP BY b."id"
    ORDER BY "score" DESC, b."createdAt" DESC, b."id" DESC
    LIMIT ${take + 1} OFFSET ${offset}`;

  const pageIds = ranked.slice(0, take);
  const rows = await prisma.bookmark.findMany({
    where: { id: { in: pageIds.map((r) => r.id) } },
    select: cardSelect(userId),
  });
  const byId = new Map(rows.map((b) => [b.id, b]));
  const items: ListItem[] = [];
  pageIds.forEach((r, i) => {
    const b = byId.get(r.id);
    if (b) items.push({ bookmark: b, listedAt: b.createdAt, score: r.score, rank: offset + i });
  });
  return {
    items: await withVotes(userId, items),
    nextCursor: ranked.length > take ? `o${offset + take}` : null,
  };
}

/** Stars you can still see: on your own bookmarks, or on public ones. */
function visibleStarredBookmark(userId: string, scope: StarredScope, tag?: string) {
  return {
    AND: [
      { OR: [{ userId }, { isPublic: true }] },
      scope === "mine" ? { userId } : scope === "community" ? { userId: { not: userId } } : {},
      tag ? { tags: { has: tag } } : {},
    ],
  } satisfies Prisma.BookmarkWhereInput;
}

async function starredPage(
  userId: string,
  query: Extract<ListQuery, { kind: "starred" }>,
  cursor: string | null,
  take: number,
): Promise<ListPage> {
  const rows = await prisma.star.findMany({
    where: {
      userId,
      bookmark: visibleStarredBookmark(userId, query.scope, query.tag),
      ...afterKeyset(cursor),
    },
    orderBy: newestFirst,
    take: take + 1,
    select: { id: true, createdAt: true, bookmark: { select: cardSelect(userId) } },
  });
  const page = rows.slice(0, take);
  const last = page.at(-1);
  return {
    items: page.map((s) => ({ bookmark: s.bookmark, listedAt: s.createdAt })),
    nextCursor: rows.length > take && last ? encodeKeyset(last.createdAt, last.id) : null,
  };
}

// --- Counts ---

export type TagCount = { name: string; count: number };

export function bookmarkTagCounts(userId: string): Promise<TagCount[]> {
  return prisma.$queryRaw<TagCount[]>`
    SELECT t AS "name", COUNT(*)::int AS "count"
    FROM "Bookmark" b, unnest(b."tags") AS t
    WHERE b."userId" = ${userId}
    GROUP BY t ORDER BY t`;
}

export function feedTagCounts(): Promise<TagCount[]> {
  return prisma.$queryRaw<TagCount[]>`
    SELECT t AS "name", COUNT(*)::int AS "count"
    FROM "Bookmark" b, unnest(b."tags") AS t
    WHERE b."isPublic" = true AND b."status" = 'ready'
    GROUP BY t ORDER BY t`;
}

export function starredTagCounts(userId: string): Promise<TagCount[]> {
  return prisma.$queryRaw<TagCount[]>`
    SELECT t AS "name", COUNT(*)::int AS "count"
    FROM "Star" s
    JOIN "Bookmark" b ON b."id" = s."bookmarkId", unnest(b."tags") AS t
    WHERE s."userId" = ${userId} AND (b."userId" = ${userId} OR b."isPublic" = true)
    GROUP BY t ORDER BY t`;
}

export function starredCount(userId: string, scope: StarredScope): Promise<number> {
  return prisma.star.count({
    where: { userId, bookmark: visibleStarredBookmark(userId, scope) },
  });
}
