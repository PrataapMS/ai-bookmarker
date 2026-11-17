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
- Commit message: short imperative subject ≤ 72 chars; skip the body unless the
  *why* really isn't self-evident. No technical play-by-play.
- Branching: small changes (a handful of files; no schema, auth, or dependency
  changes) may be pushed directly to `main` once the user has verified them.
  For anything larger, ask the user whether to push to `main` or a feature
  branch. Never force-push without explicit user instruction.
- Never commit `.env*` (only `.env.example`), `*.db`, or anything containing
  secrets. Secrets live in `.env` locally and in Vercel env vars for production.

## Deployment (Vercel)

- Production: https://ai-bookmarker.vercel.app — Vercel Hobby, project
  `ai-bookmarker`, scope `prtps-projects`. Functions pinned to `sin1`
  (vercel.json) to sit next to the database.
- Deploys run in GitHub Actions (no Vercel git integration). `ci.yml` lints and
  builds every PR and push to `main` and reports each build on Telegram. When a
  push to `main` raises the **major or minor** `package.json` version (e.g.
  1.2.x → 1.3.0 or 2.0.0; patch bumps never deploy), `deploy.yml` lints, builds,
  applies migrations, runs `vercel deploy --prod`, smoke-tests, tags `vX.Y.Z`
  with a GitHub Release, and reports what's new on Telegram. `deploy.yml` can also be run
  by hand from the Actions tab. Don't deploy from a laptop unless Actions is
  down. See `.claude/skills/deploy/SKILL.md` for the full pipeline.
- GitHub repo secrets used by `deploy.yml`: `DATABASE_URL`, `VERCEL_TOKEN`,
  `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `TELEGRAM_BOT_TOKEN`,
  `TELEGRAM_CHAT_ID`.
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
- Migrations are applied **only by `deploy.yml`** (`prisma migrate deploy`,
  right before the Vercel deploy). Never run `prisma migrate dev` or `migrate
  deploy` locally: against the shared DB it would apply the migration to
  production ahead of the code.
- Schema change flow: edit `prisma/schema.prisma` → write the SQL without
  touching the DB (`--from-schema-datasource` only reads it):
  `mkdir prisma/migrations/<YYYYMMDDHHMMSS>_<name> && npx prisma migrate diff
  --from-schema-datasource prisma/schema.prisma --to-schema-datamodel
  prisma/schema.prisma --script > prisma/migrations/<…>/migration.sql` →
  review the SQL → commit it with the release. Migrations must be additive
  (old code keeps running against the new schema until the deploy lands).
- The Vercel build only runs `prisma generate`.
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

- `npm run build` and `npm run lint` must pass before any commit that touches
  app code. That is the only automated verification — do NOT spin up dev
  servers, mint session cookies, or curl signed-in pages to check your own
  work. Hand the user a short checklist of what to click through instead;
  their dev server is usually already running on :3000 and hot-reloads.
- After deploying, `deploy.yml` smoke-tests production: `/login` → 200, `/`
  → 200 (public landing page), `/bookmarks` → 307 to `/login` when signed out.
- Real end-to-end (add bookmark → status `ready`) requires a signed-in browser
  session; ask the user to verify, or get approval before touching prod data.
