import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

const steps = [
  {
    emoji: "🔗",
    title: "Paste a link",
    body: "Drop in any article, blog post, or newsletter piece you want to read later.",
  },
  {
    emoji: "✨",
    title: "AI reads it for you",
    body: "The article is fetched, cleaned up, and summarized with key takeaways in seconds.",
  },
  {
    emoji: "✅",
    title: "Act on it",
    body: "Useful advice becomes action items you can promote straight into your todo list.",
  },
];

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/bookmarks");

  return (
    <div className="relative flex min-h-full flex-col overflow-hidden">
      {/* Accent glow behind the hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[480px]"
        style={{
          background:
            "radial-gradient(ellipse 70% 100% at 50% -20%, color-mix(in srgb, var(--accent) 22%, transparent), transparent)",
        }}
      />

      <header className="relative z-10 mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2 font-semibold">
          <span className="text-lg">🔖</span>
          BookmarkAI
        </div>
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 font-medium text-muted transition hover:text-foreground"
          >
            Sign in
          </Link>
          <Link
            href="/login?mode=signup"
            className="rounded-lg bg-accent px-4 py-2 font-semibold text-accent-fg transition hover:opacity-90"
          >
            Sign up
          </Link>
        </nav>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-4xl flex-1 px-4">
        {/* Hero */}
        <section className="pt-16 pb-12 text-center sm:pt-24">
          <p className="mb-4 inline-block rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
            Your reading list, already read
          </p>
          <h1 className="mx-auto max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
            Save a link. Get the gist.{" "}
            <span className="text-accent">Do something about it.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted sm:text-lg">
            BookmarkAI turns every article you save into a summary, key
            takeaways, and concrete action items — so your reading list stops
            being a graveyard.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="/login?mode=signup"
              className="rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-accent-fg shadow-lg transition hover:opacity-90"
              style={{
                boxShadow:
                  "0 8px 30px color-mix(in srgb, var(--accent) 35%, transparent)",
              }}
            >
              Get started — it&apos;s free
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-border bg-surface px-6 py-3 text-sm font-semibold transition hover:border-accent/50"
            >
              Sign in
            </Link>
          </div>
        </section>

        {/* Real-world example */}
        <section className="pb-14">
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-7">
            <p className="mb-4 text-xs font-semibold tracking-wide text-muted uppercase">
              For example
            </p>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm">
              <span aria-hidden>🔗</span>
              <span className="truncate text-muted">
                https://blog.example.com/how-to-run-effective-1-on-1s
              </span>
              <span className="ml-auto shrink-0 rounded-md bg-accent px-3 py-1 text-xs font-semibold text-accent-fg">
                Save
              </span>
            </div>

            <div className="my-4 text-center text-muted" aria-hidden>
              ↓
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="mb-1.5 text-xs font-semibold text-muted">
                  📝 Summary
                </p>
                <p className="text-sm">
                  Great 1-on-1s are the report&apos;s meeting: listen more than
                  you talk, and keep a shared running agenda.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="mb-1.5 text-xs font-semibold text-muted">
                  💡 Takeaways
                </p>
                <ul className="space-y-1 text-sm">
                  <li>· Don&apos;t use it for status updates</li>
                  <li>· Ask about energy, not just tasks</li>
                  <li>· Never cancel, reschedule</li>
                </ul>
              </div>
              <div className="rounded-xl border border-accent/40 bg-background p-4">
                <p className="mb-1.5 text-xs font-semibold text-muted">
                  ✅ Action items
                </p>
                <ul className="space-y-1 text-sm">
                  <li>☐ Create a shared 1-on-1 doc</li>
                  <li className="text-accent">
                    ☑ Move status to async updates
                  </li>
                </ul>
                <p className="mt-2 text-xs text-muted">
                  → promoted to your todo list
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="pb-20">
          <div className="grid gap-4 sm:grid-cols-3">
            {steps.map((s, i) => (
              <div
                key={s.title}
                className="rounded-2xl border border-border bg-surface p-5"
              >
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-base">
                    {s.emoji}
                  </span>
                  <span className="text-xs font-semibold text-muted">
                    STEP {i + 1}
                  </span>
                </div>
                <h2 className="font-semibold">{s.title}</h2>
                <p className="mt-1 text-sm text-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border py-6 text-center text-xs text-muted">
        🔖 BookmarkAI — save links, get summaries, act on what you read.
      </footer>
    </div>
  );
}
