"use client";

import { useSyncExternalStore } from "react";

// Reader levels, unlocked by total articles read.
const LEVELS: { min: number; name: string; emoji: string }[] = [
  { min: 0, name: "Fresh Reader", emoji: "🌱" },
  { min: 3, name: "Curious Cat", emoji: "🐱" },
  { min: 10, name: "Bookworm", emoji: "🐛" },
  { min: 25, name: "Big Brain", emoji: "🧠" },
  { min: 50, name: "Galaxy Brain", emoji: "🌌" },
  { min: 100, name: "Main Character", emoji: "👑" },
];

const WEEKLY_GOAL = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

// --- A minute-resolution clock as an external store ---
// The server snapshot is null, so streaks (which depend on the viewer's local
// day boundaries) render only on the client, with no hydration mismatch.
let now = 0;
function subscribe(callback: () => void) {
  const id = setInterval(() => {
    now = Date.now();
    callback();
  }, 60_000);
  return () => clearInterval(id);
}
function getSnapshot() {
  if (!now) now = Date.now();
  return now;
}
function getServerSnapshot() {
  return null;
}

/** Local calendar day, e.g. "2026-11-17", in the viewer's timezone. */
function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function computeStreak(readDays: Set<string>, nowMs: number) {
  const readToday = readDays.has(dayKey(nowMs));
  // A streak is still alive until the end of today even if you haven't read
  // yet; count back from yesterday in that case.
  let cursor = readToday ? nowMs : nowMs - DAY_MS;
  let streak = 0;
  while (readDays.has(dayKey(cursor))) {
    streak++;
    cursor -= DAY_MS;
  }
  return { streak, readToday };
}

function formatMinutes(total: number): string {
  if (total < 60) return `${total}m`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export type ReadEntry = { readAt: string; minutes: number };

export function ReadingStats({ reads }: { reads: ReadEntry[] }) {
  const nowMs = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const total = reads.length;
  const levelIndex = LEVELS.findLastIndex((l) => total >= l.min);
  const level = LEVELS[levelIndex];
  const nextLevel = LEVELS[levelIndex + 1];
  const levelProgress = nextLevel
    ? (total - level.min) / (nextLevel.min - level.min)
    : 1;
  const minutes = reads.reduce((sum, r) => sum + r.minutes, 0);

  let streakLabel = "–";
  let streakHint = "";
  let streak = 0;
  let weekCount = 0;
  if (nowMs !== null) {
    const times = reads.map((r) => new Date(r.readAt).getTime());
    const days = new Set(times.map(dayKey));
    const s = computeStreak(days, nowMs);
    streak = s.streak;
    streakLabel = `${streak} day${streak === 1 ? "" : "s"}`;
    streakHint =
      streak === 0
        ? "Read one today to start a streak"
        : s.readToday
          ? "Locked in for today ✨"
          : "Read one today to keep it alive!";
    weekCount = times.filter((t) => nowMs - t < 7 * DAY_MS).length;
  }
  const weekProgress = Math.min(1, weekCount / WEEKLY_GOAL);

  return (
    <section
      aria-label="Your reading stats"
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
    >
      <div className="card-in rounded-2xl border border-orange-400/30 bg-gradient-to-br from-orange-400/15 via-rose-400/10 to-transparent p-3">
        <p className="text-xs font-medium text-muted">Streak</p>
        <p className="mt-1 flex items-center gap-1.5 text-lg font-bold tabular-nums">
          <span className={streak > 0 ? "flame" : "grayscale"} aria-hidden>
            🔥
          </span>
          {streakLabel}
        </p>
        <p className="mt-0.5 text-[11px] leading-tight text-muted">{streakHint}</p>
      </div>

      <div
        className="card-in rounded-2xl border border-violet-400/30 bg-gradient-to-br from-violet-400/15 via-fuchsia-400/10 to-transparent p-3"
        style={{ animationDelay: "60ms" }}
      >
        <p className="text-xs font-medium text-muted">Level</p>
        <p className="mt-1 truncate text-lg font-bold" title={level.name}>
          <span aria-hidden>{level.emoji}</span> {level.name}
        </p>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-background">
          <div
            className="xp-fill relative h-full overflow-hidden rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
            style={{ width: `${Math.max(4, levelProgress * 100)}%` }}
          >
            <span className="xp-shimmer absolute inset-y-0 w-1/3 bg-white/40 blur-[2px]" />
          </div>
        </div>
        <p className="mt-1 text-[11px] leading-tight text-muted">
          {nextLevel
            ? `${nextLevel.min - total} more to ${nextLevel.emoji} ${nextLevel.name}`
            : "Max level. Iconic."}
        </p>
      </div>

      <div
        className="card-in rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-400/15 via-teal-400/10 to-transparent p-3"
        style={{ animationDelay: "120ms" }}
      >
        <p className="text-xs font-medium text-muted">This week</p>
        <p className="mt-1 text-lg font-bold tabular-nums">
          {nowMs === null ? "–" : `${weekCount}/${WEEKLY_GOAL}`}{" "}
          <span className="text-xs font-medium text-muted">reads</span>
        </p>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-background">
          <div
            className="xp-fill h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
            style={{ width: `${Math.max(4, weekProgress * 100)}%` }}
          />
        </div>
        <p className="mt-1 text-[11px] leading-tight text-muted">
          {weekCount >= WEEKLY_GOAL ? "Goal smashed 💅" : "Weekly goal"}
        </p>
      </div>

      <div
        className="card-in rounded-2xl border border-sky-400/30 bg-gradient-to-br from-sky-400/15 via-indigo-400/10 to-transparent p-3"
        style={{ animationDelay: "180ms" }}
      >
        <p className="text-xs font-medium text-muted">Total read</p>
        <p className="mt-1 text-lg font-bold tabular-nums">
          {total} <span className="text-xs font-medium text-muted">articles</span>
        </p>
        <p className="mt-1 text-[11px] leading-tight text-muted">
          ⏱️ {formatMinutes(minutes)} of brain food
        </p>
      </div>
    </section>
  );
}
