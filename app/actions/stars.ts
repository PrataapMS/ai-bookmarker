"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

/**
 * Star or unstar a bookmark for the current user. Works on your own bookmarks
 * (private or public) and on anyone's public bookmark. Idempotent: the client
 * sends the desired state, so double clicks can't desync it.
 */
export async function setStarred(
  bookmarkId: string,
  starred: boolean,
): Promise<void> {
  const user = await requireUser();

  if (starred) {
    const visible = await prisma.bookmark.findFirst({
      where: { id: bookmarkId, OR: [{ userId: user.id }, { isPublic: true }] },
      select: { id: true },
    });
    if (!visible) return;
    // skipDuplicates makes a concurrent double-star a no-op instead of a
    // unique-constraint error.
    await prisma.star.createMany({
      data: [{ userId: user.id, bookmarkId }],
      skipDuplicates: true,
    });
  } else {
    await prisma.star.deleteMany({ where: { userId: user.id, bookmarkId } });
  }

  revalidatePath("/starred");
  revalidatePath("/bookmarks");
  revalidatePath("/feed");
  revalidatePath(`/bookmarks/${bookmarkId}`);
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * "Surprise me": jump to a random unread pick. `queue` draws from your own
 * reading queue first and falls back to the feed; `feed` draws from other
 * people's public bookmarks.
 */
export async function surpriseMe(source: "queue" | "feed"): Promise<void> {
  const user = await requireUser();

  if (source === "queue") {
    const queue = await prisma.bookmark.findMany({
      where: { userId: user.id, status: "ready", readAt: null },
      select: { id: true },
    });
    if (queue.length > 0) redirect(`/bookmarks/${pick(queue).id}`);
  }

  // Prefer things you haven't starred or voted on yet: fresh finds.
  const feedWhere = {
    isPublic: true,
    status: "ready",
    userId: { not: user.id },
  };
  const fresh = await prisma.bookmark.findMany({
    where: {
      ...feedWhere,
      stars: { none: { userId: user.id } },
      votes: { none: { userId: user.id } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true },
  });
  const candidates =
    fresh.length > 0
      ? fresh
      : await prisma.bookmark.findMany({
          where: feedWhere,
          orderBy: { createdAt: "desc" },
          take: 200,
          select: { id: true },
        });

  if (candidates.length > 0)
    redirect(`/bookmarks/${pick(candidates).id}?from=/feed`);
  redirect(source === "feed" ? "/feed" : "/bookmarks");
}
