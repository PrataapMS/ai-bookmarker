const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDate(date: Date): string {
  return dateFormat.format(date);
}

/** Count words in extracted article text (whitespace-delimited runs). */
export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

// Average adult reading speed for online prose.
const WORDS_PER_MINUTE = 225;

/** Whole minutes to read a word count (at least 1), or 0 when unknown. */
export function readingMinutes(wordCount: number | null | undefined): number {
  if (!wordCount || wordCount < 1) return 0;
  return Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));
}

/**
 * Human reading-time label from a word count, e.g. "≈ 6 min read".
 * Returns null when the count is missing or too small to be meaningful.
 */
export function readingTime(wordCount: number | null | undefined): string | null {
  const minutes = readingMinutes(wordCount);
  return minutes ? `≈ ${minutes} min read` : null;
}
