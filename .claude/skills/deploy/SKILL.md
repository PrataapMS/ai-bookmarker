---
name: deploy
description: Ship BookmarkAI changes — build + lint, hand off to the user for manual verification, push, deploy to Vercel production, smoke-test the live site. Use when the user asks to deploy, ship, release, or push to production.
---

# Ship BookmarkAI changes to production

Pre-flight — read `AGENTS.md` first (commit rules, gotchas). Then follow the
pipeline in order; each step gates the next.

## 1. Automated checks — machines only, no browsing loops

- `npm run build` and `npm run lint` must pass. That is the **only** automated
  verification required. Do NOT start dev servers, mint session tokens, or
  curl authenticated pages to "see" the change working — that wastes time and
  duplicates the user's manual check in step 2. (Their dev server is usually
  already running on :3000 and hot-reloads.)
- **Migrations**: if `prisma/schema.prisma` changed, run
  `npx prisma migrate dev --name <change>` BEFORE deploying (Vercel build does
  not run migrations; the shared DB must be migrated first, and the old code
  must tolerate the new schema for the seconds until the deploy lands).

## 2. Hand off for manual verification

Stop and give the user a short checklist: which pages/flows changed and what
to look for. Wait for their explicit go-ahead. Do not push or deploy until
they confirm (or they already told you to skip verification and ship).

## 3. Commit and push

- Commit rules per `AGENTS.md`: imperative subject ≤ 72 chars, short, no
  Co-Authored-By or other trailers.
- **Small change** (rule of thumb: a handful of files, no schema, auth,
  or dependency changes) → push directly to `main`.
- **Anything larger or riskier** → ask the user where to push, offering
  `main` or a feature branch (AskUserQuestion with those two options).
- Never force-push without explicit user instruction.

## 4. Deploy

`npx vercel deploy --prod --yes` — run it **once**. If the output looks
truncated or odd, check `npx vercel ls ai-bookmarker` before re-running;
a blind re-run creates a duplicate production deployment.

## 5. Smoke test — three curls, run once

- `curl -s -o /dev/null -w "%{http_code}\n" https://ai-bookmarker.vercel.app/login` → `200`
- `curl -s -o /dev/null -w "%{http_code}\n" https://ai-bookmarker.vercel.app/` → `200` (public landing)
- `curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" https://ai-bookmarker.vercel.app/bookmarks` → `307 …/login`

Stop there. Signed-in end-to-end testing on prod is the user's job — report
the smoke-test results and hand back.

## 6. Watch logs — only on request or reported problem

If the user reports an issue while exercising the app (the CLI exits when
idle, so loop it):

`while true; do npx vercel logs <deployment-url> --json 2>/dev/null | grep --line-buffered -iE '"level":"error"|"level":"warn"'; sleep 10; done`

## Env var changes

`printf '%s' "$VALUE" | npx vercel env add NAME production` (never echo secrets
to output). After changing env vars, redeploy — they are baked in at deploy time.

## Rollback

`npx vercel ls ai-bookmarker` to list deployments, then
`npx vercel promote <previous-deployment-url>` to instantly point production
back at a known-good build (no rebuild needed).

## Known failure signature

`ERR_REQUIRE_ESM … @exodus/bytes` in runtime logs → a dependency (usually
jsdom) was upgraded past its CJS-safe major. Downgrade it (jsdom must stay v26);
see AGENTS.md "Hard-won gotchas".
