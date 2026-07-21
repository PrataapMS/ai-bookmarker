"use client";

import { useState, useTransition } from "react";
import { addActionItemToTodos } from "@/app/actions/bookmarks";

/**
 * For non-owners viewing a public bookmark: copies the action item into the
 * viewer's own todo list without touching the owner's ActionItem row.
 */
export function AddActionItemTodoButton({
  actionItemId,
}: {
  actionItemId: string;
}) {
  const [added, setAdded] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (added) {
    return (
      <span className="shrink-0 whitespace-nowrap text-xs text-emerald-600 dark:text-emerald-400">
        ✓ Added to your todos
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await addActionItemToTodos(actionItemId);
          setAdded(true);
        })
      }
      className="shrink-0 whitespace-nowrap rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-accent-fg transition hover:opacity-90 disabled:opacity-60"
    >
      + Add to my todos
    </button>
  );
}
