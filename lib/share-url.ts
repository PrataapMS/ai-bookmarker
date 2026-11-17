// Android's share sheet is inconsistent about where the link ends up.
// Chrome fills `url`, but plenty of apps leave it empty and send something
// like "Some title https://example.com/post" as `text` instead.

const FIRST_URL = /https?:\/\/[^\s<>"']+/i;

/** Punctuation that trails a URL in prose rather than belonging to it. */
const TRAILING_PUNCTUATION = /[.,;:!?)\]}>"']+$/;

/**
 * Pull the shared link out of a share-target payload, or null if there
 * isn't one. `url` wins when present (it may lack a scheme — the bookmark
 * URL schema adds one); otherwise scan the free text.
 */
export function pickSharedUrl({
  url,
  text,
  title,
}: {
  url?: string;
  text?: string;
  title?: string;
}): string | null {
  const direct = url?.trim();
  if (direct) return direct;

  for (const field of [text, title]) {
    const found = field?.match(FIRST_URL)?.[0];
    if (found) return found.replace(TRAILING_PUNCTUATION, "");
  }
  return null;
}
