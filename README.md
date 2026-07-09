# BookmarkAI

**Live at [ai-bookmarker.vercel.app](https://ai-bookmarker.vercel.app)** — check out the production deployment.

Save a link → the app fetches the page, extracts the article text, and uses
Claude to produce a **summary**, **key takeaways**, and **action items**.
Action items can be promoted into a built-in **todo list**. Everything is
behind a simple email + password login.

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind v4**
- **Prisma 6** + **SQLite** (local file DB)
- **Auth**: bcrypt-hashed passwords + `jose`-signed session cookie (no third party)
- **Extraction**: `@mozilla/readability` + `jsdom`
- **AI**: Claude via **OpenRouter** (`anthropic/claude-sonnet-5` by default), OpenAI-compatible SDK with structured tool-calling

## Getting started

```bash
npm install
cp .env.example .env        # then edit .env (see below)
npx prisma migrate dev      # creates the SQLite DB
npm run dev                 # http://localhost:3000
```

Open http://localhost:3000, create an account, and paste a link.

### Environment (`.env`)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | SQLite path — `file:./dev.db` by default |
| `SESSION_SECRET` | Long random string for signing sessions (`openssl rand -base64 32`) |
| `OPENROUTER_API_KEY` | Your key from https://openrouter.ai/keys — **required for summaries** |
| `OPENROUTER_MODEL` | `anthropic/claude-sonnet-5` (quality) or `anthropic/claude-haiku-4.5` (cheaper/faster) |

Without `OPENROUTER_API_KEY`, bookmarks are saved and their text is extracted,
but summarization fails with a clear "not configured" message.

## How it works

1. **Add a link** on the home page → a `Bookmark` row is created with
   `status: "pending"` and processing starts in the background.
2. **Processing** (`lib/process-bookmark.ts`): fetch the URL → extract the
   article (`lib/extract.ts`, with an SSRF guard + size/time caps) → summarize
   with Claude (`lib/summarize.ts`, forced structured output) → save summary,
   takeaways, and action items; set `status: "ready"` (or `"failed"` + reason).
3. The detail page **polls** while pending and renders the result when ready.
4. **Promote** any action item into your todo list; manage todos under `/todos`.

## Project layout

```
app/
  login/                 # auth page (server wrapper + client form)
  actions/               # server actions: auth, bookmarks, todos
  (app)/                 # protected route group (requires session)
    page.tsx             # bookmarks list + add form
    bookmarks/[id]/      # detail: summary, takeaways, action items
    todos/               # todo list
    _components/         # client components (forms, poller, badge)
lib/
  prisma.ts  auth.ts  extract.ts  summarize.ts  process-bookmark.ts
prisma/schema.prisma
```

## Production notes (beyond MVP)

- **Background processing** is fire-and-forget, which works under `next dev` /
  `next start`. On serverless (Vercel), move it to a queue or use `waitUntil`.
- **SSRF**: the guard blocks localhost/private ranges by hostname; a hardened
  version would resolve DNS and check the resolved IP.
- Swap SQLite for **Postgres** by changing the datasource provider + `DATABASE_URL`.
- Consider **rate limiting** the add-bookmark endpoint and a headless-browser
  fallback for JS-rendered / paywalled pages.
