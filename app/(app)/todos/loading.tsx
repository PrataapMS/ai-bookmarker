import { PageTransition } from "../_components/page-transition";

export default function Loading() {
  return (
    <PageTransition>
      <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading todos">
        <div className="space-y-2">
          <div className="h-6 w-24 rounded-md bg-border/70" />
          <div className="h-4 w-56 rounded-md bg-border/50" />
          <div className="mt-4 h-11 rounded-lg bg-border/50" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3.5">
              <div className="h-5 w-5 rounded-md bg-border/60" />
              <div className={`h-3.5 rounded bg-border/50 ${i % 2 ? "w-1/2" : "w-3/4"}`} />
            </div>
          ))}
        </div>
      </div>
    </PageTransition>
  );
}
