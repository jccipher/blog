#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import matter from 'gray-matter';
import {
  appendGithubOutput,
  canonicalizeSourceUrl,
  git,
  isAllowedPostPath,
  isChinesePostPath,
  parseArgs,
  publisherForUrl,
  readJson,
  root,
  sha256File,
  writeJson,
} from './lib.mjs';

function changedPaths() {
  const output = execFileSync('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all'], {
    cwd: root,
    encoding: 'utf8',
  });
  if (!output) return [];
  const records = output.split('\0').filter(Boolean);
  const paths = [];
  for (const record of records) {
    const status = record.slice(0, 2);
    assert(!/[RC]/.test(status), `rename/copy is not allowed: ${record}`);
    const filePath = record.slice(3);
    assert(filePath, `could not parse git status record: ${record}`);
    paths.push(filePath);
  }
  return paths.sort();
}

function validateResultShape(result) {
  assert(result && typeof result === 'object' && !Array.isArray(result), 'Codex result must be an object');
  assert(['generated', 'noop', 'blocked'].includes(result.status), 'invalid Codex result status');
  assert(typeof result.summary === 'string' && result.summary.trim(), 'Codex result summary is required');
  assert(Array.isArray(result.sources) && result.sources.length <= 2, 'Codex result sources must be an array of at most two');
}

const args = parseArgs();
assert.equal(typeof args.plan, 'string', '--plan is required');
assert.equal(typeof args.result, 'string', '--result is required');
const plan = await readJson(args.plan);
const result = await readJson(args.result);
validateResultShape(result);
assert.equal(git(['rev-parse', 'HEAD']), plan.base_sha, 'working tree does not match run-plan base SHA');

const initialChanges = changedPaths();
if (result.status === 'noop') {
  assert.equal(result.sources.length, 0, 'noop result must not list sources');
  assert.deepEqual(initialChanges, [], `noop result changed files: ${initialChanges.join(', ')}`);
  await writeJson('.ai-blog/generated-manifest.json', {
    schema_version: 1,
    status: 'noop',
    summary: result.summary,
    run_key: plan.run_key,
    base_sha: plan.base_sha,
    mode: plan.mode,
    sources: [],
    files: [],
  });
  await appendGithubOutput({ has_patch: 'false', result_status: 'noop', sources_count: '0' });
  process.stdout.write('Codex established a clean no-op; no patch was created.\n');
  process.exit(0);
}

if (result.status === 'blocked') {
  assert.equal(result.sources.length, 0, 'blocked result must not list sources');
  assert.deepEqual(initialChanges, [], `blocked result changed files: ${initialChanges.join(', ')}`);
  throw new Error(`SOURCE_DISCOVERY_BLOCKED: ${result.summary}`);
}

assert(result.sources.length > 0, 'generated result must list at least one source');
const expectedPaths = [];
const seenPublishers = new Set();
const seenUrls = new Set();
const manifestSources = [];
const manifestFiles = [];

for (const source of result.sources) {
  assert(['OpenAI', 'Anthropic'].includes(source.publisher), `invalid publisher: ${source.publisher}`);
  assert(!seenPublishers.has(source.publisher), `publisher appears more than once: ${source.publisher}`);
  seenPublishers.add(source.publisher);

  const canonicalUrl = canonicalizeSourceUrl(source.canonical_url);
  assert.equal(source.canonical_url, canonicalUrl, `source URL is not canonical: ${source.canonical_url}`);
  assert.equal(publisherForUrl(canonicalUrl), source.publisher, 'publisher does not match source URL');
  assert(!plan.processed_urls.includes(canonicalUrl), `source is already processed: ${canonicalUrl}`);
  assert(!seenUrls.has(canonicalUrl), `source appears more than once: ${canonicalUrl}`);
  seenUrls.add(canonicalUrl);

  if (source.official_zh_url !== null) {
    const officialZh = canonicalizeSourceUrl(source.official_zh_url);
    assert.equal(source.official_zh_url, officialZh, 'official Chinese URL is not canonical');
    assert.equal(publisherForUrl(officialZh), source.publisher, 'official Chinese URL publisher mismatch');
  }

  for (const [language, filePath] of [['en', source.english_path], ['zh', source.chinese_path]]) {
    assert(isAllowedPostPath(filePath), `path is outside the AI post allowlist: ${filePath}`);
    assert.equal(isChinesePostPath(filePath), language === 'zh', `language suffix mismatch: ${filePath}`);
    assert(path.basename(filePath).startsWith(`${plan.shanghai_day}-`), `post filename must use ${plan.shanghai_day}: ${filePath}`);
    expectedPaths.push(filePath);

    const raw = await readFile(path.join(root, filePath), 'utf8');
    const document = matter(raw);
    const expectedRunMode = plan.mode === 'publish' ? 'published' : 'preview';
    assert.equal(document.data.run_mode, expectedRunMode, `${filePath}: unexpected run_mode`);
    assert.equal(document.data.lang, language, `${filePath}: unexpected lang`);
    assert(Array.isArray(document.data.sources) && document.data.sources.length === 1, `${filePath}: exactly one source is required`);
    assert.equal(document.data.sources[0].url, canonicalUrl, `${filePath}: source URL mismatch`);
    assert.equal(document.data.sources[0].title, source.title, `${filePath}: exact source title mismatch`);
    assert.equal(String(document.data.sources[0].published_at), source.published_at, `${filePath}: published date mismatch`);
    assert.equal(document.data.sources[0].official_zh_url ?? null, source.official_zh_url, `${filePath}: official Chinese URL mismatch`);
    manifestFiles.push({
      path: filePath,
      sha256: await sha256File(filePath),
      lang: language,
      slug: document.data.slug,
      title: document.data.title,
      permalink: document.data.permalink,
      translation_url: document.data.translation_url,
      run_mode: document.data.run_mode,
      source_url: canonicalUrl,
    });
  }

  assert.equal(
    source.chinese_path,
    source.english_path.replace(/\.md$/, '-zh.md'),
    `English/Chinese paths do not form a pair for ${canonicalUrl}`,
  );
  manifestSources.push({ ...source, canonical_url: canonicalUrl });
}

expectedPaths.sort();
assert.deepEqual(initialChanges, expectedPaths, `working tree changes differ from declared post paths\nexpected: ${expectedPaths.join(', ')}\nactual: ${initialChanges.join(', ')}`);

execFileSync('git', ['add', '-N', '--', ...expectedPaths], { cwd: root, stdio: 'ignore' });
const patch = execFileSync('git', ['diff', '--binary', 'HEAD', '--', ...expectedPaths], {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
});
execFileSync('git', ['reset', '--', ...expectedPaths], { cwd: root, stdio: 'ignore' });
assert(patch.trim(), 'generated patch is empty');
await writeFile(path.join(root, '.ai-blog', 'candidate.patch'), patch);

const manifest = {
  schema_version: 1,
  status: 'generated',
  summary: result.summary,
  run_key: plan.run_key,
  run_id: plan.run_id,
  run_attempt: plan.run_attempt,
  base_sha: plan.base_sha,
  mode: plan.mode,
  shanghai_day: plan.shanghai_day,
  sources: manifestSources,
  files: manifestFiles.sort((left, right) => left.path.localeCompare(right.path)),
};
await writeJson('.ai-blog/generated-manifest.json', manifest);
await appendGithubOutput({
  has_patch: 'true',
  result_status: 'generated',
  sources_count: String(manifestSources.length),
});
process.stdout.write(`Packaged ${manifestSources.length} source pair(s) across ${manifestFiles.length} bounded post files.\n`);
