import Link from "next/link";

/**
 * Horizontal row of tag chips for filtering a list. Server component; the
 * caller supplies hrefs so each page keeps its own extra query params.
 */
export function TagFilterBar({
  tags,
  activeTag,
  hrefFor,
}: {
  tags: string[];
  activeTag?: string;
  hrefFor: (tag: string | null) => string;
}) {
  if (tags.length === 0) return null;

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs font-medium transition ${
      active
        ? "border-accent bg-accent text-accent-fg"
        : "border-border bg-surface text-muted hover:border-accent/50 hover:text-foreground"
    }`;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Link href={hrefFor(null)} className={chip(!activeTag)}>
        All
      </Link>
      {tags.map((tag) => (
        <Link key={tag} href={hrefFor(tag)} className={chip(tag === activeTag)}>
          #{tag}
        </Link>
      ))}
    </div>
  );
}
