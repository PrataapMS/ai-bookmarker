import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTimeZone } from "@/lib/timezone";
import { pushConfigured } from "@/lib/push";
import { formatWhen, isOverdue } from "@/lib/todo-dates";
import type { TodoView } from "@/lib/todo-client";
import { clearCompletedTodos } from "@/app/actions/todos";
import { AddTodoForm } from "../_components/add-todo-form";
import { TodoExport } from "../_components/todo-export";
import { TodoList } from "../_components/todo-list";
import { RemindersToggle } from "../_components/reminders-toggle";
import { PageTransition } from "../_components/page-transition";
import { LiveData } from "../_components/live-data";

export default async function TodosPage() {
  const [user, timeZone] = await Promise.all([requireUser(), getTimeZone()]);

  const todos = await prisma.todo.findMany({
    where: { userId: user.id },
    orderBy: [{ done: "asc" }, { position: "asc" }, { createdAt: "desc" }],
    include: {
      sourceActionItem: {
        select: {
          bookmarkId: true,
          bookmark: { select: { title: true } },
        },
      },
    },
  });

  const now = new Date();
  const views = todos.map((t): TodoView => ({
    id: t.id,
    text: t.text,
    done: t.done,
    dueIso: t.dueAt?.toISOString() ?? null,
    dueAllDay: t.dueAllDay,
    dueLabel: t.dueAt ? formatWhen(t.dueAt, t.dueAllDay, timeZone, now) : null,
    overdue: t.dueAt ? isOverdue(t.dueAt, t.dueAllDay, timeZone, now) : false,
    snoozeLabel:
      t.snoozedUntil && t.snoozedUntil > now && !t.done
        ? formatWhen(t.snoozedUntil, false, timeZone, now)
        : null,
    source: t.sourceActionItem
      ? {
          bookmarkId: t.sourceActionItem.bookmarkId,
          title: t.sourceActionItem.bookmark.title ?? "a bookmark",
        }
      : null,
  }));
  const snoozedAt = new Map(todos.map((t) => [t.id, t.snoozedUntil?.getTime() ?? 0]));

  const open = views.filter((t) => !t.done && !t.snoozeLabel);
  const snoozed = views
    .filter((t) => !t.done && t.snoozeLabel)
    .sort((a, b) => snoozedAt.get(a.id)! - snoozedAt.get(b.id)!);
  const done = views.filter((t) => t.done);
  const overdue = open.filter((t) => t.overdue).length;

  const vapidKey = pushConfigured() ? process.env.VAPID_PUBLIC_KEY! : null;

  return (
    <PageTransition>
    <div className="space-y-6">
      <LiveData />
      <section>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-tight">Todos</h1>
          <div className="flex items-center gap-3">
            <TodoExport todos={[...open, ...snoozed, ...done]} />
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
        <p className="mb-3 text-sm text-muted">
          {open.length} open
          {overdue > 0 && (
            <span className="text-red-600 dark:text-red-400"> ({overdue} overdue)</span>
          )}
          {snoozed.length > 0 && <> · {snoozed.length} snoozed</>} · {done.length} done.
          Drag ⠿ to reorder.
        </p>
        {vapidKey && (
          <div className="mb-4">
            <RemindersToggle publicKey={vapidKey} />
          </div>
        )}
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
        <TodoList open={open} snoozed={snoozed} done={done} />
      )}
    </div>
    </PageTransition>
  );
}
