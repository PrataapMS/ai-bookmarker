import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  toggleTodo,
  deleteTodo,
  clearCompletedTodos,
} from "@/app/actions/todos";
import { AddTodoForm } from "../_components/add-todo-form";
import { CopyTodosButton } from "../_components/copy-todos-button";

export const dynamic = "force-dynamic";

export default async function TodosPage() {
  const user = await requireUser();

  const todos = await prisma.todo.findMany({
    where: { userId: user.id },
    orderBy: [{ done: "asc" }, { createdAt: "desc" }],
    include: {
      sourceActionItem: {
        select: {
          bookmarkId: true,
          bookmark: { select: { title: true } },
        },
      },
    },
  });

  const open = todos.filter((t) => !t.done);
  const done = todos.filter((t) => t.done);

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-tight">Todos</h1>
          <div className="flex items-center gap-3">
            <CopyTodosButton
              todos={todos.map((t) => ({ text: t.text, done: t.done }))}
            />
            {done.length > 0 && (
              <form action={clearCompletedTodos}>
                <button
                  type="submit"
                  className="text-xs text-muted transition hover:text-foreground"
                >
                  Clear {done.length} completed
                </button>
              </form>
            )}
          </div>
        </div>
        <p className="mb-4 text-sm text-muted">
          {open.length} open · {done.length} done. Add action items from any
          bookmark or write your own.
        </p>
        <AddTodoForm />
      </section>

      {todos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
          <p className="text-3xl">✅</p>
          <p className="mt-2 font-medium">Nothing to do yet</p>
          <p className="mt-1 text-sm text-muted">
            Promote action items from a bookmark, or add your own above.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {[...open, ...done].map((todo) => {
            const toggle = toggleTodo.bind(null, todo.id);
            const remove = deleteTodo.bind(null, todo.id);
            return (
              <li
                key={todo.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3"
              >
                <form action={toggle} className="flex">
                  <button
                    type="submit"
                    aria-label={todo.done ? "Mark as open" : "Mark as done"}
                    className={`flex h-5 w-5 items-center justify-center rounded-md border text-xs transition ${
                      todo.done
                        ? "border-accent bg-accent text-accent-fg"
                        : "border-border hover:border-accent"
                    }`}
                  >
                    {todo.done ? "✓" : ""}
                  </button>
                </form>

                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm ${
                      todo.done ? "text-muted line-through" : ""
                    }`}
                  >
                    {todo.text}
                  </p>
                  {todo.sourceActionItem && (
                    <Link
                      href={`/bookmarks/${todo.sourceActionItem.bookmarkId}`}
                      className="text-xs text-muted hover:text-accent"
                    >
                      from “{todo.sourceActionItem.bookmark.title ?? "a bookmark"}”
                    </Link>
                  )}
                </div>

                <form action={remove} className="flex">
                  <button
                    type="submit"
                    aria-label="Delete todo"
                    className="text-muted transition hover:text-red-600 dark:hover:text-red-400"
                  >
                    ✕
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
