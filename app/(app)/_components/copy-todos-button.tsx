"use client";

import { useState } from "react";

type CopyFormat = "markdown" | "bullets";

export function CopyTodosButton({
  todos,
}: {
  todos: { text: string; done: boolean }[];
}) {
  const [copied, setCopied] = useState<CopyFormat | null>(null);

  if (todos.length === 0) return null;

  async function copy(format: CopyFormat) {
    const text = todos
      .map((t) =>
        format === "markdown" ? `- [${t.done ? "x" : " "}] ${t.text}` : `- ${t.text}`,
      )
      .join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(format);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => copy("markdown")}
        className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted transition hover:border-accent/50 hover:text-foreground"
      >
        {copied === "markdown" ? "Copied ✓" : "Copy as Markdown"}
      </button>
      <button
        type="button"
        onClick={() => copy("bullets")}
        className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted transition hover:border-accent/50 hover:text-foreground"
      >
        {copied === "bullets" ? "Copied ✓" : "Copy as bullets"}
      </button>
    </div>
  );
}
