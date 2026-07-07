// Tags are stored lowercase, hyphenated, deduped — normalize every write path
// (LLM output and manual edits) through here so filtering works by equality.

const MAX_TAG_LENGTH = 30;
const MAX_TAGS = 8;

export function normalizeTag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, MAX_TAG_LENGTH);
}

export function normalizeTags(raw: string[]): string[] {
  return [...new Set(raw.map(normalizeTag).filter(Boolean))].slice(0, MAX_TAGS);
}
