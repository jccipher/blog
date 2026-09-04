#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import matter from 'gray-matter';

const root = process.cwd();

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
  if (hostname === 'anthropic.com') return 'Anthropic';
  if (hostname === 'openai.com') return 'OpenAI';
  throw new Error(`unsupported source domain: ${hostname}`);
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
  for (const field of ['layout', 'title', 'date', 'lang', 'slug', 'permalink', 'translation_url', 'reading_time', 'description']) {
    assert(data[field] !== undefined && data[field] !== '', `${filePath}: ${field} is required`);
  }

  assert.equal(data.layout, 'post', `${filePath}: layout must be post`);
  assert.equal(data.lang, expectedLang, `${filePath}: lang must be ${expectedLang}`);
  assert.match(data.slug, /^ai-blog-digest-\d{4}-\d{2}-\d{2}$/, `${filePath}: unexpected digest slug`);
  const digestDate = data.slug.slice('ai-blog-digest-'.length);
  const expectedFileName = `${digestDate}-${data.slug}${expectedLang === 'zh' ? '-zh' : ''}.md`;
  assert.equal(path.basename(filePath), expectedFileName, `${filePath}: filename does not match slug and language`);
  assert(Number.isInteger(data.reading_time) && data.reading_time > 0, `${filePath}: reading_time must be a positive integer`);
  assert.deepEqual(data.categories, ['AI', 'Industry Digest'], `${filePath}: categories do not match the digest contract`);
  assert(Array.isArray(data.tags) && data.tags.length > 0, `${filePath}: tags must be a non-empty array`);
  assert(Array.isArray(data.sources) && data.sources.length >= 1 && data.sources.length <= 2, `${filePath}: sources must contain one or two entries`);

  const urls = data.sources.map((source, index) => validateSource(source, `${filePath}: sources[${index}]`));
  assert.equal(new Set(urls).size, urls.length, `${filePath}: duplicate source URLs`);
  assert.equal(new Set(data.sources.map((source) => source.publisher)).size, data.sources.length, `${filePath}: duplicate publishers`);
  const expectedTags = new Set([...data.sources.map((source) => source.publisher), 'AI Research']);
  assert.deepEqual(new Set(data.tags), expectedTags, `${filePath}: tags must name the included publishers plus AI Research`);

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
    if (!Array.isArray(document.data.sources)) continue;
    for (const source of document.data.sources) {
      if (!source?.url) continue;
      const url = canonicalize(source.url);
      if (candidateUrls.has(url)) owners.push(`${url} already appears in _posts/${name}`);
    }
  }
  return owners;
}

function runSelfTest() {
  assert.equal(canonicalize('https://OpenAI.com/news/example/?utm_source=test#section'), 'https://openai.com/news/example');
  assert.equal(expectedPublisher('https://www.anthropic.com/news/example'), 'Anthropic');
  assert.throws(() => expectedPublisher('https://example.com/post'));

  const shared = {
    layout: 'post',
    date: new Date('2026-09-05T05:00:00+08:00'),
    slug: 'ai-blog-digest-2026-09-05',
    categories: ['AI', 'Industry Digest'],
    tags: ['Anthropic', 'OpenAI', 'AI Research'],
    reading_time: 3,
    sources: [
      {
        publisher: 'Anthropic',
        title: 'Anthropic example',
        url: 'https://www.anthropic.com/news/example',
        published_at: '2026-09-05',
        official_zh_url: null,
        reuse_policy: 'summary-only',
      },
      {
        publisher: 'OpenAI',
        title: 'OpenAI example',
        url: 'https://openai.com/news/example',
        published_at: '2026-09-05',
        official_zh_url: 'https://openai.com/zh-Hans-CN/index/example',
        reuse_policy: 'summary-only',
      },
    ],
  };
  const en = {
    data: {
      ...shared,
      title: 'AI Lab Dispatch',
      lang: 'en',
      permalink: '/posts/ai-blog-digest-2026-09-05/',
      translation_url: '/zh/posts/ai-blog-digest-2026-09-05/',
      description: 'Example digest.',
    },
    content: `> Deck\n\n## Editorial summary\n\nSummary.\n\n## Source material\n\n### Anthropic: Anthropic example\n\n[Read](https://www.anthropic.com/news/example)\n\n### OpenAI: OpenAI example\n\n[Read](https://openai.com/news/example)\n[中文](https://openai.com/zh-Hans-CN/index/example)\n`,
  };
  const zh = {
    data: {
      ...shared,
      title: 'AI 实验室动态',
      lang: 'zh',
      permalink: '/zh/posts/ai-blog-digest-2026-09-05/',
      translation_url: '/posts/ai-blog-digest-2026-09-05/',
      description: '示例摘要。',
    },
    content: `> 导语\n\n## 编辑摘要\n\n摘要。\n\n## 来源材料\n\n### Anthropic：Anthropic example\n\n[原文](https://www.anthropic.com/news/example)\n\n### OpenAI：OpenAI example\n\n[原文](https://openai.com/news/example)\n[中文](https://openai.com/zh-Hans-CN/index/example)\n`,
  };
  assert.deepEqual(validatePost('_posts/2026-09-05-ai-blog-digest-2026-09-05.md', en, 'en'), shared.sources.map((source) => source.url));
  assert.deepEqual(validatePost('_posts/2026-09-05-ai-blog-digest-2026-09-05-zh.md', zh, 'zh'), shared.sources.map((source) => source.url));
  assert.throws(() => validateSource({ ...shared.sources[0], reuse_policy: 'full-text' }, 'source'));
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
assert.deepEqual(chineseUrls, englishUrls, 'post pair must list identical canonical sources in the same order');
assert.deepEqual(chinese.document.data.sources, english.document.data.sources, 'post pair must carry identical source metadata');
assert.deepEqual(chinese.document.data.categories, english.document.data.categories, 'post pair must carry identical categories');
assert.deepEqual(chinese.document.data.tags, english.document.data.tags, 'post pair must carry identical tags');

const duplicateOwners = await findPriorSourceOwners(
  new Set([english.absolute, chinese.absolute]),
  new Set(englishUrls),
);
assert.equal(duplicateOwners.length, 0, `source already published:\n${duplicateOwners.join('\n')}`);

process.stdout.write(`Validated bilingual digest pair for ${english.document.data.slug}.\n`);
