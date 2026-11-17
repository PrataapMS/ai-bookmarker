"use server";

import { redirect, RedirectType } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { safeNextPath } from "@/lib/next-path";
import {
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
} from "@/lib/auth";

const credsSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export type AuthState = { error?: string } | undefined;

// Signing in replaces the login screen in history, so back from the app
// doesn't return to a form that would just bounce straight back in.

/** Where to land after signing in — a pending share, or the bookmark list. */
function destination(formData: FormData): string {
  return safeNextPath(String(formData.get("next") ?? "")) ?? "/bookmarks";
}

export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = credsSchema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: "Invalid email or password." };
  }

  await createSession(user.id);
  redirect(destination(formData), RedirectType.replace);
}

export async function signup(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = credsSchema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  // When SIGNUP_CODE is set (e.g. in production), registration is
  // invite-only so strangers can't create accounts and spend LLM credits.
  const requiredCode = process.env.SIGNUP_CODE;
  if (requiredCode) {
    const given = String(formData.get("inviteCode") ?? "").trim();
    if (given !== requiredCode) {
      return { error: "A valid invite code is required to create an account." };
    }
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) {
    return { error: "An account with that email already exists." };
  }

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      passwordHash: await hashPassword(parsed.data.password),
    },
  });

  await createSession(user.id);
  redirect(destination(formData), RedirectType.replace);
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/");
}
