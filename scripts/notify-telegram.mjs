// Reports CI builds and production deploys on Telegram. Run by GitHub Actions; never part of the app build.
//
//   node scripts/notify-telegram.mjs build    end of a CI run with no deploy (ci.yml): pass or fail, and what changed
//   node scripts/notify-telegram.mjs deploy   end of a CI run that deployed, or a manual deploy.yml run:
//                                             what's new, or the stage where it failed
//
// Needs TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID; without them it prints the message and exits.
// build reads BUILD_RESULT, WILL_DEPLOY, EVENT_NAME, REF_NAME, BEFORE, AFTER, COMPARE_URL, PR_* and RUN_URL.
// deploy reads JOB_STATUS, the *_OUTCOME of each deploy step, MIGRATIONS, DEPLOYMENT_URL, SITE_URL and RUN_URL.
// Both read GITHUB_SERVER_URL and GITHUB_REPOSITORY.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const APP = 'BookmarkAI';
const TELEGRAM_LIMIT = 4096;
const MAX_BULLETS = 8;
const ATTEMPTS = 4;
const RETRY_DELAY_MS = 10_000;
const REQUEST_TIMEOUT_MS = 30_000;

const env = (name, fallback = '') => process.env[name] || fallback;
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const escapeHtml = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const link = (url, label) => `<a href="${escapeHtml(url)}">${escapeHtml(label)}</a>`;
const failed = (outcome) => outcome === 'failure' || outcome === 'cancelled';
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const ZERO_SHA = /^0+$/;
const RELEASE_COMMIT = /^Release v?\d+\.\d+\.\d+$/i;
// Paths that never reach users: commits touching only these are maintenance, not features.
const NOT_SHIPPED = [
  ':(exclude).github',
  ':(exclude).claude',
  ':(exclude)scripts',
  ':(exclude)docs',
  ':(exclude)*.md',
  ':(exclude)package-lock.json',
];
const repoUrl = () =>
  env('GITHUB_SERVER_URL') && env('GITHUB_REPOSITORY')
    ? `${env('GITHUB_SERVER_URL')}/${env('GITHUB_REPOSITORY')}`
    : '';
const version = () => JSON.parse(readFileSync('package.json', 'utf8')).version;

function commitExists(sha) {
  if (!sha || ZERO_SHA.test(sha)) return false;
  try {
    git('cat-file', '-e', `${sha}^{commit}`);
    return true;
  } catch {
    return false;
  }
}

function versionAt(sha) {
  try {
    return JSON.parse(git('show', `${sha}:package.json`)).version;
  } catch {
    return undefined;
  }
}

const subjects = (...args) =>
  git('log', '--no-merges', '--format=%s', ...args)
    .split('\n')
    .filter(Boolean);

function bulletList(items) {
  const shown = items.slice(0, MAX_BULLETS).map((item) => `• ${escapeHtml(item)}`);
  if (items.length > MAX_BULLETS) shown.push(`• and ${items.length - MAX_BULLETS} more`);
  return shown.join('\n');
}

/** The newest version tag other than this one, or undefined for the first release. */
function previousTag(tag) {
  return git('tag', '--list', 'v[0-9]*', '--merged', 'HEAD', '--sort=-v:refname')
    .split('\n')
    .find((t) => t && t !== tag);
}

/** What a failure at each stage means for production, in deploy order. */
function failureNote(migrations) {
  const applied = migrations.length ? ` (${migrations.join(', ')})` : '';
  if (failed(env('VERIFY_OUTCOME'))) {
    return ['Lint or build', 'Nothing was deployed; production and the database are unchanged.'];
  }
  if (failed(env('MIGRATE_OUTCOME'))) {
    return [
      'Database migration',
      `Migration${applied} did not complete; check _prisma_migrations before retrying. ` +
        'Production still runs the previous version.',
    ];
  }
  if (failed(env('VERCEL_OUTCOME'))) {
    return [
      'Vercel deploy',
      migrations.length
        ? `⚠️ The database was migrated${applied}, but production still runs the previous version.`
        : 'Production still runs the previous version.',
    ];
  }
  if (failed(env('SMOKE_OUTCOME'))) {
    return [
      'Smoke test',
      '⚠️ The new version is live but failed its smoke test. Roll back with ' +
        '<code>npx vercel promote &lt;previous-deployment-url&gt;</code> if it is broken.',
    ];
  }
  return ['Setup', 'Nothing was deployed; production and the database are unchanged.'];
}

function deployMessage() {
  const tag = `v${version()}`;
  const status = env('JOB_STATUS', 'success');
  const migrations = env('MIGRATIONS').split(',').filter(Boolean);
  const runUrl = env('RUN_URL');
  const siteUrl = env('SITE_URL');
  const deploymentUrl = env('DEPLOYMENT_URL');
  const repo = repoUrl();

  // The release step failing alone still means the new version is live.
  const releaseFailed = failed(env('RELEASE_OUTCOME'));
  const liveSteps = ['VERIFY_OUTCOME', 'MIGRATE_OUTCOME', 'VERCEL_OUTCOME', 'SMOKE_OUTCOME'];
  if (status !== 'success' && !(releaseFailed && liveSteps.every((s) => env(s) === 'success'))) {
    const [stage, note] = failureNote(migrations);
    const outcome = status === 'cancelled' ? 'was cancelled' : 'failed';
    const lines = [
      `❌ <b>${APP} ${escapeHtml(tag)}</b> deploy ${outcome}`,
      '',
      `Stage: ${escapeHtml(stage)}`,
      note,
    ];
    if (runUrl) lines.push('', link(runUrl, 'Open the workflow run'));
    return lines.join('\n');
  }

  const since = previousTag(tag);
  const range = since ? [`${since}..HEAD`] : ['-1'];
  // Features: commits that changed the app, minus the version bump itself.
  const features = subjects(...range, '--', '.', ...NOT_SHIPPED).filter((s) => !RELEASE_COMMIT.test(s));
  const maintenance = subjects(...range).filter((s) => !RELEASE_COMMIT.test(s)).length - features.length;
  const lines = [`🚀 <b>${APP} ${escapeHtml(tag)}</b> is live`, ''];
  if (features.length) {
    lines.push(`✨ What's new${since ? ` since ${escapeHtml(since)}` : ''}:`, bulletList(features));
  } else {
    lines.push('No app changes, only a redeploy.');
  }
  if (maintenance > 0) lines.push('', `Plus ${plural(maintenance, 'maintenance commit')} (CI, docs, tooling).`);
  if (migrations.length) {
    lines.push('', '🗄 Migrations applied:', bulletList(migrations));
  }
  if (releaseFailed) {
    lines.push('', `⚠️ The ${escapeHtml(tag)} tag and GitHub Release were not created.`);
  }
  const links = [];
  if (siteUrl) links.push(link(siteUrl, `Open ${APP}`));
  if (repo && !releaseFailed) links.push(link(`${repo}/releases/tag/${tag}`, 'Release notes'));
  if (repo && since) links.push(link(`${repo}/compare/${since}...${tag}`, 'Changes'));
  if (deploymentUrl) links.push(link(deploymentUrl, 'Deployment'));
  if (links.length) lines.push('', links.join(' · '));
  return lines.join('\n');
}

/** One CI run: pull request or branch push, pass or fail. */
function buildMessage() {
  const result = env('BUILD_RESULT', 'success');
  const passed = result === 'success';
  const icon = passed ? '✅' : '❌';
  const outcome = passed ? 'build passed' : result === 'cancelled' ? 'build cancelled' : 'build failed';
  const runUrl = env('RUN_URL');
  const lines = [];

  if (env('EVENT_NAME') === 'pull_request') {
    const pr = `PR #${env('PR_NUMBER')}`;
    lines.push(`${icon} <b>${APP}</b> · ${escapeHtml(pr)} · ${outcome}`, '', escapeHtml(env('PR_TITLE')));
    if (env('PR_BRANCH')) lines.push(`<i>${escapeHtml(env('PR_BRANCH'))}</i>`);
    const links = [];
    if (env('PR_URL')) links.push(link(env('PR_URL'), 'Open the PR'));
    if (runUrl) links.push(link(runUrl, 'Run'));
    if (links.length) lines.push('', links.join(' · '));
    return lines.join('\n');
  }

  const branch = env('REF_NAME', 'main');
  const after = env('AFTER', 'HEAD');
  // A new branch, a force push or a manual run has no usable "before"; describe the last commit only.
  const before = env('BEFORE');
  const base = commitExists(before) ? before : undefined;
  const commits = base ? subjects(`${base}..${after}`) : subjects('-1', after);
  lines.push(`${icon} <b>${APP}</b> · ${escapeHtml(branch)} · ${outcome} · ${plural(commits.length, 'commit')}`, '');
  lines.push(bulletList(commits));

  const oldVersion = base ? versionAt(base) : undefined;
  const newVersion = versionAt(after);
  if (oldVersion && newVersion && oldVersion !== newVersion) {
    const deploying = passed && env('WILL_DEPLOY') === 'true';
    lines.push(
      '',
      `🏷 Version ${escapeHtml(oldVersion)} → ${escapeHtml(newVersion)}. ` +
        (deploying
          ? 'Release bump: deploying to production now.'
          : passed
            ? 'Patch bump only, so production is unchanged.'
            : 'Not deployed: the build failed.'),
    );
  }
  const links = [];
  if (env('COMPARE_URL')) links.push(link(env('COMPARE_URL'), 'Changes'));
  if (runUrl) links.push(link(runUrl, 'Run'));
  if (links.length) lines.push('', links.join(' · '));
  return lines.join('\n');
}

async function send(text) {
  // Tolerate stray whitespace and a pasted "bot" prefix (it belongs in the URL, not the token).
  const token = env('TELEGRAM_BOT_TOKEN')
    .trim()
    .replace(/^bot(?=\d)/, '');
  const chatId = env('TELEGRAM_CHAT_ID').trim();
  if (!token || !chatId) {
    console.warn('TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set; skipping the notification.');
    console.info(text);
    return;
  }
  // Describe a malformed secret without printing it; Telegram only answers 404 for these.
  if (!/^\d+:[\w-]+$/.test(token)) {
    throw new Error(
      'TELEGRAM_BOT_TOKEN is not a bot token: expected "<digits>:<letters>" as BotFather shows it ' +
        `(got ${token.length} characters, ${token.includes(':') ? 'with' : 'no'} colon, ` +
        `starts with ${/^\d/.test(token) ? 'a digit' : 'a non-digit'}).`,
    );
  }
  if (!/^(-?\d+|@\w+)$/.test(chatId)) {
    throw new Error(
      `TELEGRAM_CHAT_ID is not a chat ID: expected a number such as 123456789 (got ${chatId.length} characters).`,
    );
  }
  // Telegram rejects messages over 4096 characters. Cut on a line break so no HTML tag is split.
  let body = text;
  if (body.length > TELEGRAM_LIMIT) {
    body = body.slice(0, TELEGRAM_LIMIT - 20);
    body = `${body.slice(0, body.lastIndexOf('\n'))}\n…`;
  }
  const request = {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: body,
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    }),
    signal: undefined,
  };
  // Telegram sometimes answers 429 or 5xx (e.g. 504 Gateway Timeout); those are worth retrying.
  for (let attempt = 1; ; attempt++) {
    let failure;
    let retryable = true;
    let waitMs = RETRY_DELAY_MS * attempt;
    try {
      request.signal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, request);
      if (response.ok) {
        console.info('Sent to Telegram.');
        return;
      }
      const text = await response.text();
      failure = `${response.status} ${text}`;
      retryable = response.status === 429 || response.status >= 500;
      const retryAfter = Number(/"retry_after":\s*(\d+)/.exec(text)?.[1]);
      if (retryAfter > 0) waitMs = retryAfter * 1000;
    } catch (error) {
      failure = error instanceof Error ? error.message : String(error);
    }
    if (!retryable || attempt >= ATTEMPTS) {
      throw new Error(`Telegram sendMessage failed: ${failure}`);
    }
    console.warn(`Telegram attempt ${attempt} failed (${failure}); retrying.`);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
}

const mode = process.argv[2];
const messages = { build: buildMessage, deploy: deployMessage };
if (!Object.hasOwn(messages, mode)) {
  console.error('Usage: node scripts/notify-telegram.mjs build|deploy');
  process.exit(2);
}
await send(messages[mode]());
