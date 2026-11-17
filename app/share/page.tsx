import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { bookmarkUrlSchema, saveBookmark } from "@/lib/save-bookmark";
import { pickSharedUrl } from "@/lib/share-url";
import { AddBookmarkForm } from "@/app/(app)/_components/add-bookmark-form";

export const dynamic = "force-dynamic";
// A share kicks off fetch + extract + summarize in after(), same as the
// bookmark pages that trigger processing.
export const maxDuration = 300;

type ShareParams = { url?: string; text?: string; title?: string };

function shareHref(params: ShareParams): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const qs = query.toString();
  return qs ? `/share?${qs}` : "/share";
}

/**
 * Target of the Android share sheet (see app/manifest.ts). Saves the shared
 * link and hands straight over to the bookmark page, which already polls
 * while the summary is being generated — no paste, no extra tap.
 *
 * Writing on a GET is deliberate: saveBookmark dedupes per user, so a reload
 * or a double share lands on the same bookmark instead of duplicating it.
 */
export default async function SharePage({
  searchParams,
}: {
  searchParams: Promise<ShareParams>;
}) {
  const params = await searchParams;

  const user = await getCurrentUser();
  if (!user) {
    // Don't drop the shared link on the floor — come back here afterwards.
    redirect(`/login?next=${encodeURIComponent(shareHref(params))}`);
  }

  const shared = pickSharedUrl(params);
  const parsed = shared ? bookmarkUrlSchema.safeParse(shared) : null;

  if (!parsed?.success) {
    // Some apps share a screenshot or a bare note. Show the form rather than
    // a dead end, prefilled with whatever did come through.
    const raw = [params.url, params.text, params.title].find((v) => v?.trim());
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <h1 className="text-lg font-semibold tracking-tight">
            No link in that share
          </h1>
          <p className="mt-1 mb-4 text-sm text-muted">
            {raw
              ? "Check the link below, then save it."
              : "Paste the link you wanted to save."}
          </p>
          <AddBookmarkForm defaultValue={raw} />
        </div>
      </main>
    );
  }

  const { id } = await saveBookmark(user.id, parsed.data);
  redirect(`/bookmarks/${id}`);
}
