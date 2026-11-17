import "server-only";
import { after } from "next/server";
import { z } from "zod";
import { prisma } from "./prisma";
import { processBookmark } from "./process-bookmark";
import { normalizeUrl, urlMatchKeys } from "./normalize-url";

/** A pasted or shared link, tolerating a missing scheme. */
export const bookmarkUrlSchema = z
  .string()
  .trim()
  .min(1, "Paste a link first.")
  .transform((v) => (/^https?:\/\//i.test(v) ? v : `https://${v}`))
  .pipe(z.string().url("That doesn't look like a valid link."));

export type SavedBookmark = {
  id: string;
  /** A row was added (fresh or copied), so bookmark lists are stale. */
  isNew: boolean;
};

/**
 * Save a link for a user and return the bookmark to open, kicking off
 * processing when the article isn't already known.
 *
 * Idempotent per user: re-saving a link they already have returns the
 * existing bookmark instead of creating a duplicate or paying for a second
 * summary. That's what makes a plain GET /share safe to hit twice.
 */
export async function saveBookmark(
  userId: string,
  validUrl: string,
): Promise<SavedBookmark> {
  const url = normalizeUrl(validUrl);
  const matchKeys = urlMatchKeys(validUrl);

  // Same user already saved this link → open their existing entry
  // instead of creating a duplicate.
  const existing = await prisma.bookmark.findFirst({
    where: { userId, url: { in: matchKeys } },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (existing) return { id: existing.id, isNew: false };

  // Another user already processed this link → copy their result so we
  // don't fetch + summarize the same article again.
  const source = await prisma.bookmark.findFirst({
    where: { url: { in: matchKeys }, status: "ready" },
    orderBy: { createdAt: "desc" },
    include: {
      takeaways: { orderBy: { order: "asc" } },
      actionItems: { orderBy: { order: "asc" } },
    },
  });

  if (source) {
    const copy = await prisma.bookmark.create({
      data: {
        userId,
        url,
        status: "ready",
        title: source.title,
        siteName: source.siteName,
        contentType: source.contentType,
        summary: source.summary,
        rawText: source.rawText,
        wordCount: source.wordCount,
        tags: source.tags,
        takeaways: {
          create: source.takeaways.map(({ text, order }) => ({ text, order })),
        },
        actionItems: {
          create: source.actionItems.map(({ text, order }) => ({
            text,
            order,
          })),
        },
      },
    });
    return { id: copy.id, isNew: true };
  }

  const bookmark = await prisma.bookmark.create({
    data: { userId, url, status: "pending" },
  });

  // Process after the response is sent; on serverless this keeps the
  // function alive (waitUntil) instead of dying with the request.
  after(() => processBookmark(bookmark.id));

  return { id: bookmark.id, isNew: true };
}
