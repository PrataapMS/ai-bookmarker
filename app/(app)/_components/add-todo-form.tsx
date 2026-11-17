"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addTodo, type TodoState } from "@/app/actions/todos";
import { localInstant } from "@/lib/todo-client";

export function AddTodoForm() {
  const [state, formAction, pending] = useActionState<TodoState, FormData>(
    addTodo,
    undefined,
  );
  const [showDue, setShowDue] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the inputs after a successful add.
  useEffect(() => {
    if (!pending && !state?.error) formRef.current?.reset();
  }, [pending, state]);

  // The date/time inputs are local; send the server one exact instant.
  function submit(formData: FormData) {
    const date = formData.get("dueDate");
    const time = formData.get("dueTime");
    formData.delete("dueDate");
    formData.delete("dueTime");
    if (showDue && typeof date === "string" && date) {
      const hasTime = typeof time === "string" && time !== "";
      formData.set("dueAt", localInstant(date, hasTime ? time : undefined));
      formData.set("dueAllDay", hasTime ? "0" : "1");
    }
    setShowDue(false);
    formAction(formData);
  }

  const input =
    "rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30";

  return (
    <form ref={formRef} action={submit} className="space-y-2">
      <div className="flex gap-2">
        <input
          name="text"
          type="text"
          required
          maxLength={500}
          placeholder="Add a todo…"
          className={`${input} min-w-0 flex-1 py-2.5`}
        />
        <button
          type="button"
          onClick={() => setShowDue((s) => !s)}
          aria-label="Set a due date"
          aria-expanded={showDue}
          className={`rounded-lg border px-3 text-sm transition ${
            showDue
              ? "border-accent bg-accent/10"
              : "border-border bg-surface hover:border-accent/50"
          }`}
        >
          📅
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg transition hover:opacity-90 disabled:opacity-60"
        >
          Add
        </button>
      </div>
      {/* Kept mounted so a chosen date survives toggling; only sent while shown. */}
      <div className={showDue ? "flex flex-wrap items-center gap-2" : "hidden"}>
        <input name="dueDate" type="date" aria-label="Due date" className={input} />
        <input name="dueTime" type="time" aria-label="Due time (optional)" className={input} />
        <span className="text-xs text-muted">Time is optional; without it the reminder comes at 9:00.</span>
      </div>
      {state?.error && <p className="text-xs text-red-600 dark:text-red-400">{state.error}</p>}
    </form>
  );
}
