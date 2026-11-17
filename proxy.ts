import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

/*
 * Session redirects, done before rendering so they're real 307s: pages stream
 * behind a prerendered shell, which would otherwise be sent (with a 200)
 * before an in-page redirect could happen. Pages still check the session
 * themselves (requireUser); this is only the fast path.
 *
 * - Signed out on an app screen → /login.
 * - Signed in on the landing page → /bookmarks.
 */

async function hasSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get("session")?.value;
  const secret = process.env.SESSION_SECRET;
  if (!token || !secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  // Only page loads and navigations; server actions check the session
  // themselves and expect their own response, not a redirect.
  if (request.method !== "GET" && request.method !== "HEAD") return NextResponse.next();
  const signedIn = await hasSession(request);
  if (request.nextUrl.pathname === "/") {
    return signedIn
      ? NextResponse.redirect(new URL("/bookmarks", request.url))
      : NextResponse.next();
  }
  return signedIn ? NextResponse.next() : NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/", "/bookmarks/:path*", "/feed/:path*", "/starred/:path*", "/todos/:path*"],
};
