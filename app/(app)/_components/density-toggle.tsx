"use client";

import { useSyncExternalStore } from "react";

type Density = "cards" | "compact";

const DENSITY_EVENT = "bookmarkai:densitychange";

// Mirrors ThemeToggle: the root layout's inline script sets <html
// data-density> before first paint, and the `compact:` Tailwind variant keys
// off it, so lists render in the saved density with no flash or refetch.

function subscribe(callback: () => void) {
  window.addEventListener(DENSITY_EVENT, callback);
  return () => window.removeEventListener(DENSITY_EVENT, callback);
}

function getSnapshot(): Density {
  return document.documentElement.dataset.density === "compact" ? "compact" : "cards";
}

function applyDensity(next: Density) {
  document.documentElement.dataset.density = next;
  try {
    localStorage.setItem("density", next);
  } catch {
    // Still applies for this visit.
  }
  window.dispatchEvent(new Event(DENSITY_EVENT));
}

function CardsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="4" width="16" height="7" rx="1.5" />
      <rect x="4" y="13" width="16" height="7" rx="1.5" />
    </svg>
  );
}

function CompactIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  );
}

const OPTIONS: { value: Density; label: string; icon: React.ReactNode }[] = [
  { value: "cards", label: "Cards view", icon: <CardsIcon /> },
  { value: "compact", label: "Compact view", icon: <CompactIcon /> },
];

export function DensityToggle() {
  const density = useSyncExternalStore(subscribe, getSnapshot, () => null);

  return (
    <div
      role="radiogroup"
      aria-label="List layout"
      className="flex items-center gap-0.5 rounded-full border border-border bg-surface p-0.5"
    >
      {OPTIONS.map((opt) => {
        // Styled by the `compact:` variant rather than `density`, so the
        // server render already shows the right button as active.
        const activeClass =
          opt.value === "cards"
            ? "bg-accent text-accent-fg compact:bg-transparent compact:text-muted"
            : "text-muted compact:bg-accent compact:text-accent-fg";
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={density === null ? undefined : density === opt.value}
            aria-label={opt.label}
            title={opt.label}
            onClick={() => applyDensity(opt.value)}
            className={`flex h-7 w-8 items-center justify-center rounded-full transition ${activeClass}`}
          >
            {opt.icon}
          </button>
        );
      })}
    </div>
  );
}
