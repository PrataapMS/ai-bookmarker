"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { sendPushToUser } from "@/lib/push";

const subscriptionSchema = z.object({
  endpoint: z.url().max(2000),
  keys: z.object({
    p256dh: z.string().min(1).max(200),
    auth: z.string().min(1).max(100),
  }),
});

export async function savePushSubscription(sub: unknown): Promise<boolean> {
  const user = await requireUser();
  const parsed = subscriptionSchema.safeParse(sub);
  if (!parsed.success) return false;
  const { endpoint, keys } = parsed.data;
  // An endpoint is one browser profile; re-subscribing moves it to whoever
  // is signed in there now.
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    update: { userId: user.id, p256dh: keys.p256dh, auth: keys.auth },
  });
  return true;
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  const user = await requireUser();
  await prisma.pushSubscription.deleteMany({
    where: { endpoint, userId: user.id },
  });
}

export async function sendTestPush(): Promise<number> {
  const user = await requireUser();
  return sendPushToUser(user.id, {
    title: "🔔 Reminders are on",
    body: "You'll get a notification like this when a todo is due.",
    url: "/todos",
    tag: "test",
  });
}
