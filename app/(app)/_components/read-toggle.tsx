import { setBookmarkRead } from "@/app/actions/bookmarks";

/**
 * Owner-only toggle for a bookmark's reading lifecycle. Renders a server-action
 * form, so it works inside the feed/list overlay-link cards (keep it in a
 * `relative z-10` wrapper there so clicks don't fall through to the card link).
 *
 * `variant="card"` is a compact pill for lists; `variant="detail"` is the
 * larger control shown in the bookmark header.
 */
export function ReadToggle({
  bookmarkId,
  read,
  variant = "card",
}: {
  bookmarkId: string;
  read: boolean;
  variant?: "card" | "detail";
}) {
  const toggle = setBookmarkRead.bind(null, bookmarkId, !read);

  if (variant === "detail") {
    return (
      <form action={toggle}>
        <button
          type="submit"
          title={read ? "Return this to your reading queue" : "Mark this as read"}
          className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
            read
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400"
              : "border-border bg-surface text-muted hover:text-foreground"
          }`}
        >
          <span aria-hidden>{read ? "✓" : "○"}</span>
          {read ? "Read" : "Mark as read"}
          <span className="text-muted">· switch</span>
        </button>
      </form>
    );
  }

  return (
    <form action={toggle}>
      <button
        type="submit"
        aria-label={read ? "Mark as unread" : "Mark as read"}
        title={read ? "Return to reading queue" : "Mark as read"}
        className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition ${
          read
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400"
            : "border-border bg-background text-muted hover:border-accent/50 hover:text-foreground"
        }`}
      >
        <span aria-hidden>{read ? "✓" : "○"}</span>
        {read ? "Read" : "Mark read"}
      </button>
    </form>
  );
}
