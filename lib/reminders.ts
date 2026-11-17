import "server-only";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";
import { nextRemindAt } from "@/lib/todo-dates";

// Reminders older than this when the scheduler finally runs are dropped
// rather than sent hours late.
const STALE_MS = 6 * 60 * 60 * 1000;
const BATCH = 200;

/**
 * Sends a push for every todo whose reminder time has passed. Each todo is
 * claimed by moving its `remindAt` on (to null, or to a later due time)
 * before sending, so overlapping scheduler runs never notify twice.
 */
export async function sendDueReminders(now = new Date()) {
  const staleBefore = new Date(now.getTime() - STALE_MS);
  const { count: dropped } = await prisma.todo.updateMany({
    where: { remindAt: { lt: staleBefore } },
    data: { remindAt: null },
  });

  const due = await prisma.todo.findMany({
    where: { done: false, remindAt: { lte: now, gte: staleBefore } },
    orderBy: { remindAt: "asc" },
    take: BATCH,
    select: {
      id: true,
      userId: true,
      text: true,
      remindAt: true,
      dueAt: true,
      dueAllDay: true,
      snoozedUntil: true,
    },
  });

  let sent = 0;
  for (const t of due) {
    // A snooze ending before the due time still leaves the due reminder.
    const { count } = await prisma.todo.updateMany({
      where: { id: t.id, remindAt: t.remindAt },
      data: { remindAt: nextRemindAt({ done: false, ...t }, now) },
    });
    if (count !== 1) continue;

    const fromSnooze =
      t.snoozedUntil !== null &&
      t.remindAt !== null &&
      t.snoozedUntil.getTime() === t.remindAt.getTime();
    const body = fromSnooze
      ? "Back from snooze"
      : t.dueAllDay
        ? "Due today"
        : "Due now";

    sent += await sendPushToUser(t.userId, {
      title: t.text.length > 120 ? `${t.text.slice(0, 117)}...` : t.text,
      body,
      url: "/todos",
      tag: `todo-${t.id}`,
      todoId: t.id,
    });
  }

  return { checked: due.length, sent, dropped };
}
