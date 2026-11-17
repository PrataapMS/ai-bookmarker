"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  downloadFile,
  todosCsv,
  todosMarkdown,
  todosPlain,
  type TodoView,
} from "@/lib/todo-client";

/** Copy or download the todo list, for pasting into other task apps. */
export function TodoExport({ todos }: { todos: TodoView[] }) {
  const [open, setOpen] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Screens stay mounted (hidden) after navigating away; don't come back to
  // this left open.
  useLayoutEffect(() => () => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  if (todos.length === 0) return null;

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setFlash("Copied ✓");
    } catch {
      setFlash("Copy failed");
    }
    setOpen(false);
    setTimeout(() => setFlash(null), 1500);
  }

  function download(kind: "md" | "csv") {
    const stamp = new Date().toISOString().slice(0, 10);
    if (kind === "md") {
      downloadFile(`todos-${stamp}.md`, `# Todos\n\n${todosMarkdown(todos)}\n`, "text/markdown");
    } else {
      downloadFile(`todos-${stamp}.csv`, todosCsv(todos, window.location.origin), "text/csv");
    }
    setOpen(false);
  }

  const item =
    "block w-full rounded-lg px-3 py-2 text-left text-sm transition hover:bg-background";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted transition hover:border-accent/50 hover:text-foreground"
      >
        {flash ?? "Export ▾"}
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-30 w-64 rounded-xl border border-border bg-surface p-1.5 shadow-xl">
          <button type="button" className={item} onClick={() => copy(todosMarkdown(todos))}>
            Copy as Markdown checklist
          </button>
          <button type="button" className={item} onClick={() => copy(todosPlain(todos))}>
            Copy as plain list
            <span className="block text-xs text-muted">One task per line, for pasting into task apps</span>
          </button>
          <div className="my-1 border-t border-border" />
          <button type="button" className={item} onClick={() => download("md")}>
            Download Markdown (.md)
          </button>
          <button type="button" className={item} onClick={() => download("csv")}>
            Download spreadsheet (.csv)
          </button>
        </div>
      )}
    </div>
  );
}
