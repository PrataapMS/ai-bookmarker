"use client";

import { useActionState, useEffect, useRef } from "react";
import { addTodo, type TodoState } from "@/app/actions/todos";

export function AddTodoForm() {
  const [state, formAction, pending] = useActionState<TodoState, FormData>(
    addTodo,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the input after a successful add.
  useEffect(() => {
    if (!pending && !state?.error) formRef.current?.reset();
  }, [pending, state]);

  return (
    <form ref={formRef} action={formAction} className="flex gap-2">
      <input
        name="text"
        type="text"
        required
        maxLength={500}
        placeholder="Add a todo…"
        className="flex-1 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg transition hover:opacity-90 disabled:opacity-60"
      >
        Add
      </button>
    </form>
  );
}
