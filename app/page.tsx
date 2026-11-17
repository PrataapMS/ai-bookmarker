import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

const steps = [
  {
    emoji: "🔗",
    title: "Paste a link",
    body: "Drop in any article, blog post, or newsletter piece you want to read later.",
    tint: "99, 102, 241", // indigo
  },
  {
    emoji: "✨",
    title: "AI reads it for you",
    body: "The article is fetched, cleaned up, and summarized with key takeaways in seconds.",
    tint: "168, 85, 247", // violet
  },
  {
    emoji: "✅",
    title: "Act on it",
    body: "Useful advice becomes action items you can promote straight into your todo list.",
    tint: "236, 72, 153", // pink
  },
];

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/bookmarks");

  return (
    <div className="relative flex min-h-full flex-col overflow-hidden">
      {/* Animated blob field behind the hero */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="blob absolute -top-40 -left-24 h-[420px] w-[420px] rounded-full opacity-60 blur-3xl"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, rgba(99,102,241,0.55), transparent 70%)",
          }}
        />
        <div
          className="blob absolute -top-24 right-[-6rem] h-[380px] w-[380px] rounded-full opacity-50 blur-3xl"
          style={{
            animationDelay: "-6s",
            background:
              "radial-gradient(circle at 60% 40%, rgba(236,72,153,0.5), transparent 70%)",
          }}
        />
        <div
          className="blob absolute top-[22rem] left-1/2 h-[340px] w-[340px] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
          style={{
            animationDelay: "-12s",
            background:
              "radial-gradient(circle at 50% 50%, rgba(168,85,247,0.45), transparent 70%)",
          }}
        />
        {/* Faint dotted grid for texture */}
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(color-mix(in srgb, var(--muted) 40%, transparent) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            maskImage:
              "radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent 75%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent 75%)",
          }}
        />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-4">
        <Link href="/bookmarks" className="flex items-center gap-2 font-semibold">
          <span
            className="bob text-lg"
            style={{ "--bob-rot": "-8deg" } as React.CSSProperties}
          >
            🔖
          </span>
          BookmarkAI
        </Link>
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
          <p
            className="rise-in mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3.5 py-1.5 text-xs font-medium text-muted backdrop-blur"
            style={{ animationDelay: "0ms" }}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            Your reading list, already read
          </p>
          <h1
            className="rise-in mx-auto max-w-2xl text-4xl font-bold tracking-tight sm:text-6xl"
            style={{ animationDelay: "80ms" }}
          >
            Save a link. Get the gist.{" "}
            <span
              className="hue-cycle bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(110deg, #6366f1, #a855f7 45%, #ec4899)",
              }}
            >
              Do something about it.
            </span>
          </h1>
          <p
            className="rise-in mx-auto mt-5 max-w-xl text-base text-muted sm:text-lg"
            style={{ animationDelay: "160ms" }}
          >
            BookmarkAI turns every article you save into a summary, key
            takeaways, and concrete action items — so your reading list stops
            being a graveyard.
          </p>
          <div
            className="rise-in mt-8 flex flex-wrap items-center justify-center gap-3"
            style={{ animationDelay: "240ms" }}
          >
            <Link
              href="/login?mode=signup"
              className="group relative overflow-hidden rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-accent-fg shadow-lg transition hover:-translate-y-0.5 active:translate-y-0"
              style={{
                boxShadow:
                  "0 8px 30px color-mix(in srgb, var(--accent) 35%, transparent)",
              }}
            >
              {/* shine sweep on hover */}
              <span
                aria-hidden
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full"
              />
              <span className="relative">Get started — it&apos;s free</span>
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-border bg-surface/70 px-6 py-3 text-sm font-semibold backdrop-blur transition hover:-translate-y-0.5 hover:border-accent/50"
            >
              Sign in
            </Link>
          </div>
        </section>

        {/* Real-world example */}
        <section className="rise-in pb-14" style={{ animationDelay: "340ms" }}>
          {/* overflow-hidden keeps the oversized spinner inside the card; left
              unclipped it covered (and swallowed clicks on) the CTA above. */}
          <div className="group relative overflow-hidden rounded-2xl p-[1px]">
            {/* animated gradient border */}
            <div
              aria-hidden
              className="spin-slow pointer-events-none absolute inset-[-40%] opacity-40 blur-sm transition-opacity group-hover:opacity-70"
              style={{
                background:
                  "conic-gradient(from 0deg, #6366f1, #a855f7, #ec4899, #6366f1)",
              }}
            />
            <div className="relative rounded-2xl border border-border bg-surface/90 p-5 backdrop-blur sm:p-7">
              <p className="mb-4 text-xs font-semibold tracking-wide text-muted uppercase">
                For example
              </p>
              <div className="relative flex items-center gap-2 overflow-hidden rounded-xl border border-border bg-background px-4 py-3 text-sm">
                {/* shimmer to imply "processing" */}
                <span
                  aria-hidden
                  className="sweep pointer-events-none absolute inset-y-0 w-1/3"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, color-mix(in srgb, var(--accent) 14%, transparent), transparent)",
                  }}
                />
                <span aria-hidden>🔗</span>
                <span className="truncate text-muted">
                  https://blog.example.com/how-to-run-effective-1-on-1s
                </span>
                <span className="ml-auto shrink-0 rounded-md bg-accent px-3 py-1 text-xs font-semibold text-accent-fg">
                  Save
                </span>
              </div>

              <div className="my-4 text-center text-lg text-accent" aria-hidden>
                <span className="bob inline-block">↓</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border bg-background p-4 transition hover:-translate-y-1 hover:border-accent/40">
                  <p className="mb-1.5 text-xs font-semibold text-muted">
                    📝 Summary
                  </p>
                  <p className="text-sm">
                    Great 1-on-1s are the report&apos;s meeting: listen more than
                    you talk, and keep a shared running agenda.
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-background p-4 transition hover:-translate-y-1 hover:border-accent/40">
                  <p className="mb-1.5 text-xs font-semibold text-muted">
                    💡 Takeaways
                  </p>
                  <ul className="space-y-1 text-sm">
                    <li>· Don&apos;t use it for status updates</li>
                    <li>· Ask about energy, not just tasks</li>
                    <li>· Never cancel, reschedule</li>
                  </ul>
                </div>
                <div className="rounded-xl border border-accent/40 bg-background p-4 transition hover:-translate-y-1 hover:border-accent">
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
          </div>
        </section>

        {/* How it works */}
        <section className="pb-20">
          <div className="grid gap-4 sm:grid-cols-3">
            {steps.map((s, i) => (
              <div
                key={s.title}
                className="rise-in group relative overflow-hidden rounded-2xl border border-border bg-surface/80 p-5 backdrop-blur transition hover:-translate-y-1 hover:shadow-lg"
                style={{ animationDelay: `${420 + i * 90}ms` }}
              >
                {/* soft color wash that blooms on hover */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                  style={{ background: `rgba(${s.tint}, 0.35)` }}
                />
                <div className="relative mb-3 flex items-center gap-2">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-base transition-transform group-hover:scale-110 group-hover:-rotate-6"
                    style={{ background: `rgba(${s.tint}, 0.14)` }}
                  >
                    {s.emoji}
                  </span>
                  <span
                    className="text-xs font-bold tracking-wider"
                    style={{ color: `rgb(${s.tint})` }}
                  >
                    STEP {i + 1}
                  </span>
                </div>
                <h2 className="relative font-semibold">{s.title}</h2>
                <p className="relative mt-1 text-sm text-muted">{s.body}</p>
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
