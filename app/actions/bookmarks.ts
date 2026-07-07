"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { processBookmark } from "@/lib/process-bookmark";
import { normalizeTag, normalizeTags } from "@/lib/tags";

const urlSchema = z
  .string()
  .trim()
  .min(1, "Paste a link first.")
  .transform((v) => (/^https?:\/\//i.test(v) ? v : `https://${v}`))
  .pipe(z.string().url("That doesn't look like a valid link."));

export type AddState = { error?: string } | undefined;

export async function addBookmark(
  _prev: AddState,
  formData: FormData,
): Promise<AddState> {
  const user = await requireUser();

  const parsed = urlSchema.safeParse(formData.get("url"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid link." };
  }

  const bookmark = await prisma.bookmark.create({
    data: {
      userId: user.id,
      url: parsed.data,
      status: "pending",
    },
  });

  // Process after the response is sent; on serverless this keeps the
  // function alive (waitUntil) instead of dying with the request.
  after(() => processBookmark(bookmark.id));

  revalidatePath("/bookmarks");
  redirect(`/bookmarks/${bookmark.id}`);
}

export async function retryBookmark(bookmarkId: string): Promise<void> {
  const user = await requireUser();
  const bookmark = await prisma.bookmark.findFirst({
    where: { id: bookmarkId, userId: user.id },
  });
  if (!bookmark) return;

  await prisma.bookmark.update({
    where: { id: bookmarkId },
    data: { status: "pending", error: null },
  });
  after(() => processBookmark(bookmarkId));
  revalidatePath(`/bookmarks/${bookmarkId}`);
  revalidatePath("/bookmarks");
}

export async function deleteBookmark(bookmarkId: string): Promise<void> {
  const user = await requireUser();
  await prisma.bookmark.deleteMany({
    where: { id: bookmarkId, userId: user.id },
  });
  revalidatePath("/bookmarks");
  redirect("/bookmarks");
}

/** Flip a bookmark between private and public (owner only). */
export async function toggleBookmarkVisibility(bookmarkId: string): Promise<void> {
  const user = await requireUser();
  const bookmark = await prisma.bookmark.findFirst({
    where: { id: bookmarkId, userId: user.id },
    select: { isPublic: true },
  });
  if (!bookmark) return;

  await prisma.bookmark.update({
    where: { id: bookmarkId },
    data: { isPublic: !bookmark.isPublic },
  });
  revalidatePath(`/bookmarks/${bookmarkId}`);
  revalidatePath("/bookmarks");
  revalidatePath("/feed");
}

/** Add a tag to a bookmark (owner only). */
export async function addBookmarkTag(
  bookmarkId: string,
  formData: FormData,
): Promise<void> {
  const user = await requireUser();
  const tag = normalizeTag(String(formData.get("tag") ?? ""));
  if (!tag) return;

  const bookmark = await prisma.bookmark.findFirst({
    where: { id: bookmarkId, userId: user.id },
    select: { tags: true },
  });
  if (!bookmark) return;

  await prisma.bookmark.update({
    where: { id: bookmarkId },
    data: { tags: normalizeTags([...bookmark.tags, tag]) },
  });
  revalidatePath(`/bookmarks/${bookmarkId}`);
  revalidatePath("/bookmarks");
  revalidatePath("/feed");
}

/** Remove a tag from a bookmark (owner only). */
export async function removeBookmarkTag(
  bookmarkId: string,
  tag: string,
): Promise<void> {
  const user = await requireUser();
  const bookmark = await prisma.bookmark.findFirst({
    where: { id: bookmarkId, userId: user.id },
    select: { tags: true },
  });
  if (!bookmark) return;

  await prisma.bookmark.update({
    where: { id: bookmarkId },
    data: { tags: bookmark.tags.filter((t) => t !== tag) },
  });
  revalidatePath(`/bookmarks/${bookmarkId}`);
  revalidatePath("/bookmarks");
  revalidatePath("/feed");
}

/**
 * Cast, switch, or clear a vote on a public bookmark (or your own).
 * Clicking the same direction again removes the vote.
 */
export async function voteBookmark(
  bookmarkId: string,
  value: 1 | -1,
): Promise<void> {
  const user = await requireUser();
  if (value !== 1 && value !== -1) return;

  const bookmark = await prisma.bookmark.findFirst({
    where: { id: bookmarkId, OR: [{ isPublic: true }, { userId: user.id }] },
    select: { id: true },
  });
  if (!bookmark) return;

  const existing = await prisma.vote.findUnique({
    where: { userId_bookmarkId: { userId: user.id, bookmarkId } },
  });

  if (existing?.value === value) {
    await prisma.vote.delete({ where: { id: existing.id } });
  } else {
    await prisma.vote.upsert({
      where: { userId_bookmarkId: { userId: user.id, bookmarkId } },
      create: { userId: user.id, bookmarkId, value },
      update: { value },
    });
  }
  revalidatePath("/feed");
  revalidatePath(`/bookmarks/${bookmarkId}`);
}

/** Promote an action item into the user's todo list (idempotent). */
export async function promoteActionItem(actionItemId: string): Promise<void> {
  const user = await requireUser();

  const item = await prisma.actionItem.findFirst({
    where: { id: actionItemId, bookmark: { userId: user.id } },
  });
  if (!item || item.promotedToTodo) return;

  await prisma.$transaction([
    prisma.todo.create({
      data: {
        userId: user.id,
        text: item.text,
        sourceActionItemId: item.id,
      },
    }),
    prisma.actionItem.update({
      where: { id: item.id },
      data: { promotedToTodo: true },
    }),
  ]);

  revalidatePath(`/bookmarks/${item.bookmarkId}`);
  revalidatePath("/todos");
}
