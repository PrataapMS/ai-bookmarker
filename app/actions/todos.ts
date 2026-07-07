"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const textSchema = z.string().trim().min(1).max(500);

export type TodoState = { error?: string } | undefined;

export async function addTodo(
  _prev: TodoState,
  formData: FormData,
): Promise<TodoState> {
  const user = await requireUser();
  const parsed = textSchema.safeParse(formData.get("text"));
  if (!parsed.success) {
    return { error: "Enter something to do." };
  }
  await prisma.todo.create({
    data: { userId: user.id, text: parsed.data },
  });
  revalidatePath("/todos");
  return undefined;
}

export async function toggleTodo(todoId: string): Promise<void> {
  const user = await requireUser();
  const todo = await prisma.todo.findFirst({
    where: { id: todoId, userId: user.id },
  });
  if (!todo) return;
  await prisma.todo.update({
    where: { id: todoId },
    data: { done: !todo.done },
  });
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
