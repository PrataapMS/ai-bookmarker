// Browser-side todo helpers: local-time instants, exports, calendar links.
// Everything here runs in the viewer's own timezone.

export type TodoView = {
  id: string;
  text: string;
  done: boolean;
  dueIso: string | null;
  dueAllDay: boolean;
  /** Server-formatted, viewer-local ("Today 3:00 pm", "Tomorrow"). */
  dueLabel: string | null;
  overdue: boolean;
  snoozeLabel: string | null;
  source: { bookmarkId: string; title: string } | null;
};

// All-day todos remind (and sort) at this local hour.
export const ALL_DAY_HOUR = 9;

/** ISO instant for a local date ("2026-11-20") and optional time ("14:30"). */
export function localInstant(date: string, time?: string): string {
  const hhmm = time || `${String(ALL_DAY_HOUR).padStart(2, "0")}:00`;
  return new Date(`${date}T${hhmm}`).toISOString();
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "YYYY-MM-DD" and "HH:MM" of an instant in local time, for form inputs. */
export function localParts(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

function at(daysFromToday: number, hour: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  d.setHours(hour, 0, 0, 0);
  return d;
}

export function snoozePresets(now = new Date()): { label: string; until: Date }[] {
  const presets = [
    { label: "In 1 hour", until: new Date(now.getTime() + 60 * 60 * 1000) },
  ];
  if (now.getHours() < 17) presets.push({ label: "This evening", until: at(0, 18) });
  presets.push({ label: "Tomorrow morning", until: at(1, ALL_DAY_HOUR) });
  // Next Monday (a full week out when today is Monday).
  const toMonday = ((8 - now.getDay()) % 7) || 7;
  presets.push({ label: "Next week", until: at(toMonday, ALL_DAY_HOUR) });
  return presets;
}

// --- Exports ---

export function todosMarkdown(todos: TodoView[]): string {
  return todos
    .map((t) => {
      const due = t.dueLabel ? ` (due ${t.dueLabel})` : "";
      return `- [${t.done ? "x" : " "}] ${t.text}${due}`;
    })
    .join("\n");
}

/** One task per line, no markup: the format most task apps split on paste. */
export function todosPlain(todos: TodoView[]): string {
  return todos.map((t) => t.text).join("\n");
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function todosCsv(todos: TodoView[], origin: string): string {
  const rows = [["Task", "Done", "Due", "All day", "Source"]];
  for (const t of todos) {
    rows.push([
      t.text,
      t.done ? "yes" : "no",
      t.dueIso ?? "",
      t.dueIso ? (t.dueAllDay ? "yes" : "no") : "",
      t.source ? `${origin}/bookmarks/${t.source.bookmarkId}` : "",
    ]);
  }
  return rows.map((r) => r.map(csvCell).join(",")).join("\n");
}

export function downloadFile(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// --- Google Calendar ---

function utcStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function dateStamp(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

/** Pre-filled "new event" link; no Google sign-in needed on our side. */
export function googleCalendarUrl(t: TodoView, origin: string): string {
  const params = new URLSearchParams({ action: "TEMPLATE", text: t.text });
  const details = t.source
    ? `From BookmarkAI: ${t.source.title}\n${origin}/bookmarks/${t.source.bookmarkId}`
    : "From BookmarkAI";
  params.set("details", details);
  if (t.dueIso) {
    const start = new Date(t.dueIso);
    if (t.dueAllDay) {
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      params.set("dates", `${dateStamp(start)}/${dateStamp(end)}`);
    } else {
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      params.set("dates", `${utcStamp(start)}/${utcStamp(end)}`);
    }
  }
  return `https://calendar.google.com/calendar/render?${params}`;
}
