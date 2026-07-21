// One-off backfill: populate Bookmark.wordCount from stored rawText for
// bookmarks summarized before the reading-time feature existed.
//
// Run once from a dev machine (local .env points at the shared prod DB):
//   node --env-file=.env scripts/backfill-word-count.mjs
//
// Idempotent: only touches rows with rawText and a null/zero wordCount.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function countWords(text) {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

const targets = await prisma.bookmark.findMany({
  where: { rawText: { not: null }, OR: [{ wordCount: null }, { wordCount: 0 }] },
  select: { id: true, rawText: true },
});

console.log(`Found ${targets.length} bookmark(s) to backfill.`);

let updated = 0;
for (const b of targets) {
  const wordCount = countWords(b.rawText ?? "");
  if (wordCount < 1) continue;
  await prisma.bookmark.update({ where: { id: b.id }, data: { wordCount } });
  updated++;
}

console.log(`Backfilled wordCount on ${updated} bookmark(s).`);
await prisma.$disconnect();
