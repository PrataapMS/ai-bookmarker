"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { nextRemindAt } from "@/lib/todo-dates";
import { topPosition } from "@/lib/todo-order";

const textSchema = z.string().trim().min(1).max(500);
// Instants arrive as ISO strings computed in the browser's own timezone.
const instantSchema = z.iso.datetime({ offset: true }).transform((s) => new Date(s));

export type TodoState = { error?: string } | undefined;

async function ownTodo(userId: string, todoId: string) {
  return prisma.todo.findFirst({ where: { id: todoId, userId } });
}

export async function addTodo(
  _prev: TodoState,
  formData: FormData,
): Promise<TodoState> {
  const user = await requireUser();
  const parsed = textSchema.safeParse(formData.get("text"));
  if (!parsed.success) {
    return { error: "Enter something to do." };
  }

  const rawDue = formData.get("dueAt");
  let dueAt: Date | null = null;
  if (typeof rawDue === "string" && rawDue) {
    const due = instantSchema.safeParse(rawDue);
    if (!due.success) return { error: "That due date doesn't look right." };
    dueAt = due.data;
  }
  const dueAllDay = dueAt !== null && formData.get("dueAllDay") === "1";

  await prisma.todo.create({
    data: {
      userId: user.id,
      text: parsed.data,
      position: await topPosition(user.id),
      dueAt,
      dueAllDay,
      remindAt: nextRemindAt({ done: false, dueAt, snoozedUntil: null }),
    },
  });
  revalidatePath("/todos");
  return undefined;
}

export async function toggleTodo(todoId: string): Promise<void> {
  const user = await requireUser();
  const todo = await ownTodo(user.id, todoId);
  if (!todo) return;
  const done = !todo.done;
  await prisma.todo.update({
    where: { id: todoId },
    data: {
      done,
      snoozedUntil: null,
      remindAt: nextRemindAt({ done, dueAt: todo.dueAt, snoozedUntil: null }),
    },
  });
  revalidatePath("/todos");
}

export async function setTodoDue(
  todoId: string,
  dueIso: string | null,
  allDay: boolean,
): Promise<void> {
  const user = await requireUser();
  const todo = await ownTodo(user.id, todoId);
  if (!todo) return;
  let dueAt: Date | null = null;
  if (dueIso) {
    const due = instantSchema.safeParse(dueIso);
    if (!due.success) return;
    dueAt = due.data;
  }
  await prisma.todo.update({
    where: { id: todoId },
    data: {
      dueAt,
      dueAllDay: dueAt !== null && allDay,
      remindAt: nextRemindAt({ ...todo, dueAt }),
    },
  });
  revalidatePath("/todos");
}

/** Snooze until an instant, or wake it now with `null`. */
export async function snoozeTodo(
  todoId: string,
  untilIso: string | null,
): Promise<void> {
  const user = await requireUser();
  const todo = await ownTodo(user.id, todoId);
  if (!todo) return;
  let snoozedUntil: Date | null = null;
  if (untilIso) {
    const until = instantSchema.safeParse(untilIso);
    if (!until.success || until.data <= new Date()) return;
    snoozedUntil = until.data;
  }
  await prisma.todo.update({
    where: { id: todoId },
    data: { snoozedUntil, remindAt: nextRemindAt({ ...todo, snoozedUntil }) },
  });
  revalidatePath("/todos");
}

/** Persist a new manual order for the open list (ids top to bottom). */
export async function reorderTodos(ids: string[]): Promise<void> {
  const user = await requireUser();
  const parsed = z.array(z.string().min(1)).max(1000).safeParse(ids);
  if (!parsed.success) return;
  const owned = await prisma.todo.findMany({
    where: { userId: user.id, id: { in: parsed.data } },
    select: { id: true },
  });
  const ownedIds = new Set(owned.map((t) => t.id));
  await prisma.$transaction(
    parsed.data
      .filter((id) => ownedIds.has(id))
      .map((id, position) =>
        prisma.todo.update({ where: { id }, data: { position } }),
      ),
  );
  revalidatePath("/todos");
}

export async function deleteTodo(todoId: string): Promise<void> {
  const user = await requireUser();
  await prisma.todo.deleteMany({ where: { id: todoId, userId: user.id } });
  revalidatePath("/todos");
}

export async function clearCompletedTodos(): Promise<void> {
  const user = await requireUser();
  await prisma.todo.deleteMany({ where: { userId: user.id, done: true } });
  revalidatePath("/todos");
}
