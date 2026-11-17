---
name: deploy
description: Ship BookmarkAI changes — build + lint, hand off to the user for manual verification, open a release PR that bumps the major version; GitHub Actions then migrates, deploys to Vercel production, smoke-tests, tags and notifies Telegram. Use when the user asks to deploy, ship, release, or push to production.
---

# Ship BookmarkAI changes to production

Pre-flight — read `AGENTS.md` first (commit rules, gotchas). Then follow the
pipeline in order; each step gates the next.

Production deploys happen **only in GitHub Actions**: a push to `main` that
raises the **major** `package.json` version triggers `.github/workflows/deploy.yml`
(via `ci.yml`). Nobody runs `vercel deploy` or Prisma migrations by hand.

## 1. Automated checks — machines only, no browsing loops

- `npm run build` and `npm run lint` must pass. That is the **only** automated
  verification required. Do NOT start dev servers, mint session tokens, or
  curl authenticated pages to "see" the change working — that wastes time and
  duplicates the user's manual check in step 2. (Their dev server is usually
  already running on :3000 and hot-reloads.)
- **Migrations**: if `prisma/schema.prisma` changed, generate the SQL with
  `prisma migrate diff` as described in AGENTS.md ("Database & migrations")
  and commit the migration folder. Do NOT apply it locally; `deploy.yml` runs
  `prisma migrate deploy` right before the Vercel deploy. The migration must be
  additive so the old code tolerates the new schema for the minute until the
  deploy lands.

## 2. Hand off for manual verification

Stop and give the user a short checklist: which pages/flows changed and what
to look for. Wait for their explicit go-ahead. Do not push until they confirm
(or they already told you to skip verification and ship).

## 3. Commit and push

- Commit rules per `AGENTS.md`: imperative subject ≤ 72 chars, short, no
  Co-Authored-By or other trailers.
- **Small change** (rule of thumb: a handful of files, no schema, auth,
  or dependency changes) → push directly to `main`. This runs CI but does
  **not** deploy.
- **Anything larger or riskier** → ask the user where to push, offering
  `main` or a feature branch (AskUserQuestion with those two options).
- Never force-push without explicit user instruction.

## 4. Release (this is what deploys)

On a `release/x.0.0` branch: `npm version major --no-git-tag-version`,
commit `Release x.0.0` (package.json + package-lock.json), open a PR to `main`.
Minor and patch bumps don't deploy; their changes ship with the next major.
When the user merges it, Actions deploys. Don't push tags yourself; the
workflow creates `vX.Y.Z` and the GitHub Release after a successful deploy.

To redeploy without a version bump (e.g. after an env var change), run
**Deploy to Vercel** from the Actions tab (`gh workflow run deploy.yml`).

## 5. Watch the run

`gh run watch` (or the Actions tab). `deploy.yml` smoke-tests `/login` (200),
`/` (200) and `/bookmarks` (307 → `/login`) and posts the outcome to Telegram,
including any migrations applied and the stage that failed. Signed-in
end-to-end testing on prod is the user's job.

## 6. Watch logs — only on request or reported problem

If the user reports an issue while exercising the app (the CLI exits when
idle, so loop it):

`while true; do npx vercel logs <deployment-url> --json 2>/dev/null | grep --line-buffered -iE '"level":"error"|"level":"warn"'; sleep 10; done`

## Env var changes

`printf '%s' "$VALUE" | npx vercel env add NAME production` (never echo secrets
to output). After changing env vars, redeploy (run `deploy.yml` by hand); they
are baked in at deploy time. If `DATABASE_URL` changes, update the GitHub repo
secret too (`gh secret set DATABASE_URL`).

## Rollback

`npx vercel ls ai-bookmarker` to list deployments, then
`npx vercel promote <previous-deployment-url>` to instantly point production
back at a known-good build (no rebuild needed). Migrations are not rolled back;
write a new forward migration if one must be undone.

## Known failure signature

`ERR_REQUIRE_ESM … @exodus/bytes` in runtime logs → a dependency (usually
jsdom) was upgraded past its CJS-safe major. Downgrade it (jsdom must stay v26);
see AGENTS.md "Hard-won gotchas".
