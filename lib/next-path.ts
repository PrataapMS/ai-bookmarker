/**
 * Vet a post-login redirect target. Only same-origin absolute paths pass, so
 * a crafted `?next=` can't bounce someone to another site after signing in.
 */
export function safeNextPath(value: string | null | undefined): string | null {
  const path = value?.trim();
  if (!path) return null;
  // "//evil.com" and "/\evil.com" are protocol-relative to some parsers.
  if (!path.startsWith("/")) return null;
  if (path.startsWith("//") || path.startsWith("/\\")) return null;
  return path;
}
