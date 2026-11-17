"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { addTodo, type TodoState } from "@/app/actions/todos";
import { localParts } from "@/lib/todo-client";
import { DateTimePicker, Sheet, describeWhen } from "./date-time-sheet";

type Due = { iso: string; allDay: boolean };

export function AddTodoForm() {
  const [state, formAction, pending] = useActionState<TodoState, FormData>(
    addTodo,
    undefined,
  );
  const [due, setDue] = useState<Due | null>(null);
  const [picking, setPicking] = useState(false);
  const closePicker = useCallback(() => setPicking(false), []);
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the input after a successful add.
  useEffect(() => {
    if (!pending && !state?.error) formRef.current?.reset();
  }, [pending, state]);

  function submit(formData: FormData) {
    if (due) {
      formData.set("dueAt", due.iso);
      formData.set("dueAllDay", due.allDay ? "1" : "0");
    }
    setDue(null);
    formAction(formData);
  }

  const dueLabel = due
    ? (() => {
        const { date, time } = localParts(due.iso);
        return describeWhen(date, due.allDay ? "" : time);
      })()
    : null;

  return (
    <form ref={formRef} action={submit} className="space-y-2">
      <div className="flex gap-2">
        <input
          name="text"
          type="text"
          required
          maxLength={500}
          placeholder="Add a todo…"
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
        <button
          type="button"
          onClick={() => setPicking(true)}
          aria-label={due ? `Due ${dueLabel}. Change due date` : "Set a due date"}
          className={`rounded-lg border px-3 text-sm transition ${
            due ? "border-accent bg-accent/10" : "border-border bg-surface hover:border-accent/50"
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

      {due && (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPicking(true)}
            className="rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-medium text-accent transition hover:bg-accent/20"
          >
            📅 {dueLabel}
          </button>
          <button
            type="button"
            onClick={() => setDue(null)}
            aria-label="Remove due date"
            className="flex h-6 w-6 items-center justify-center rounded-full text-xs text-muted transition hover:bg-surface hover:text-foreground"
          >
            ✕
          </button>
        </div>
      )}

      {state?.error && <p className="text-xs text-red-600 dark:text-red-400">{state.error}</p>}

      {picking && (
        <Sheet title="Due date" onClose={closePicker}>
          <DateTimePicker
            initialIso={due?.iso}
            initialAllDay={due?.allDay}
            allowAllDay
            submitLabel="Set due date"
            onSubmit={(iso, allDay) => {
              setDue({ iso, allDay });
              setPicking(false);
            }}
            onClear={due ? () => {
              setDue(null);
              setPicking(false);
            } : undefined}
          />
        </Sheet>
      )}
    </form>
  );
}
