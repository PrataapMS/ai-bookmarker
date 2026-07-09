"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type TagOption = { name: string; count: number };

const optionClass = (active: boolean) =>
  `flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm transition ${
    active ? "bg-accent/10 font-medium text-accent" : "hover:bg-background"
  }`;

/**
 * Searchable tag filter. Replaces the old chip row: one compact button that
 * opens a dropdown listing every tag (with counts) plus a search box.
 * Filtering navigates via the `tag` query param on the current path, so any
 * other params (e.g. the feed's `sort`) are preserved.
 */
export function TagFilterDropdown({
  tags,
  activeTag,
}: {
  tags: TagOption[];
  activeTag?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = () => {
      setOpen(false);
      setQuery("");
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? tags.filter((t) => t.name.toLowerCase().includes(q)) : tags;
  }, [tags, query]);

  if (tags.length === 0) return null;

  const select = (tag: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (tag) params.set("tag", tag);
    else params.delete("tag");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={rootRef} className="relative">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            setOpen((o) => !o);
            setQuery("");
          }}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
            activeTag
              ? "border-accent bg-accent text-accent-fg"
              : "border-border bg-surface text-muted hover:border-accent/50 hover:text-foreground"
          }`}
        >
          <span aria-hidden>🏷️</span>
          {activeTag ? `#${activeTag}` : "Filter by tag"}
          <span aria-hidden className="text-[10px]">
            ▾
          </span>
        </button>
        {activeTag && (
          <button
            type="button"
            onClick={() => select(null)}
            aria-label="Clear tag filter"
            className="rounded-full border border-border bg-surface px-2 py-1.5 text-xs text-muted transition hover:border-accent/50 hover:text-foreground"
          >
            ✕
          </button>
        )}
      </div>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 w-64 rounded-xl border border-border bg-surface p-2 shadow-lg">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && filtered.length > 0) {
                e.preventDefault();
                select(filtered[0].name);
              }
            }}
            placeholder="Search tags…"
            aria-label="Search tags"
            className="mb-2 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
          <ul
            role="listbox"
            aria-label="Filter by tag"
            className="max-h-64 space-y-0.5 overflow-y-auto"
          >
            {!query && (
              <li>
                <button
                  type="button"
                  role="option"
                  aria-selected={!activeTag}
                  onClick={() => select(null)}
                  className={optionClass(!activeTag)}
                >
                  All tags
                </button>
              </li>
            )}
            {filtered.map((t) => (
              <li key={t.name}>
                <button
                  type="button"
                  role="option"
                  aria-selected={t.name === activeTag}
                  onClick={() => select(t.name)}
                  className={optionClass(t.name === activeTag)}
                >
                  <span className="truncate">#{t.name}</span>
                  <span className="ml-auto text-xs text-muted">{t.count}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted">
                No tags match &ldquo;{query}&rdquo;
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
