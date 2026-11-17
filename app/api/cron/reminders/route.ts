import { timingSafeEqual } from "node:crypto";
import { sendDueReminders } from "@/lib/reminders";

// Called every few minutes by a scheduler (.github/workflows/reminders.yml,
// or any external cron) with `Authorization: Bearer $CRON_SECRET`.
// A route handler rather than a server action because it has no browser
// session; the shared secret is its only credential.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function GET(request: Request) {
  if (!authorized(request.headers.get("authorization"))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await sendDueReminders();
  return Response.json(result);
}
