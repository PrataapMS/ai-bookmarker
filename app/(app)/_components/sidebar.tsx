"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { logout } from "@/app/actions/auth";
import { useSectionLinkClick } from "./app-history";
import { NAV_ITEMS, activeSection, sectionTransition } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function ChevronIcon({ flipped }: { flipped: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 transition-transform ${flipped ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 md:h-4 md:w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

/**
 * `account` is the signed-in email, streamed in by the layout (it needs the
 * session, which the static shell doesn't have).
 */
export function Sidebar({ account }: { account: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = activeSection(pathname, searchParams.get("from"));
  const onSectionClick = useSectionLinkClick();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Navigating away should dismiss the mobile drawer. Adjusting state during
  // render (instead of in an effect) avoids a flash of the stale drawer.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
  }

  // While the drawer is open: Escape closes it and the page behind stays put.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // The collapsed rail only exists at md and up; the mobile drawer always
  // renders fully expanded, hence the md-scoped visibility classes below.
  const hideWhenCollapsed = collapsed ? "md:hidden" : "";

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-1 border-b border-border bg-surface/80 px-3 backdrop-blur md:hidden">
        <button
          type="button"
          aria-label="Open navigation"
          onClick={() => setMobileOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-md text-muted hover:bg-background hover:text-foreground"
        >
          <MenuIcon />
        </button>
        <Link
          href="/bookmarks"
          onClick={(e) => onSectionClick(e, "/bookmarks", sectionTransition(active, "/bookmarks"))}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold"
        >
          <span className="text-lg" aria-hidden>
            🔖
          </span>
          <span>BookmarkAI</span>
        </Link>
      </header>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          aria-hidden
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-surface transition-[transform,width] duration-200 md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          collapsed ? "md:w-16" : "md:w-60"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div
          className={`flex h-14 items-center justify-between border-b border-border px-3 ${
            collapsed ? "md:justify-center md:px-0" : ""
          }`}
        >
          <Link
            href="/bookmarks"
            onClick={(e) => onSectionClick(e, "/bookmarks", sectionTransition(active, "/bookmarks"))}
            className="flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold hover:bg-background"
            title="BookmarkAI"
          >
            <span className="text-lg" aria-hidden>
              🔖
            </span>
            <span className={`truncate ${hideWhenCollapsed}`}>BookmarkAI</span>
          </Link>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted hover:bg-background hover:text-foreground md:hidden"
          >
            <CloseIcon />
          </button>
          <button
            type="button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed((c) => !c)}
            className={`hidden h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-background hover:text-foreground md:flex ${
              collapsed ? "md:absolute md:right-1 md:top-16" : ""
            }`}
          >
            <ChevronIcon flipped={collapsed} />
          </button>
        </div>

        {/* On mobile the sections live in the bottom tab bar, so the drawer
            only lists them at md+. */}
        <nav className={`hidden flex-col gap-1 p-3 text-sm font-medium md:flex ${collapsed ? "md:mt-10" : ""}`}>
          {NAV_ITEMS.map((item) => {
            const isActive = active === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => onSectionClick(e, item.href, sectionTransition(active, item.href))}
                aria-current={isActive ? "page" : undefined}
                title={item.label}
                className={`flex items-center gap-3 rounded-md px-3 py-2 transition ${
                  collapsed ? "md:justify-center md:px-0" : ""
                } ${
                  isActive
                    ? "bg-background text-foreground"
                    : "text-muted hover:bg-background hover:text-foreground"
                }`}
              >
                <span aria-hidden>{item.icon}</span>
                <span className={hideWhenCollapsed}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={`mt-auto flex flex-col gap-4 border-t border-border p-4 text-base md:gap-3 md:p-3 md:text-sm ${collapsed ? "md:items-center" : ""}`}>
          <ThemeToggle className={collapsed ? "md:flex-col" : ""} />
          <Link
            href="/install"
            title="Install the app"
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-muted transition hover:bg-background hover:text-foreground md:gap-2 ${
              collapsed ? "md:justify-center md:px-0" : ""
            }`}
          >
            <span aria-hidden>📲</span>
            <span className={hideWhenCollapsed}>Install the app</span>
          </Link>
          <span className={`truncate px-1 text-sm text-muted md:text-xs ${hideWhenCollapsed}`}>
            {account}
          </span>
          <form
            action={logout}
            className="w-full"
            // Offline copies of pages are this person's data (see public/sw.js).
            onSubmit={() => {
              if ("caches" in window) void caches.delete("pages-v1");
            }}
          >
            <button
              type="submit"
              title="Sign out"
              className={`flex w-full items-center gap-3 rounded-md border border-border px-4 py-3 text-muted transition hover:bg-background hover:text-foreground md:gap-2 md:px-3 md:py-2 ${
                collapsed ? "md:justify-center md:px-0" : ""
              }`}
            >
              <SignOutIcon />
              <span className={hideWhenCollapsed}>Sign out</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Bottom tab bar: the mobile way between sections (swiping works too). */}
      <nav
        aria-label="Sections"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-4">
          {NAV_ITEMS.map((item) => {
            const isActive = active === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => onSectionClick(e, item.href, sectionTransition(active, item.href))}
                aria-current={isActive ? "page" : undefined}
                className="flex flex-col items-center gap-0.5 pb-2 pt-1.5 text-[11px] font-medium"
              >
                <span
                  aria-hidden
                  className={`flex h-8 w-14 items-center justify-center rounded-full text-lg transition ${
                    isActive ? "bg-accent/15" : "opacity-60"
                  }`}
                >
                  {item.icon}
                </span>
                <span className={isActive ? "text-foreground" : "text-muted"}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
