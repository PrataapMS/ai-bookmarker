import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nextRemindAt } from "@/lib/todo-dates";

// Notification buttons ("Done", "Snooze 1h") post here from the service
// worker, which can't call server actions. Authenticated by the session
// cookie; only same-origin requests are accepted, so other sites can't
// trigger it with the user's cookie.

const SNOOZE_MS = 60 * 60 * 1000;

function sameOrigin(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site) return site === "same-origin";
  const origin = request.headers.get("origin");
  return origin !== null && origin === new URL(request.url).origin;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!sameOrigin(request)) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const { action } = (await request.json().catch(() => ({}))) as {
    action?: string;
  };

  const todo = await prisma.todo.findFirst({ where: { id, userId: user.id } });
  if (!todo) return Response.json({ error: "not found" }, { status: 404 });

  if (action === "done") {
    await prisma.todo.update({
      where: { id },
      data: { done: true, snoozedUntil: null, remindAt: null },
    });
  } else if (action === "snooze") {
    const snoozedUntil = new Date(Date.now() + SNOOZE_MS);
    await prisma.todo.update({
      where: { id },
      data: {
        snoozedUntil,
        remindAt: nextRemindAt({ ...todo, snoozedUntil }),
      },
    });
  } else {
    return Response.json({ error: "unknown action" }, { status: 400 });
  }

  revalidatePath("/todos");
  return Response.json({ ok: true });
}
