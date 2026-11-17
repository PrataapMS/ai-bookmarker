// Markdown snippets for the copy buttons on a bookmark's detail page.

type Item = { text: string };

export function bulletsMarkdown(items: Item[]): string {
  return items.map((i) => `- ${i.text}`).join("\n");
}

export function checklistMarkdown(items: Item[]): string {
  return items.map((i) => `- [ ] ${i.text}`).join("\n");
}

export function bookmarkMarkdown(b: {
  title: string | null;
  url: string;
  summary: string | null;
  takeaways: Item[];
  actionItems: Item[];
}): string {
  const parts = [`## [${b.title ?? b.url}](${b.url})`];
  if (b.summary) parts.push(`### Summary\n\n${b.summary}`);
  if (b.takeaways.length) {
    parts.push(`### Key takeaways\n\n${bulletsMarkdown(b.takeaways)}`);
  }
  if (b.actionItems.length) {
    parts.push(`### Action items\n\n${checklistMarkdown(b.actionItems)}`);
  }
  return parts.join("\n\n");
}
