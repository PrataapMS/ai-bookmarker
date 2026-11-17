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

// --- Timezone-aware list dates ---
// Lists group by the viewer's calendar day, so these take the IANA zone from
// the `tz` cookie (see lib/timezone.ts) instead of assuming UTC.

const DAY_MS = 24 * 60 * 60 * 1000;
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(key: string, options: Intl.DateTimeFormatOptions) {
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat("en-GB", options);
    formatters.set(key, f);
  }
  return f;
}

/** Days since the epoch for the calendar day `date` falls on in `timeZone`. */
function dayNumber(date: Date, timeZone: string): number {
  const parts = formatter(`day:${timeZone}`, {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return Date.UTC(get("year"), get("month") - 1, get("day")) / DAY_MS;
}

/** Section heading for a list item: "Today", "Last 7 days", "October 2026"… */
export function dateGroup(date: Date, timeZone: string, now = new Date()): string {
  const age = dayNumber(now, timeZone) - dayNumber(date, timeZone);
  if (age <= 0) return "Today";
  if (age === 1) return "Yesterday";
  if (age < 7) return "Last 7 days";
  if (age < 30) return "Last 30 days";
  return formatter(`month:${timeZone}`, {
    timeZone,
    month: "long",
    year: "numeric",
  }).format(date);
}

/** Compact date for list cards: "17 Nov", or "17 Nov 2025" outside this year. */
export function formatShortDate(date: Date, timeZone: string, now = new Date()): string {
  const year = formatter(`year:${timeZone}`, { timeZone, year: "numeric" });
  const sameYear = year.format(date) === year.format(now);
  return formatter(`short:${timeZone}:${sameYear}`, {
    timeZone,
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(date);
}
