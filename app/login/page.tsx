import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { safeNextPath } from "@/lib/next-path";
import { AuthForm } from "./auth-form";

type LoginSearchParams = Promise<{ mode?: string; next?: string }>;

async function LoginForm({ searchParams }: { searchParams: LoginSearchParams }) {
  const { mode, next } = await searchParams;
  // Set when the user got here mid-share, so sign-in resumes that share.
  const nextPath = safeNextPath(next);

  const user = await getCurrentUser();
  if (user) redirect(nextPath ?? "/bookmarks");

  return (
    <AuthForm
      inviteRequired={Boolean(process.env.SIGNUP_CODE)}
      initialMode={mode === "signup" ? "signup" : "login"}
      next={nextPath}
    />
  );
}

export default function LoginPage({ searchParams }: { searchParams: LoginSearchParams }) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-2xl text-accent-fg">
            🔖
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">BookmarkAI</h1>
          <p className="mt-1 text-sm text-muted">
            Save a link. Get the summary, takeaways, and action items.
          </p>
        </div>
        <Suspense fallback={<div className="h-72 animate-pulse rounded-xl border border-border bg-surface" />}>
          <LoginForm searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}
