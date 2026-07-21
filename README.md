<div align="center">

# 🔖 BookmarkAI

**Paste a link, get an AI-powered reading list.**

BookmarkAI fetches any article you save, extracts the readable text, and uses
Claude to generate a summary, key takeaways, and action items — then lets you
promote those action items into a todo list and share your best finds to a
public feed.

[**Live demo → ai-bookmarker.vercel.app**](https://ai-bookmarker.vercel.app)

<br />

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Claude](https://img.shields.io/badge/Claude-via%20OpenRouter-D97757?logo=anthropic&logoColor=white)](https://openrouter.ai/)
[![Deployed on Vercel](https://img.shields.io/badge/Vercel-deployed-000000?logo=vercel&logoColor=white)](https://ai-bookmarker.vercel.app)

</div>

---

## ✨ Features

- **🤖 AI summaries** — every saved link is fetched, cleaned, and summarized by
  Claude into a short summary, **key takeaways**, and **action items**.
- **✅ Action items → todos** — promote any AI-suggested action item into a
  built-in todo list and check it off later.
- **🏷️ Auto-tagging & filtering** — Claude assigns topic tags so you can filter
  your reading list by subject.
- **🌍 Public feed** — mark bookmarks public to share them in a community feed,
  with **upvotes/downvotes** to surface the best reads.
- **⚡ Background processing** — bookmarks are saved instantly and processed
  asynchronously; the detail page polls until the summary is ready.
- **🔐 Self-contained auth** — email + password login with bcrypt hashing and a
  `jose`-signed session cookie. No third-party auth provider.

## 🧱 Tech stack

| Layer | Choice |
|---|---|
| **Framework** | Next.js 16 (App Router, server actions — no API routes) + React 19 |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS v4 |
| **Database** | PostgreSQL via Prisma 6 |
| **Auth** | `bcryptjs` password hashing + `jose`-signed JWT session cookie |
| **Extraction** | `@mozilla/readability` + `jsdom` (with an SSRF guard + size/time caps) |
| **AI** | Claude via [OpenRouter](https://openrouter.ai/), using the OpenAI SDK with structured tool-calling |
| **Hosting** | Vercel |

## 🚀 Getting started

```bash
git clone https://github.com/PrataapMS/ai-bookmarker.git
cd ai-bookmarker
npm install
cp .env.example .env        # then edit .env (see below)
npx prisma migrate dev      # applies migrations to your Postgres database
npm run dev                 # http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000), create an account, and
paste a link.

### Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (`postgres://…`) |
| `SESSION_SECRET` | Long random string for signing sessions — `openssl rand -base64 32` |
| `OPENROUTER_API_KEY` | Key from [openrouter.ai/keys](https://openrouter.ai/keys) — **required for summaries** |
| `OPENROUTER_MODEL` | e.g. `anthropic/claude-sonnet-5` (quality) or `anthropic/claude-haiku-4.5` (cheaper/faster) |
| `SIGNUP_CODE` | *(optional)* invite code that gates signups when set |

> Without `OPENROUTER_API_KEY`, bookmarks are still saved and their text
> extracted, but summarization fails with a clear "not configured" message.

## 🔍 How it works

1. **Add a link** → a `Bookmark` row is created with `status: "pending"` and
   processing kicks off in the background.
2. **Processing** ([`lib/process-bookmark.ts`](lib/process-bookmark.ts)):
   fetch the URL → extract the article
   ([`lib/extract.ts`](lib/extract.ts), with an SSRF guard + size/time caps) →
   summarize with Claude ([`lib/summarize.ts`](lib/summarize.ts), forced
   structured output) → save the summary, takeaways, action items, and tags;
   set `status: "ready"` (or `"failed"` + reason).
3. The detail page **polls** while pending and renders the result when ready.
4. **Promote** any action item into your todo list, and optionally **share** the
   bookmark to the public feed where others can vote on it.

## 📁 Project layout

```text
app/
  page.tsx               # public landing page
  login/                 # auth page (server wrapper + client form)
  actions/               # server actions: auth, bookmarks, todos
  (app)/                 # protected route group (requires a session)
    bookmarks/           # list + add form
    bookmarks/[id]/      # detail: summary, takeaways, action items
    feed/                # public community feed with voting
    todos/               # todo list
    _components/          # client components (forms, poller, badges, sidebar)
lib/
  prisma.ts  auth.ts  extract.ts  summarize.ts  process-bookmark.ts
  normalize-url.ts  tags.ts  format.ts
prisma/
  schema.prisma          # User, Bookmark, Vote, Takeaway, ActionItem, Todo
```

## 📜 Available scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | `prisma generate` + production build |
| `npm start` | Run the production build |
| `npm run lint` | Lint with ESLint |

## ☁️ Deployment

The app is deployed to **Vercel** with serverless functions pinned to the
`sin1` region to sit next to the database. A few production notes:

- **Background work** in server actions uses `after()` from `next/server` so it
  survives the serverless response lifecycle.
- Pages that trigger fetch + summarize export `maxDuration = 300`.
- Prisma **migrations are applied from a dev machine**, not during deploy — the
  Vercel build only runs `prisma generate`.

## 📄 License

Personal project — no license granted for reuse.
