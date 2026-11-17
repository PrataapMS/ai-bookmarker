"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ALL_DAY_HOUR, localInstant, localParts } from "@/lib/todo-client";

// Bottom sheet on phones, centered dialog on larger screens. Portaled to
// <body> so it's never clipped by a list row or a transformed ancestor.
export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-60 flex items-end justify-center bg-black/40 backdrop-blur-[2px] sm:items-center sm:p-4"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      data-no-swipe
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="sheet-in max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl border border-border bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl sm:max-w-sm sm:rounded-2xl sm:pb-4"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border sm:hidden" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-background hover:text-foreground"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

// --- Date helpers (all local time) ---

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const TIME_SLOTS = [
  { label: "Morning", value: "09:00" },
  { label: "Noon", value: "12:00" },
  { label: "Afternoon", value: "15:00" },
  { label: "Evening", value: "18:00" },
  { label: "Night", value: "21:00" },
];

function slotPassed(date: string, time: string): boolean {
  return new Date(`${date}T${time}`) <= new Date();
}

/** First time slot still ahead today, else null. */
function nextSlotToday(): string | null {
  const today = ymd(new Date());
  return TIME_SLOTS.find((s) => !slotPassed(today, s.value))?.value ?? null;
}

function quickDates() {
  const today = startOfToday();
  const day = today.getDay(); // 0 Sun .. 6 Sat
  const weekend = day === 6 || day === 0;
  return [
    { label: "Today", date: ymd(today) },
    { label: "Tomorrow", date: ymd(addDays(today, 1)) },
    {
      label: weekend ? "Next weekend" : "This weekend",
      date: ymd(addDays(today, weekend ? (day === 6 ? 7 : 6) : 6 - day)),
    },
    { label: "Next week", date: ymd(addDays(today, (8 - day) % 7 || 7)) },
  ];
}

/**
 * Sensible starting point for a todo time: the next time-of-day slot today
 * while the working day is still on (before 17:00), otherwise tomorrow
 * morning. Always a concrete time, so a reminder actually fires.
 */
export function defaultWhen(): { date: string; time: string } {
  const slot = nextSlotToday();
  if (slot && new Date().getHours() < 17) return { date: ymd(new Date()), time: slot };
  return { date: ymd(addDays(startOfToday(), 1)), time: "09:00" };
}

export function describeWhen(date: string, time: string): string {
  const d = parseYmd(date);
  const diff = Math.round((d.getTime() - startOfToday().getTime()) / 86_400_000);
  const day =
    diff === 0
      ? "Today"
      : diff === 1
        ? "Tomorrow"
        : d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  if (!time) return day;
  const t = new Date(`${date}T${time}`).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${day}, ${t}`;
}

// --- Calendar ---

function MiniCalendar({
  value,
  onChange,
}: {
  value: string;
  onChange: (date: string) => void;
}) {
  const today = ymd(new Date());
  const [month, setMonth] = useState(() => {
    const d = value ? parseYmd(value) : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const days = useMemo(() => {
    // Weeks start on Monday.
    const lead = (month.getDay() + 6) % 7;
    const first = addDays(month, -lead);
    return Array.from({ length: 42 }, (_, i) => addDays(first, i));
  }, [month]);

  const thisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const canGoBack = month > thisMonth;

  const nav =
    "flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-background hover:text-foreground disabled:opacity-30";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          className={nav}
          disabled={!canGoBack}
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="text-sm font-medium">
          {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </span>
        <button
          type="button"
          className={nav}
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          aria-label="Next month"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] font-medium text-muted">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i} className="py-1">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((d) => {
          const key = ymd(d);
          const inMonth = d.getMonth() === month.getMonth();
          const past = key < today;
          const selected = key === value;
          const isToday = key === today;
          return (
            <button
              key={key}
              type="button"
              disabled={past}
              onClick={() => onChange(key)}
              aria-label={d.toDateString()}
              aria-pressed={selected}
              className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm transition disabled:cursor-default disabled:opacity-25 ${
                selected
                  ? "bg-accent font-semibold text-accent-fg"
                  : isToday
                    ? "font-semibold text-accent ring-1 ring-accent/40 hover:bg-accent/10"
                    : inMonth
                      ? "hover:bg-background"
                      : "text-muted/60 hover:bg-background"
              }`}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --- Picker ---

const chip = (active: boolean) =>
  `rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:cursor-default disabled:opacity-35 ${
    active
      ? "border-accent bg-accent text-accent-fg"
      : "border-border bg-background hover:border-accent/50"
  }`;

/**
 * Date + time picker: quick dates, a month calendar, time-of-day chips and a
 * custom time. `allowAllDay` offers "All day" (no time) for due dates.
 */
export function DateTimePicker({
  initialIso,
  initialAllDay,
  allowAllDay,
  submitLabel,
  onSubmit,
  onClear,
}: {
  initialIso?: string | null;
  initialAllDay?: boolean;
  allowAllDay: boolean;
  submitLabel: string;
  onSubmit: (iso: string, allDay: boolean) => void;
  onClear?: () => void;
}) {
  const [initial] = useState(() =>
    initialIso
      ? { date: localParts(initialIso).date, time: initialAllDay ? "" : localParts(initialIso).time }
      : defaultWhen(),
  );
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);

  const isSlot = TIME_SLOTS.some((s) => s.value === time);
  const [custom, setCustom] = useState(Boolean(time) && !isSlot);

  const instant = localInstant(date, time || undefined);
  const inPast = new Date(instant) <= new Date();
  const valid = Boolean(date) && (allowAllDay || Boolean(time)) && (!time || !inPast);

  function pickDate(next: string) {
    setDate(next);
    // Moving to today with a time that's already gone: jump to the next slot.
    if (time && slotPassed(next, time)) setTime(nextSlotToday() ?? "");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {quickDates().map((q) => (
          <button key={q.label} type="button" className={chip(date === q.date)} onClick={() => pickDate(q.date)}>
            {q.label}
          </button>
        ))}
      </div>

      <MiniCalendar key={date.slice(0, 7)} value={date} onChange={pickDate} />

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Time</p>
        <div className="flex flex-wrap gap-1.5">
          {allowAllDay && (
            <button
              type="button"
              className={chip(!time && !custom)}
              onClick={() => {
                setTime("");
                setCustom(false);
              }}
            >
              All day
            </button>
          )}
          {TIME_SLOTS.map((s) => (
            <button
              key={s.value}
              type="button"
              disabled={slotPassed(date, s.value)}
              className={chip(time === s.value && !custom)}
              onClick={() => {
                setTime(s.value);
                setCustom(false);
              }}
              title={s.value}
            >
              {s.label} <span className="opacity-70">{s.value}</span>
            </button>
          ))}
          <button type="button" className={chip(custom)} onClick={() => setCustom(true)}>
            Custom
          </button>
        </div>
        {custom && (
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            aria-label="Custom time"
            autoFocus
            className="mt-2 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
        )}
      </div>

      <div className="rounded-xl bg-background px-3 py-2.5 text-sm">
        <span className="font-medium">{date ? describeWhen(date, time) : "Pick a date"}</span>
        <span className="block text-xs text-muted">
          {time && inPast
            ? "That time has already passed."
            : time
              ? "You'll get a reminder at this time."
              : inPast
                ? `All day. No reminder, since ${ALL_DAY_HOUR}:00 has passed today.`
                : `All day. Reminder at ${ALL_DAY_HOUR}:00 on the day.`}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!valid}
          onClick={() => onSubmit(instant, !time)}
          className="flex-1 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg transition hover:opacity-90 disabled:opacity-50"
        >
          {submitLabel}
        </button>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-xl border border-border px-4 py-2.5 text-sm text-muted transition hover:text-foreground"
          >
            Remove date
          </button>
        )}
      </div>
    </div>
  );
}
