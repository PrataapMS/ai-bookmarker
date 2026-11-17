"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { previousInAppUrl, traverseWith } from "./nav-tracker";

function pathOf(url: string) {
  return new URL(url, location.href).pathname;
}

/**
 * A "← Back to …" link that behaves like a native back button: when the
 * screen it points to is the one just left, it goes back in history (instant,
 * from cache, with scroll position kept) instead of stacking a new copy of
 * it. Otherwise, e.g. when the page was opened directly, it's a normal link.
 */
export function BackLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <Link
      href={href}
      transitionTypes={["nav-back"]}
      className={className}
      onClick={(e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const previous = previousInAppUrl();
        if (!previous || pathOf(previous) !== pathOf(href)) return;
        e.preventDefault();
        traverseWith(["nav-back"], () => router.back());
      }}
    >
      {children}
    </Link>
  );
}
