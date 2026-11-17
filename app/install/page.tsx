import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { InstallButton } from "./install-button";

export const metadata: Metadata = { title: "Install BookmarkAI" };

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
        {n}
      </span>
      <span className="pt-0.5">{children}</span>
    </li>
  );
}

function Card({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
        <span aria-hidden>{icon}</span>
        {title}
      </h2>
      <div className="space-y-3 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

const code = "rounded bg-background px-1.5 py-0.5 font-mono text-xs break-all";

export default function InstallPage() {
  return (
    <Suspense fallback={null}>
      <InstallGuide />
    </Suspense>
  );
}

// Needs the request (host for the bookmarklet, session for the back link).
async function InstallGuide() {
  const [user, h] = await Promise.all([getCurrentUser(), headers()]);
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "ai-bookmarker.vercel.app";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;
  const shareBase = `${origin}/share?url=`;
  const bookmarklet = `javascript:location.href='${shareBase}'+encodeURIComponent(location.href)`;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 px-4 py-8">
      <Link
        href={user ? "/bookmarks" : "/"}
        className="text-sm text-muted hover:text-foreground"
      >
        ← {user ? "Back to bookmarks" : "Home"}
      </Link>

      <header className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight">📲 Install BookmarkAI</h1>
        <p className="text-sm text-muted">
          Install it like an app: its own icon, full screen, quick to open, and
          pages you&apos;ve opened keep working offline. Nothing to download
          from an app store.
        </p>
        <InstallButton />
      </header>

      <Card icon="🤖" title="Android">
        <ol className="space-y-2">
          <Step n={1}>Open this site in Chrome (or Edge, Samsung Internet).</Step>
          <Step n={2}>
            Tap <b>Install BookmarkAI</b> above, or the browser menu <b>⋮</b> →{" "}
            <b>Install app</b>.
          </Step>
          <Step n={3}>
            To save a link from any app, tap <b>Share</b> → <b>BookmarkAI</b>. It&apos;s
            summarized straight away.
          </Step>
        </ol>
      </Card>

      <Card icon="🍎" title="iPhone and iPad">
        <ol className="space-y-2">
          <Step n={1}>Open this site in <b>Safari</b>.</Step>
          <Step n={2}>
            Tap <b>Share</b> (the square with an arrow) → <b>Add to Home Screen</b> →{" "}
            <b>Add</b>.
          </Step>
          <Step n={3}>
            Open BookmarkAI from the Home Screen and sign in. For due-date
            reminders, go to <b>Todos</b> → <b>Turn on due-date reminders</b> (iOS
            16.4 or later).
          </Step>
        </ol>
      </Card>

      <Card icon="📤" title="Share links from iPhone and iPad">
        <p className="text-muted">
          iOS doesn&apos;t let web apps appear in the share sheet, so a one-time
          Shortcut does the job. It takes about a minute to set up.
        </p>
        <ol className="space-y-2">
          <Step n={1}>
            Open the <b>Shortcuts</b> app and tap <b>+</b>. Name it{" "}
            <b>Save to BookmarkAI</b>.
          </Step>
          <Step n={2}>
            Open the shortcut&apos;s settings (<b>ⓘ</b>) and turn on{" "}
            <b>Show in Share Sheet</b>. In the first block, set the input to{" "}
            <b>URLs</b> and <b>Safari web pages</b>.
          </Step>
          <Step n={3}>
            Add the action <b>URL Encode</b> (it encodes the <b>Shortcut Input</b>).
          </Step>
          <Step n={4}>
            Add a <b>Text</b> action containing <code className={code}>{shareBase}</code>{" "}
            followed by the variable <b>URL Encoded Text</b>.
          </Step>
          <Step n={5}>
            Add <b>Open URLs</b> (it opens the Text). Tap <b>Done</b>.
          </Step>
          <Step n={6}>
            In Safari or any app: <b>Share</b> → <b>Save to BookmarkAI</b>. Allow it
            the first time it asks.
          </Step>
        </ol>
        <p className="text-xs text-muted">
          The Shortcut opens Safari, which keeps its own sign-in separate from
          the Home Screen app, so sign in once in Safari too.
        </p>
      </Card>

      <Card icon="💻" title="Mac, Windows and Linux">
        <ol className="space-y-2">
          <Step n={1}>
            <b>Chrome or Edge:</b> click the install icon at the right of the
            address bar, or <b>Install BookmarkAI</b> above.
          </Step>
          <Step n={2}>
            <b>Safari on Mac:</b> <b>File</b> → <b>Add to Dock</b>.
          </Step>
          <Step n={3}>
            To save the page you&apos;re reading in one click, drag this button
            to your bookmarks bar:{" "}
            <span
              // React blocks javascript: URLs in href, so the bookmarklet is raw HTML.
              dangerouslySetInnerHTML={{
                __html: `<a href="${bookmarklet.replace(/"/g, "&quot;")}" class="inline-block rounded-lg border border-accent/40 bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent" onclick="event.preventDefault();alert('Drag this button to your bookmarks bar.')">🔖 Save to BookmarkAI</a>`,
              }}
            />
          </Step>
        </ol>
      </Card>

      <Card icon="📡" title="Offline">
        <p>
          Bookmarks, summaries and todos you&apos;ve opened on a device stay readable
          when you lose signal. Saving new links, voting and editing todos need
          a connection. Offline copies are removed when you sign out.
        </p>
      </Card>
    </div>
  );
}
