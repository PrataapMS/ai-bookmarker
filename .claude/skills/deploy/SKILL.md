---
name: deploy
description: Build, verify, and deploy BookmarkAI to Vercel production, then smoke-test the live site. Use when the user asks to deploy, ship, release, or push to production.
---

# Deploy BookmarkAI to production

Pre-flight — read `AGENTS.md` first (commit rules, gotchas). Then:

1. **Clean tree check**: `git status` — uncommitted app changes should be
   committed (no Co-Authored-By trailers) before deploying so the deployment is
   reproducible.
2. **Migrations**: if `prisma/schema.prisma` changed, run
   `npx prisma migrate dev --name <change>` BEFORE deploying (Vercel build does
   not run migrations; the shared DB must be migrated first, and the old code
   must tolerate the new schema for the seconds until the deploy lands).
3. **Local build**: `npm run build` — must pass.
4. **Confirm with the user** before the production deploy (policy blocks
   unattended prod deploys anyway).
5. **Deploy**: `npx vercel deploy --prod --yes`
6. **Smoke test**:
   - `curl -s -o /dev/null -w "%{http_code}\n" https://ai-bookmarker.vercel.app/login` → `200`
   - `curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" https://ai-bookmarker.vercel.app/` → `307 …/login`
7. **Watch logs** while the user exercises the app (the CLI exits when idle, so
   loop it):
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
