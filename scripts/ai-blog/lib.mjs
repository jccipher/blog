import assert from 'node:assert/strict';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

export const root = process.cwd();
export const allowedSourceHosts = new Set([
  'developers.openai.com',
  'openai.com',
  'claude.com',
  'anthropic.com',
]);

export function parseArgs(argv = process.argv.slice(2)) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) throw new Error(`unexpected argument: ${token}`);
    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = value;
      index += 1;
    }
  }
  return args;
}

export function canonicalizeSourceUrl(rawUrl) {
  const value = new URL(rawUrl);
  assert.equal(value.protocol, 'https:', `source URL must use HTTPS: ${rawUrl}`);
  value.hash = '';
  value.search = '';
  value.hostname = value.hostname.toLowerCase();
  value.pathname = value.pathname.replace(/\/+$/, '') || '/';
  assert(allowedSourceHosts.has(value.hostname.replace(/^www\./, '')), `unsupported source domain: ${value.hostname}`);
  return value.toString();
}

export function publisherForUrl(rawUrl) {
  const hostname = new URL(rawUrl).hostname.toLowerCase().replace(/^www\./, '');
  if (hostname === 'developers.openai.com' || hostname === 'openai.com') return 'OpenAI';
  if (hostname === 'claude.com' || hostname === 'anthropic.com') return 'Anthropic';
  throw new Error(`unsupported source domain: ${hostname}`);
}

export function isAllowedPostPath(filePath) {
  if (path.isAbsolute(filePath) || filePath.includes('..') || filePath.includes('\\')) return false;
  return /^_posts\/\d{4}-\d{2}-\d{2}-ai-blog-(openai|anthropic)-[a-z0-9]+(?:-[a-z0-9]+)*(?:-zh)?\.md$/.test(filePath);
}

export function isChinesePostPath(filePath) {
  return /-zh\.md$/.test(filePath);
}

export function git(args, options = {}) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  }).trim();
}

export async function readJson(filePath) {
  return JSON.parse(await readFile(path.resolve(root, filePath), 'utf8'));
}

export async function writeJson(filePath, value) {
  const absolute = path.resolve(root, filePath);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, `${JSON.stringify(value, null, 2)}\n`);
}

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export async function sha256File(filePath) {
  return sha256(await readFile(path.resolve(root, filePath)));
}

export async function appendGithubOutput(values) {
  if (!process.env.GITHUB_OUTPUT) return;
  const lines = Object.entries(values).map(([key, value]) => `${key}=${value}`).join('\n');
  await appendFile(process.env.GITHUB_OUTPUT, `${lines}\n`);
}

export function shanghaiNow(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]),
  );
  const day = `${parts.year}-${parts.month}-${parts.day}`;
  return {
    day,
    frontMatterDate: `${day} ${parts.hour}:${parts.minute}:${parts.second} +0800`,
    iso: `${day}T${parts.hour}:${parts.minute}:${parts.second}+08:00`,
  };
}

function selfTest() {
  assert.equal(
    canonicalizeSourceUrl('https://Developers.OpenAI.com/blog/example/?utm_source=test#section'),
    'https://developers.openai.com/blog/example',
  );
  assert.equal(publisherForUrl('https://claude.com/blog/example'), 'Anthropic');
  assert.equal(isAllowedPostPath('_posts/2026-09-05-ai-blog-openai-example.md'), true);
  assert.equal(isAllowedPostPath('_posts/2026-09-05-ai-blog-openai-example-zh.md'), true);
  assert.equal(isAllowedPostPath('.github/workflows/owned.yml'), false);
  assert.equal(isAllowedPostPath('../_posts/example.md'), false);
  assert.equal(isChinesePostPath('_posts/2026-09-05-ai-blog-openai-example-zh.md'), true);
  assert.equal(shanghaiNow(new Date('2026-09-04T17:01:02Z')).frontMatterDate, '2026-09-05 01:01:02 +0800');
  process.stdout.write('AI blog automation helper self-test passed.\n');
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] || '') && process.argv.includes('--self-test')) {
  selfTest();
}
