<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# BookmarkAI — agent rules

Personal reading-list app: paste a link → fetch + extract article → LLM summary,
takeaways, action items; action items promote into a todo list.

## Stack

- Next.js 16 App Router + TypeScript + Tailwind v4 (server actions, no API routes)
- Prisma 6 + Postgres (Prisma Postgres free tier, region `ap-southeast-1`)
- Custom auth: bcryptjs + `jose` JWT session cookie (NOT NextAuth) — `lib/auth.ts`
- Extraction: `@mozilla/readability` + `jsdom` — `lib/extract.ts`
- Summarization: OpenRouter via the `openai` SDK — `lib/summarize.ts`

## Git & commit rules

- **Never add `Co-Authored-By` or any other trailer to commits.** The user is the
  sole author.
- Commit message: imperative subject ≤ 72 chars; body explains *why* when the
  change isn't self-evident.
- Do not push directly to `main` from an agent session; push a feature branch and
  let the user merge/push. Never force-push without explicit user instruction.
- Never commit `.env*` (only `.env.example`), `*.db`, or anything containing
  secrets. Secrets live in `.env` locally and in Vercel env vars for production.

## Deployment (Vercel)

- Production: https://ai-bookmarker.vercel.app — Vercel Hobby, project
  `ai-bookmarker`, scope `prtps-projects`. Functions pinned to `sin1`
  (vercel.json) to sit next to the database.
- Deploys are CLI-driven (no git integration): `npx vercel deploy --prod --yes`.
  Always run `npm run build` locally first; ask the user before any production
  deploy. See `.claude/skills/deploy/SKILL.md` for the full checklist.
- Env vars (prod, managed via `npx vercel env`): `DATABASE_URL`,
  `SESSION_SECRET` (distinct from local), `OPENROUTER_API_KEY`,
  `OPENROUTER_MODEL`, `SIGNUP_CODE`.
- Runtime logs: `npx vercel logs <deployment-url> --json` (exits when idle —
  loop it to tail).

## Database & migrations

- Local `.env` points at the **same** Postgres database as production — treat
  local Prisma access as production access. Never write test/seed data or run
  destructive commands (`migrate reset`, `db push --force-reset`) without
  explicit user approval.
- Schema change flow: edit `prisma/schema.prisma` → `npx prisma migrate dev
  --name <name>` (applies to the shared DB) → commit the migration folder.
- The Vercel build only runs `prisma generate` — migrations are applied from a
  dev machine, never during deploy.
- Stay on **Prisma 6** with a plain `postgres://` URL. Prisma 7 makes driver
  adapters mandatory — do not upgrade casually.

## Hard-won gotchas (do not regress)

- **jsdom must stay on v26.** jsdom ≥27 depends on ESM-only `@exodus/bytes`;
  Next externalizes jsdom and `require()`s it at runtime, which the Vercel
  function runtime rejects (`ERR_REQUIRE_ESM`) → 500 on every add-bookmark.
  Works locally, fails only in production — that's why you won't catch it in
  `npm run build`.
- **Background work in server actions must use `after()`** from `next/server`
  (see `app/actions/bookmarks.ts`). Fire-and-forget promises die when the
  serverless function freezes after the response.
- Pages whose server actions do fetch + summarize export `maxDuration = 300`
  (`app/(app)/bookmarks/page.tsx`, `app/(app)/bookmarks/[id]/page.tsx`). Keep it on any
  new page that triggers processing.
- Signups are invite-gated when `SIGNUP_CODE` is set (prod: set; local: unset →
  open signup). Don't remove the gate — it protects the OpenRouter budget.

## Verification

- `npm run build` must pass before any commit that touches app code.
- After deploying: `curl -s -o /dev/null -w "%{http_code}" https://ai-bookmarker.vercel.app/login`
  should return 200, `/` should return 200 (public landing page), and
  `/bookmarks` should 307-redirect to `/login` when signed out.
- Real end-to-end (add bookmark → status `ready`) requires a signed-in browser
  session; ask the user to verify, or get approval before touching prod data.
