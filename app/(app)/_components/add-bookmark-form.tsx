"use client";

import { useActionState } from "react";
import { addBookmark, type AddState } from "@/app/actions/bookmarks";

export function AddBookmarkForm({ defaultValue }: { defaultValue?: string }) {
  const [state, formAction, pending] = useActionState<AddState, FormData>(
    addBookmark,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          name="url"
          type="text"
          inputMode="url"
          defaultValue={defaultValue}
          required
          placeholder="Paste a link to save and summarize…"
          className="flex-1 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg transition hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save link"}
        </button>
      </div>
      {state?.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}
    </form>
  );
}
