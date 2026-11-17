import Link from "next/link";
import { NAV_ITEMS } from "./nav-items";

/**
 * The app chrome as it appears in the prerendered static shell, before the
 * interactive Sidebar (which needs the URL's search params) hydrates in.
 * Same layout as Sidebar, so nothing shifts when it swaps.
 */
export function NavSkeleton() {
  return (
    <>
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-1 border-b border-border bg-surface/80 px-3 backdrop-blur md:hidden">
        <span className="h-9 w-9" aria-hidden />
        <Link href="/bookmarks" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold">
          <span className="text-lg" aria-hidden>
            🔖
          </span>
          <span>BookmarkAI</span>
        </Link>
      </header>

      <aside className="hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-surface md:sticky md:top-0 md:flex">
        <div className="flex h-14 items-center border-b border-border px-3">
          <span className="flex items-center gap-2 px-2 py-1.5 text-sm font-semibold">
            <span className="text-lg" aria-hidden>
              🔖
            </span>
            BookmarkAI
          </span>
        </div>
        <nav className="flex flex-col gap-1 p-3 text-sm font-medium">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-muted"
            >
              <span aria-hidden>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <nav
        aria-label="Sections"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-0.5 pb-2 pt-1.5 text-[11px] font-medium"
            >
              <span aria-hidden className="flex h-8 w-14 items-center justify-center rounded-full text-lg opacity-60">
                {item.icon}
              </span>
              <span className="text-muted">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
