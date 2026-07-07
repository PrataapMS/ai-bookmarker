"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dusk" | "dark";

const OPTIONS: { value: Theme; label: string; icon: string }[] = [
  { value: "light", label: "Light mode", icon: "☀️" },
  { value: "dusk", label: "Dusk mode", icon: "🌆" },
  { value: "dark", label: "Dark mode", icon: "🌙" },
];

const THEME_EVENT = "bookmarkai:themechange";

// --- External store (the <html data-theme> attribute) ---
// Reading via useSyncExternalStore lets the server render an "unknown" theme
// and the client reconcile after hydration without a mismatch warning.

function subscribe(callback: () => void) {
  window.addEventListener(THEME_EVENT, callback);
  return () => window.removeEventListener(THEME_EVENT, callback);
}

function getSnapshot(): Theme {
  const attr = document.documentElement.dataset.theme;
  return attr === "light" || attr === "dusk" || attr === "dark"
    ? attr
    : "light";
}

function applyTheme(next: Theme) {
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem("theme", next);
  } catch {
    // Ignore write failures (e.g. private mode); the theme still applies for the session.
  }
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  // Server snapshot is null so SSR and the first client render agree; the inline
  // script in the root layout owns the attribute until this reconciles.
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => null);

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className={`flex w-fit items-center gap-0.5 rounded-md border border-border p-0.5 ${className}`}
    >
      {OPTIONS.map((opt) => {
        const active = theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={opt.label}
            title={opt.label}
            onClick={() => applyTheme(opt.value)}
            className={`flex h-10 w-10 items-center justify-center rounded text-lg transition md:h-7 md:w-7 md:text-sm ${
              active
                ? "bg-accent text-accent-fg"
                : "text-muted hover:bg-background hover:text-foreground"
            }`}
          >
            <span aria-hidden>{opt.icon}</span>
          </button>
        );
      })}
    </div>
  );
}
