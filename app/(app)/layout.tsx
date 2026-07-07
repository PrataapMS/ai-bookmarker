import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { logout } from "@/app/actions/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <nav className="flex items-center gap-1 text-sm font-medium">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-background"
            >
              <span className="text-lg">🔖</span>
              <span className="font-semibold">BookmarkAI</span>
            </Link>
            <Link
              href="/"
              className="rounded-md px-3 py-1.5 text-muted hover:bg-background hover:text-foreground"
            >
              Bookmarks
            </Link>
            <Link
              href="/todos"
              className="rounded-md px-3 py-1.5 text-muted hover:bg-background hover:text-foreground"
            >
              Todos
            </Link>
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-muted sm:inline">{user.email}</span>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-md border border-border px-3 py-1.5 text-muted transition hover:bg-background hover:text-foreground"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
