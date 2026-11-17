import { PageTransition } from "../../_components/page-transition";

// Shown the moment a bookmark is tapped (Link prefetches up to this
// boundary), so opening one never looks like nothing happened while the
// server renders.
export default function Loading() {
  return (
    <PageTransition>
      <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading bookmark">
        <div className="h-4 w-28 rounded bg-border/60" />
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="h-5 w-16 rounded-full bg-border/60" />
            <div className="h-5 w-24 rounded-full bg-border/40" />
          </div>
          <div className="h-7 w-11/12 rounded-md bg-border/70" />
          <div className="h-7 w-2/3 rounded-md bg-border/70" />
          <div className="h-4 w-1/2 rounded bg-border/40" />
          <div className="flex gap-2 pt-1">
            <div className="h-8 w-24 rounded-full bg-border/50" />
            <div className="h-8 w-20 rounded-full bg-border/50" />
            <div className="h-8 w-32 rounded-full bg-border/50" />
          </div>
        </div>
        {[3, 4, 3].map((lines, i) => (
          <div key={i} className="space-y-2.5 rounded-xl border border-border bg-surface p-5">
            <div className="h-3.5 w-28 rounded bg-border/60" />
            {Array.from({ length: lines }, (_, j) => (
              <div key={j} className={`h-3.5 rounded bg-border/40 ${j === lines - 1 ? "w-3/5" : ""}`} />
            ))}
          </div>
        ))}
      </div>
    </PageTransition>
  );
}
