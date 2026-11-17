import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Tiny status check for StatusPoller. A plain GET instead of router.refresh()
// or a server action: those go through the router's one-at-a-time queue, so
// polling with them made taps on votes, stars or toggles wait behind every
// in-flight refresh. This just reports whether anything is still pending.

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const ids = (new URL(request.url).searchParams.get("ids") ?? "")
    .split(",")
    .filter(Boolean)
    .slice(0, 50);
  if (ids.length === 0) return Response.json({ pending: [] });

  const rows = await prisma.bookmark.findMany({
    where: { id: { in: ids }, userId: user.id, status: "pending" },
    select: { id: true },
  });
  return Response.json(
    { pending: rows.map((r) => r.id) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
