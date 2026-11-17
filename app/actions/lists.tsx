"use server";

import { requireUser } from "@/lib/auth";
import { fetchListPage, parseListQuery, PAGE_SIZE } from "@/lib/lists";
import { getTimeZone } from "@/lib/timezone";
import { renderListItems } from "@/app/(app)/_components/bookmark-card";

/**
 * Next page of a list for the infinite scroll, rendered on the server. Bound
 * to its filters by the page; `limit` is larger when refilling pages that were
 * already loaded.
 */
export async function loadListPage(rawQuery: unknown, cursor: string, limit = PAGE_SIZE) {
  const [user, timeZone] = await Promise.all([requireUser(), getTimeZone()]);
  const query = parseListQuery(rawQuery);
  if (!query || typeof cursor !== "string") return { items: [], nextCursor: null };
  const page = await fetchListPage(user.id, query, cursor, Number(limit) || PAGE_SIZE);
  return {
    items: renderListItems(page.items, query, user.id, timeZone),
    nextCursor: page.nextCursor,
  };
}
