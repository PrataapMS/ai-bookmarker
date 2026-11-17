import "server-only";
import { prisma } from "@/lib/prisma";

/** Position that puts a new todo at the top of the user's open list. */
export async function topPosition(userId: string): Promise<number> {
  const first = await prisma.todo.aggregate({
    where: { userId, done: false },
    _min: { position: true },
  });
  return (first._min.position ?? 1) - 1;
}
