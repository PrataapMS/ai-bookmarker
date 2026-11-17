// Due-date, snooze and reminder helpers for todos.

/**
 * When the next push reminder for a todo should fire: the end of an active
 * snooze, otherwise a future due time. Past due times never schedule one, so
 * setting a date in the past (or finishing a todo) stays silent.
 */
export function nextRemindAt(
  t: { done: boolean; dueAt: Date | null; snoozedUntil: Date | null },
  now = new Date(),
): Date | null {
  if (t.done) return null;
  if (t.snoozedUntil && t.snoozedUntil > now) return t.snoozedUntil;
  if (t.dueAt && t.dueAt > now) return t.dueAt;
  return null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function dayIndex(date: Date, timeZone: string): number {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return Math.round(Date.parse(`${ymd}T00:00:00Z`) / DAY_MS);
}

/**
 * Short, viewer-local label for a due or snooze instant: "Today 3:00 pm",
 * "Tomorrow", "Yesterday", "Mon 24 Nov 9:00 am".
 */
export function formatWhen(
  date: Date,
  allDay: boolean,
  timeZone: string,
  now = new Date(),
): string {
  const diff = dayIndex(date, timeZone) - dayIndex(now, timeZone);
  const day =
    diff === 0
      ? "Today"
      : diff === 1
        ? "Tomorrow"
        : diff === -1
          ? "Yesterday"
          : new Intl.DateTimeFormat("en-GB", {
              timeZone,
              weekday: "short",
              day: "numeric",
              month: "short",
            }).format(date);
  if (allDay) return day;
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
  return `${day} ${time}`;
}

/** True when an all-day todo's day, or a timed todo's instant, has passed. */
export function isOverdue(
  dueAt: Date,
  allDay: boolean,
  timeZone: string,
  now = new Date(),
): boolean {
  return allDay
    ? dayIndex(dueAt, timeZone) < dayIndex(now, timeZone)
    : dueAt < now;
}
