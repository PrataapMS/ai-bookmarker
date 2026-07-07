// Canonicalize URLs so the same article pasted twice (with a hash, a
// trailing slash, or tracking params) dedupes to one bookmark.

const TRACKING_PARAMS = new Set([
  "fbclid",
  "gclid",
  "igshid",
  "mc_cid",
  "mc_eid",
  "utm_campaign",
  "utm_content",
  "utm_medium",
  "utm_source",
  "utm_term",
]);

/**
 * Normalize a URL to its canonical form: lowercase scheme/host, no hash,
 * no tracking params, sorted query, no trailing slash (except root).
 * Returns the input unchanged if it can't be parsed.
 */
export function normalizeUrl(raw: string): string {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return raw;
  }

  u.hash = "";
  u.hostname = u.hostname.toLowerCase();
  for (const key of [...u.searchParams.keys()]) {
    if (TRACKING_PARAMS.has(key.toLowerCase()) || /^utm_/i.test(key)) {
      u.searchParams.delete(key);
    }
  }
  u.searchParams.sort();

  let out = u.toString();
  // Drop a dangling "?" left by clearing every param, and the trailing
  // slash on non-root paths ("/a/" === "/a", but keep "https://x.com/").
  out = out.replace(/\?$/, "");
  if (u.pathname !== "/" && !u.search && out.endsWith("/")) {
    out = out.slice(0, -1);
  }
  return out;
}

/**
 * Candidate strings to match against `Bookmark.url` in the database.
 * Rows created before normalization existed store the raw pasted URL,
 * so include the raw input and trailing-slash variants too.
 */
export function urlMatchKeys(raw: string): string[] {
  const normalized = normalizeUrl(raw);
  const keys = new Set([raw, normalized]);
  if (!normalized.includes("?") && !normalized.includes("#")) {
    keys.add(
      normalized.endsWith("/") ? normalized.slice(0, -1) : `${normalized}/`,
    );
  }
  return [...keys];
}
