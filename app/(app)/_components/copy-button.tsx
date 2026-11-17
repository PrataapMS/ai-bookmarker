"use client";

import { useState } from "react";

// Copies a prepared Markdown string to the clipboard and flashes the result.
export function CopyButton({
  text,
  label = "Copy",
  title,
}: {
  text: string;
  label?: string;
  title?: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
    setTimeout(() => setState("idle"), 1500);
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={title}
      aria-label={title ?? label}
      className="shrink-0 rounded-lg border border-border px-2.5 py-1 text-xs font-medium normal-case tracking-normal text-muted transition hover:border-accent/50 hover:text-foreground"
    >
      {state === "copied" ? "Copied ✓" : state === "failed" ? "Copy failed" : label}
    </button>
  );
}
