#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const requireFromProject = createRequire(path.join(root, 'package.json'));
const matter = requireFromProject('gray-matter');

function canonicalize(rawUrl) {
  const value = new URL(rawUrl);
  assert.equal(value.protocol, 'https:', `source URL must use HTTPS: ${rawUrl}`);
  value.hash = '';
  value.search = '';
  value.hostname = value.hostname.toLowerCase();
  value.pathname = value.pathname.replace(/\/+$/, '') || '/';
  return value.toString();
}

function expectedPublisher(url) {
  const hostname = new URL(url).hostname.replace(/^www\./, '');
  if (hostname === 'claude.com' || hostname === 'anthropic.com') return 'Anthropic';
  if (hostname === 'developers.openai.com' || hostname === 'openai.com') return 'OpenAI';
  throw new Error(`unsupported source domain: ${hostname}`);
}

function countsAsProcessed(data) {
  return data.run_mode !== 'preview';
}

function validateSource(source, label) {
  assert(source && typeof source === 'object', `${label} must be an object`);
  for (const field of ['publisher', 'title', 'url', 'published_at', 'reuse_policy']) {
    assert(source[field], `${label}.${field} is required`);
  }

  const canonicalUrl = canonicalize(source.url);
  assert.equal(source.url, canonicalUrl, `${label}.url must already be canonical`);
  assert.equal(source.publisher, expectedPublisher(source.url), `${label}.publisher does not match its domain`);
  assert.match(String(source.published_at), /^\d{4}-\d{2}-\d{2}$/, `${label}.published_at must be YYYY-MM-DD`);
  assert(['summary-only', 'full-text'].includes(source.reuse_policy), `${label}.reuse_policy is invalid`);

  if (source.official_zh_url) {
    const zhUrl = canonicalize(source.official_zh_url);
    assert.equal(source.official_zh_url, zhUrl, `${label}.official_zh_url must already be canonical`);
    assert.equal(expectedPublisher(zhUrl), source.publisher, `${label}.official_zh_url must use the publisher domain`);
  }

  if (source.reuse_policy === 'full-text') {
    assert(source.license_url, `${label}.license_url is required for full-text reuse`);
    assert(source.license_note, `${label}.license_note is required for full-text reuse`);
    assert.equal(source.license_url, canonicalize(source.license_url), `${label}.license_url must be canonical HTTPS`);
  }

  return canonicalUrl;
}

function validatePost(filePath, document, expectedLang) {
  const data = document.data;
  for (const field of ['layout', 'title', 'date', 'lang', 'slug', 'permalink', 'translation_url', 'reading_time', 'description', 'run_mode']) {
    assert(data[field] !== undefined && data[field] !== '', `${filePath}: ${field} is required`);
  }

  assert.equal(data.layout, 'post', `${filePath}: layout must be post`);
  assert.equal(data.lang, expectedLang, `${filePath}: lang must be ${expectedLang}`);
  assert.match(data.slug, /^ai-blog-(anthropic|openai)-[a-z0-9]+(?:-[a-z0-9]+)*$/, `${filePath}: unexpected independent-post slug`);
  assert(['preview', 'published'].includes(data.run_mode), `${filePath}: run_mode must be preview or published`);
  const postTime = new Date(data.date).getTime();
  assert(!Number.isNaN(postTime), `${filePath}: date must be a valid timestamp`);
  if (data.run_mode === 'published') {
    assert(postTime <= Date.now() + 300_000, `${filePath}: published posts must not have a future timestamp`);
  }
  const fileDate = path.basename(filePath).slice(0, 10);
  assert.match(fileDate, /^\d{4}-\d{2}-\d{2}$/, `${filePath}: filename must start with YYYY-MM-DD`);
  const expectedFileName = `${fileDate}-${data.slug}${expectedLang === 'zh' ? '-zh' : ''}.md`;
  assert.equal(path.basename(filePath), expectedFileName, `${filePath}: filename does not match slug and language`);
  assert(Number.isInteger(data.reading_time) && data.reading_time > 0, `${filePath}: reading_time must be a positive integer`);
  assert.deepEqual(data.categories, ['AI', 'Industry Digest'], `${filePath}: categories do not match the digest contract`);
  assert(Array.isArray(data.tags) && data.tags.length > 0, `${filePath}: tags must be a non-empty array`);
  assert(Array.isArray(data.sources) && data.sources.length === 1, `${filePath}: sources must contain exactly one entry`);

  const urls = data.sources.map((source, index) => validateSource(source, `${filePath}: sources[${index}]`));
  const source = data.sources[0];
  const slugPublisher = data.slug.split('-')[2];
  assert.equal(slugPublisher, source.publisher.toLowerCase(), `${filePath}: slug publisher does not match source publisher`);
  assert.deepEqual(data.tags, [source.publisher, 'AI Research'], `${filePath}: tags must name the single publisher plus AI Research`);

  if (expectedLang === 'en') {
    assert.equal(data.permalink, `/posts/${data.slug}/`, `${filePath}: permalink does not match slug`);
    assert.equal(data.translation_url, `/zh/posts/${data.slug}/`, `${filePath}: translation_url does not match slug`);
    assert.match(document.content, /^>[\s\S]*?## Editorial summary/m, `${filePath}: editorial summary must be the opening section`);
    assert.match(document.content, /\n## Source material\s*\n/, `${filePath}: missing Source material section`);
  } else {
    assert.equal(data.permalink, `/zh/posts/${data.slug}/`, `${filePath}: permalink does not match slug`);
    assert.equal(data.translation_url, `/posts/${data.slug}/`, `${filePath}: translation_url does not match slug`);
    assert.match(document.content, /^>[\s\S]*?## 编辑摘要/m, `${filePath}: 编辑摘要 must be the opening section`);
    assert.match(document.content, /\n## 来源材料\s*\n/, `${filePath}: missing 来源材料 section`);
  }

  for (const source of data.sources) {
    assert(document.content.includes(source.title), `${filePath}: body must include the exact source title`);
    assert(document.content.includes(`](${source.url})`), `${filePath}: body must link ${source.url}`);
    if (source.official_zh_url) {
      assert(document.content.includes(`](${source.official_zh_url})`), `${filePath}: body must link official Chinese URL ${source.official_zh_url}`);
    }
    if (source.license_url) {
      assert(document.content.includes(`](${source.license_url})`), `${filePath}: body must link reuse permission ${source.license_url}`);
    }
  }

  return urls;
}

async function readPost(filePath) {
  const absolute = path.resolve(root, filePath);
  const postsRoot = path.resolve(root, '_posts');
  assert(absolute.startsWith(`${postsRoot}${path.sep}`), `${filePath}: post must be inside _posts`);
  return { absolute, document: matter(await readFile(absolute, 'utf8')) };
}

async function findPriorSourceOwners(excludedFiles, candidateUrls) {
  const owners = [];
  const postNames = (await readdir(path.join(root, '_posts'))).filter((name) => name.endsWith('.md'));
  for (const name of postNames) {
    const absolute = path.resolve(root, '_posts', name);
    if (excludedFiles.has(absolute)) continue;
    const document = matter(await readFile(absolute, 'utf8'));
    if (!countsAsProcessed(document.data)) continue;
    if (!Array.isArray(document.data.sources)) continue;
    for (const source of document.data.sources) {
      if (!source?.url) continue;
      const url = canonicalize(source.url);
      if (candidateUrls.has(url)) owners.push(`${url} already appears in published _posts/${name}`);
    }
  }
  return owners;
}

function runSelfTest() {
  assert.equal(canonicalize('https://Developers.OpenAI.com/blog/example/?utm_source=test#section'), 'https://developers.openai.com/blog/example');
  assert.equal(expectedPublisher('https://claude.com/blog/example'), 'Anthropic');
  assert.equal(expectedPublisher('https://developers.openai.com/blog/example'), 'OpenAI');
  assert.throws(() => expectedPublisher('https://example.com/post'));
  assert.equal(countsAsProcessed({ run_mode: 'preview' }), false);
  assert.equal(countsAsProcessed({ run_mode: 'published' }), true);
  assert.equal(countsAsProcessed({}), true);

  const source = {
    publisher: 'Anthropic',
    title: 'Anthropic example',
    url: 'https://claude.com/blog/example',
    published_at: '2026-09-05',
    official_zh_url: null,
    reuse_policy: 'summary-only',
  };
  const shared = {
    layout: 'post',
    date: new Date('2026-09-05T05:00:00+08:00'),
    slug: 'ai-blog-anthropic-example',
    categories: ['AI', 'Industry Digest'],
    tags: ['Anthropic', 'AI Research'],
    reading_time: 3,
    run_mode: 'preview',
    sources: [source],
  };
  const en = {
    data: {
      ...shared,
      title: 'AI Lab Dispatch',
      lang: 'en',
      permalink: '/posts/ai-blog-anthropic-example/',
      translation_url: '/zh/posts/ai-blog-anthropic-example/',
      description: 'Example digest.',
    },
    content: `> Deck\n\n## Editorial summary\n\nSummary.\n\n## Source material\n\n### Anthropic: Anthropic example\n\n[Read](https://claude.com/blog/example)\n`,
  };
  const zh = {
    data: {
      ...shared,
      title: 'AI 实验室动态',
      lang: 'zh',
      permalink: '/zh/posts/ai-blog-anthropic-example/',
      translation_url: '/posts/ai-blog-anthropic-example/',
      description: '示例摘要。',
    },
    content: `> 导语\n\n## 编辑摘要\n\n摘要。\n\n## 来源材料\n\n### Anthropic：Anthropic example\n\n[原文](https://claude.com/blog/example)\n`,
  };
  assert.deepEqual(validatePost('_posts/2026-09-05-ai-blog-anthropic-example.md', en, 'en'), [source.url]);
  assert.deepEqual(validatePost('_posts/2026-09-05-ai-blog-anthropic-example-zh.md', zh, 'zh'), [source.url]);
  assert.throws(() => validatePost('_posts/2026-09-05-ai-blog-anthropic-example.md', { ...en, data: { ...en.data, run_mode: 'draft' } }, 'en'));
  assert.throws(() => validatePost('_posts/2026-09-05-ai-blog-anthropic-example.md', { ...en, data: { ...en.data, run_mode: 'published', date: new Date('2999-01-01T00:00:00Z') } }, 'en'));
  assert.throws(() => validatePost('_posts/2026-09-05-ai-blog-anthropic-example.md', { ...en, data: { ...en.data, sources: [source, { ...source }] } }, 'en'));
  assert.throws(() => validateSource({ ...source, reuse_policy: 'full-text' }, 'source'));
  process.stdout.write('Digest validator self-test passed.\n');
}

if (process.argv.includes('--self-test')) {
  runSelfTest();
  process.exit(0);
}

const [englishPath, chinesePath] = process.argv.slice(2);
if (!englishPath || !chinesePath) {
  process.stderr.write('Usage: validate_digest.mjs <english-post> <chinese-post>\n');
  process.exit(2);
}

const english = await readPost(englishPath);
const chinese = await readPost(chinesePath);
const englishUrls = validatePost(englishPath, english.document, 'en');
const chineseUrls = validatePost(chinesePath, chinese.document, 'zh');

assert.equal(english.document.data.slug, chinese.document.data.slug, 'post pair must share a slug');
assert.equal(new Date(english.document.data.date).toISOString(), new Date(chinese.document.data.date).toISOString(), 'post pair must share a date');
assert.equal(english.document.data.run_mode, chinese.document.data.run_mode, 'post pair must share a run_mode');
assert.deepEqual(chineseUrls, englishUrls, 'post pair must list identical canonical sources in the same order');
assert.deepEqual(chinese.document.data.sources, english.document.data.sources, 'post pair must carry identical source metadata');
assert.deepEqual(chinese.document.data.categories, english.document.data.categories, 'post pair must carry identical categories');
assert.deepEqual(chinese.document.data.tags, english.document.data.tags, 'post pair must carry identical tags');

const duplicateOwners = await findPriorSourceOwners(
  new Set([english.absolute, chinese.absolute]),
  new Set(englishUrls),
);
assert.equal(duplicateOwners.length, 0, `source already published:\n${duplicateOwners.join('\n')}`);

process.stdout.write(`Validated independent bilingual post pair for ${english.document.data.slug} (${english.document.data.run_mode}).\n`);
