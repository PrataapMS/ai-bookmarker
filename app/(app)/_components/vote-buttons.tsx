import { voteBookmark } from "@/app/actions/bookmarks";

function ArrowIcon({ down }: { down?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 ${down ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

/**
 * Upvote/downvote control. Server component — each arrow is a form posting a
 * bound server action, so it works without client JS.
 */
export function VoteButtons({
  bookmarkId,
  score,
  myVote,
}: {
  bookmarkId: string;
  score: number;
  myVote: number; // 1, -1, or 0
}) {
  const upvote = voteBookmark.bind(null, bookmarkId, 1 as const);
  const downvote = voteBookmark.bind(null, bookmarkId, -1 as const);

  return (
    <div className="flex items-center gap-0.5 rounded-full border border-border bg-background px-1 py-0.5">
      <form action={upvote} className="flex">
        <button
          type="submit"
          aria-label={myVote === 1 ? "Remove upvote" : "Upvote"}
          title={myVote === 1 ? "Remove upvote" : "Upvote"}
          className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
            myVote === 1
              ? "bg-accent/15 text-accent"
              : "text-muted hover:bg-surface hover:text-foreground"
          }`}
        >
          <ArrowIcon />
        </button>
      </form>
      <span
        className={`min-w-5 text-center text-sm font-semibold tabular-nums ${
          score > 0 ? "text-accent" : score < 0 ? "text-red-500" : "text-muted"
        }`}
      >
        {score}
      </span>
      <form action={downvote} className="flex">
        <button
          type="submit"
          aria-label={myVote === -1 ? "Remove downvote" : "Downvote"}
          title={myVote === -1 ? "Remove downvote" : "Downvote"}
          className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
            myVote === -1
              ? "bg-red-500/15 text-red-500"
              : "text-muted hover:bg-surface hover:text-foreground"
          }`}
        >
          <ArrowIcon down />
        </button>
      </form>
    </div>
  );
}
