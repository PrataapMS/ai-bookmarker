import "server-only";
import webpush from "web-push";
import { prisma } from "@/lib/prisma";

// Web Push (VAPID). The same key pair must be used everywhere that shares the
// database, or subscriptions made in one place can't be reached from another.

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  /** Notifications with the same tag replace each other on the device. */
  tag?: string;
  todoId?: string;
};

let configured: boolean | null = null;

export function pushConfigured(): boolean {
  if (configured !== null) return configured;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return (configured = false);
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "https://ai-bookmarker.vercel.app",
    publicKey,
    privateKey,
  );
  return (configured = true);
}

/**
 * Sends a notification to every device the user subscribed. Subscriptions the
 * push service reports as gone (404/410) are deleted. Returns how many
 * devices accepted it.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<number> {
  if (!pushConfigured()) return 0;
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  const body = JSON.stringify(payload);
  const results = await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
          { TTL: 60 * 60 },
        );
        return true;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.deleteMany({ where: { id: s.id } });
        } else {
          console.error("push failed", status, s.endpoint.slice(0, 60));
        }
        return false;
      }
    }),
  );
  return results.filter(Boolean).length;
}
