import "server-only";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

export type Extracted = {
  title: string | null;
  siteName: string | null;
  textContent: string;
  excerpt: string | null;
};

const FETCH_TIMEOUT_MS = 15_000;
const MAX_BYTES = 5_000_000; // 5 MB cap

/**
 * Basic SSRF guard: only allow http/https and reject obviously-internal hosts.
 * Good enough for a personal MVP; a hardened version would resolve DNS and
 * check the resolved IP against private ranges.
 */
function assertSafeUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("That doesn't look like a valid URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https links are supported.");
  }
  const host = url.hostname.toLowerCase();
  const blocked =
    host === "localhost" ||
    host === "0.0.0.0" ||
    host.endsWith(".local") ||
    host === "127.0.0.1" ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host);
  if (blocked) {
    throw new Error("Links to local or private addresses aren't allowed.");
  }
  return url;
}

export async function extractArticle(rawUrl: string): Promise<Extracted> {
  const url = assertSafeUrl(rawUrl);

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; BookmarkAI/1.0; +https://example.com/bot)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new Error("The page took too long to respond.");
    }
    throw new Error("Couldn't reach that link.");
  }

  if (!res.ok) {
    throw new Error(`Couldn't fetch the page (HTTP ${res.status}).`);
  }
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("html")) {
    throw new Error("That link isn't a readable web page.");
  }

  // Read with a size cap.
  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_BYTES) {
    throw new Error("That page is too large to process.");
  }
  const html = new TextDecoder().decode(buf);

  const dom = new JSDOM(html, { url: url.href });
  const article = new Readability(dom.window.document).parse();

  const text = article?.textContent?.trim() ?? "";
  if (!article || text.length < 200) {
    throw new Error(
      "Couldn't extract readable text — the page may be paywalled, empty, or rendered entirely with JavaScript.",
    );
  }

  return {
    title: article.title?.trim() || dom.window.document.title || null,
    siteName: article.siteName?.trim() || url.hostname,
    textContent: text,
    excerpt: article.excerpt?.trim() || null,
  };
}
