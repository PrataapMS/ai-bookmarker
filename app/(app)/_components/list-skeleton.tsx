import { PageTransition } from "./page-transition";

/**
 * Placeholder shown by the list routes' loading.tsx while the server renders,
 * so switching tabs responds instantly. Roughly matches the real layout (and
 * the compact density) to keep the swap from jumping.
 */
export function ListSkeleton({ withForm = false }: { withForm?: boolean }) {
  return (
    <PageTransition>
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <div className="h-6 w-32 rounded-md bg-border/70" />
        <div className="h-4 w-64 max-w-full rounded-md bg-border/50" />
        {withForm && <div className="mt-4 h-11 rounded-lg bg-border/50" />}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-10 w-full rounded-xl bg-border/50 sm:w-56" />
        <div className="h-8 w-24 rounded-full bg-border/50" />
      </div>
      <div className="space-y-3 compact:space-y-1.5">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="space-y-3 rounded-xl border border-border bg-surface px-4 py-4 compact:space-y-2 compact:rounded-lg compact:px-3 compact:py-2.5 sm:px-5"
          >
            <div className="h-4 w-3/4 rounded bg-border/70" />
            <div className="h-3 w-1/3 rounded bg-border/50" />
            <div className="space-y-1.5 compact:hidden">
              <div className="h-3 rounded bg-border/40" />
              <div className="h-3 w-5/6 rounded bg-border/40" />
            </div>
          </div>
        ))}
      </div>
    </div>
    </PageTransition>
  );
}
