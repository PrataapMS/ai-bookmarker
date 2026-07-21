import "server-only";
import { prisma } from "./prisma";
import { extractArticle } from "./extract";
import { summarize, type Summary } from "./summarize";
import { normalizeTags } from "./tags";
import { countWords } from "./format";
import type { Extracted } from "./extract";

const MAX_SUMMARY_ATTEMPTS = 5;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Summarization hits an external LLM API, so it can fail transiently
 * (rate limits, timeouts, malformed tool output). Retry with exponential
 * backoff (1s, 2s, 4s, 8s — ~15s worst case, well inside maxDuration).
 */
async function summarizeWithRetries(article: Extracted): Promise<Summary> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_SUMMARY_ATTEMPTS; attempt++) {
    try {
      return await summarize(article);
    } catch (err) {
      lastError = err;
      console.error(
        `summarize attempt ${attempt}/${MAX_SUMMARY_ATTEMPTS} failed:`,
        err instanceof Error ? err.message : err,
      );
      if (attempt < MAX_SUMMARY_ATTEMPTS) {
        await sleep(1000 * 2 ** (attempt - 1));
      }
    }
  }
  throw lastError;
}

/**
 * Fetch + extract + summarize a bookmark, then persist the result.
 * Always resolves (never throws) — failures are written to the bookmark's
 * `status`/`error` fields so the UI can show them.
 *
 * NOTE: in this MVP this is called fire-and-forget from the create action,
 * which works under `next dev` and `next start`. For serverless production
 * (e.g. Vercel functions), move this behind a queue or use `waitUntil`.
 */
export async function processBookmark(bookmarkId: string): Promise<void> {
  const bookmark = await prisma.bookmark.findUnique({
    where: { id: bookmarkId },
  });
  if (!bookmark) return;

  try {
    const article = await extractArticle(bookmark.url);
    const summary = await summarizeWithRetries(article);
    const wordCount = countWords(article.textContent);

    await prisma.$transaction([
      // Clear any prior derived rows (in case this is a retry).
      prisma.takeaway.deleteMany({ where: { bookmarkId } }),
      prisma.actionItem.deleteMany({
        where: { bookmarkId, promotedToTodo: false },
      }),
      prisma.bookmark.update({
        where: { id: bookmarkId },
        data: {
          status: "ready",
          error: null,
          title: article.title ?? bookmark.title,
          siteName: article.siteName ?? bookmark.siteName,
          contentType: summary.contentType,
          summary: summary.summary,
          rawText: article.textContent.slice(0, 50_000),
          wordCount,
          // Union with existing tags so a retry never wipes manual edits.
          tags: normalizeTags([...bookmark.tags, ...summary.tags]),
          takeaways: {
            create: summary.keyTakeaways.map((text, order) => ({
              text,
              order,
            })),
          },
          actionItems: {
            create: summary.actionItems.map((text, order) => ({
              text,
              order,
            })),
          },
        },
      }),
    ]);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Something went wrong.";
    await prisma.bookmark.update({
      where: { id: bookmarkId },
      data: { status: "failed", error: message },
    });
  }
}
