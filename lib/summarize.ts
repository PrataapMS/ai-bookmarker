import "server-only";
import OpenAI from "openai";
import { z } from "zod";
import type { Extracted } from "./extract";

export const summarySchema = z.object({
  isWorthReading: z.boolean(),
  contentType: z.string(),
  summary: z.string(),
  keyTakeaways: z.array(z.string()),
  actionItems: z.array(z.string()),
  tags: z.array(z.string()).default([]),
});

export type Summary = z.infer<typeof summarySchema>;

// OpenAI-style function/tool schema mirroring summarySchema — forces structured
// output. OpenRouter passes this through to the underlying Claude model.
const TOOL = {
  type: "function" as const,
  function: {
    name: "save_summary",
    description:
      "Save the structured summary of the article the user bookmarked.",
    parameters: {
      type: "object",
      properties: {
        isWorthReading: {
          type: "boolean",
          description:
            "True if this is a substantive article/blog/doc worth reading; false for thin, spammy, or non-article pages.",
        },
        contentType: {
          type: "string",
          enum: ["article", "blog", "docs", "news", "reference", "other"],
          description: "The kind of content this page is.",
        },
        summary: {
          type: "string",
          description:
            "A clear 2-4 sentence overview of what the piece is about and its main point.",
        },
        keyTakeaways: {
          type: "array",
          items: { type: "string" },
          description:
            "3-7 concise bullet-point takeaways capturing the most important ideas. Empty array if none.",
        },
        actionItems: {
          type: "array",
          items: { type: "string" },
          description:
            "Concrete, actionable next steps a reader could add to a todo list. Empty array if the piece implies none.",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description:
            "2-5 short lowercase topic tags for categorizing this piece (e.g. \"ai\", \"productivity\", \"web-dev\"). Single words or hyphenated phrases only.",
        },
      },
      required: [
        "isWorthReading",
        "contentType",
        "summary",
        "keyTakeaways",
        "actionItems",
        "tags",
      ],
    },
  },
};

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "anthropic/claude-sonnet-5";
const MAX_CHARS = 24_000; // keep token cost bounded

export function isConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

export async function summarize(article: Extracted): Promise<Summary> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Summaries are not configured yet — add OPENROUTER_API_KEY to your .env file.",
    );
  }

  const client = new OpenAI({
    apiKey,
    baseURL: OPENROUTER_BASE_URL,
    // Optional attribution headers OpenRouter uses for its dashboards/rankings.
    defaultHeaders: {
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "BookmarkAI",
    },
  });
  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;

  const body = article.textContent.slice(0, MAX_CHARS);
  const truncatedNote =
    article.textContent.length > MAX_CHARS
      ? "\n\n[Note: the article was truncated for length.]"
      : "";

  const prompt = `You are summarizing a web page a user bookmarked to read later.

Title: ${article.title ?? "(unknown)"}
Source: ${article.siteName ?? "(unknown)"}

Article text:
"""
${body}${truncatedNote}
"""

Summarize it and call the save_summary tool. Write in clear, plain language. Key takeaways should be specific to the content (not generic). Action items must be things the reader could actually do — omit them if the piece doesn't imply any.`;

  const completion = await client.chat.completions.create({
    model,
    max_tokens: 1500,
    tools: [TOOL],
    tool_choice: { type: "function", function: { name: "save_summary" } },
    messages: [{ role: "user", content: prompt }],
  });

  const toolCall = completion.choices[0]?.message?.tool_calls?.[0];
  if (!toolCall || toolCall.type !== "function") {
    throw new Error("The model did not return a structured summary.");
  }

  let raw: unknown;
  try {
    raw = JSON.parse(toolCall.function.arguments);
  } catch {
    throw new Error("The summary came back as invalid JSON.");
  }

  const parsed = summarySchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("The summary came back in an unexpected shape.");
  }
  return parsed.data;
}
