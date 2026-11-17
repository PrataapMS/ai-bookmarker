/** The app's top-level sections, in tab-bar and swipe order. */
export const NAV_ITEMS = [
  { href: "/bookmarks", label: "Bookmarks", icon: "📑" },
  { href: "/feed", label: "Feed", icon: "🌐" },
  { href: "/starred", label: "Starred", icon: "⭐" },
  { href: "/todos", label: "Todos", icon: "✅" },
] as const;

/**
 * The section to highlight. A bookmark opened from the feed (or Starred)
 * keeps that tab highlighted, even though its URL lives under /bookmarks/[id].
 */
export function activeSection(pathname: string, from: string | null): string | undefined {
  const fromSection = NAV_ITEMS.find((item) => from?.startsWith(item.href))?.href;
  return fromSection ?? NAV_ITEMS.find((item) => pathname.startsWith(item.href))?.href;
}

/** Slide direction for moving between two sections. */
export function sectionTransition(fromHref: string | undefined, toHref: string): string[] {
  const from = NAV_ITEMS.findIndex((item) => item.href === fromHref);
  const to = NAV_ITEMS.findIndex((item) => item.href === toHref);
  if (from < 0 || to < 0 || from === to) return [];
  return [to > from ? "nav-forward" : "nav-back"];
}
