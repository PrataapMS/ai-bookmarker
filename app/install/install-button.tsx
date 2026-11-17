"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const standaloneQuery = "(display-mode: standalone)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(standaloneQuery);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/**
 * One-tap install where the browser supports it (Chrome, Edge, Samsung
 * Internet on Android and desktop). Safari has no install prompt, so the
 * page's manual steps cover iPhone, iPad and Mac.
 */
export function InstallButton() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [done, setDone] = useState(false);
  const standalone = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(standaloneQuery).matches,
    () => false,
  );

  useEffect(() => {
    function onPrompt(e: Event) {
      e.preventDefault();
      setPrompt(e as InstallPromptEvent);
    }
    function onInstalled() {
      setDone(true);
      setPrompt(null);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (standalone || done) {
    return (
      <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">
        ✓ BookmarkAI is installed on this device.
      </p>
    );
  }
  if (!prompt) return null;

  return (
    <button
      type="button"
      onClick={async () => {
        await prompt.prompt();
        const { outcome } = await prompt.userChoice;
        if (outcome === "accepted") setDone(true);
        setPrompt(null);
      }}
      className="w-full rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-accent-fg shadow-lg transition hover:opacity-90 sm:w-auto"
    >
      📲 Install BookmarkAI
    </button>
  );
}
