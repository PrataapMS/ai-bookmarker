"use client";

import { useActionState, useState } from "react";
import { login, signup, type AuthState } from "@/app/actions/auth";

export function AuthForm({
  inviteRequired,
  initialMode = "login",
  next,
}: {
  inviteRequired: boolean;
  initialMode?: "login" | "signup";
  /** Path to land on after signing in, instead of /bookmarks. */
  next?: string | null;
}) {
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [loginState, loginAction, loginPending] = useActionState<
    AuthState,
    FormData
  >(login, undefined);
  const [signupState, signupAction, signupPending] = useActionState<
    AuthState,
    FormData
  >(signup, undefined);
  const state = mode === "login" ? loginState : signupState;
  const formAction = mode === "login" ? loginAction : signupAction;
  const pending = mode === "login" ? loginPending : signupPending;

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-background p-1 text-sm font-medium">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`rounded-md py-2 transition ${
            mode === "login" ? "bg-surface shadow-sm" : "text-muted"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`rounded-md py-2 transition ${
            mode === "signup" ? "bg-surface shadow-sm" : "text-muted"
          }`}
        >
          Create account
        </button>
      </div>

      <form action={formAction} className="space-y-4">
        {next && <input type="hidden" name="next" value={next} />}
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={8}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            placeholder="At least 8 characters"
          />
        </div>

        {mode === "signup" && inviteRequired && (
          <div>
            <label
              htmlFor="inviteCode"
              className="mb-1 block text-sm font-medium"
            >
              Invite code
            </label>
            <input
              id="inviteCode"
              name="inviteCode"
              type="text"
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
              placeholder="Ask the owner for a code"
            />
          </div>
        )}

        {state?.error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg transition hover:opacity-90 disabled:opacity-60"
        >
          {pending
            ? "Please wait…"
            : mode === "login"
              ? "Sign in"
              : "Create account"}
        </button>
      </form>
    </div>
  );
}
