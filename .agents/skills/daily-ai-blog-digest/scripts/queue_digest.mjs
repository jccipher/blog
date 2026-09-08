#!/usr/bin/env node

import assert from 'node:assert/strict';
import { access, mkdir, readFile, readdir, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import matter from 'gray-matter';
import { canonicalize, validatePair, validatePost } from './validate_digest.mjs';

const root = process.cwd();
const defaultQueueRoot = '.ai-blog/queue';
const publishers = ['Anthropic', 'OpenAI'];
const prefetchCount = 7;
const dayPattern = /^\d{4}-\d{2}-\d{2}$/;
const englishNamePattern = /^ai-blog-(anthropic|openai)-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;

function parseOptions(tokens) {
  const options = {};
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    assert(token.startsWith('--'), `unexpected argument: ${token}`);
    const value = tokens[index + 1];
    assert(value && !value.startsWith('--'), `${token} requires a value`);
    options[token.slice(2)] = value;
    index += 1;
  }
  return options;
}

function addDays(day, offset) {
  assert.match(day, dayPattern, `invalid date: ${day}`);
  const value = new Date(`${day}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
}

function relativePath(absolute) {
  return path.relative(root, absolute).split(path.sep).join('/');
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function writeAtomic(filePath, content) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.tmp-${process.pid}`;
  await writeFile(temporary, content, { flag: 'wx' });
  try {
    await rename(temporary, filePath);
  } catch (error) {
    await unlink(temporary).catch(() => {});
    throw error;
  }
}

async function loadDay(queueRoot, day) {
  const directory = path.join(queueRoot, day);
  let names = [];
  try {
    names = await readdir(directory);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }

  const markdownNames = names.filter((name) => name.endsWith('.md')).sort();
  const englishNames = markdownNames.filter((name) => englishNamePattern.test(name) && !name.endsWith('-zh.md'));
  const pairedNames = new Set();
  const entries = [];

  for (const englishName of englishNames) {
    const chineseName = englishName.replace(/\.md$/, '-zh.md');
    assert(markdownNames.includes(chineseName), `${relativePath(path.join(directory, englishName))}: missing Chinese pair`);
    pairedNames.add(englishName);
    pairedNames.add(chineseName);

    const englishPath = path.join(directory, englishName);
    const chinesePath = path.join(directory, chineseName);
    const englishRelative = relativePath(englishPath);
    const chineseRelative = relativePath(chinesePath);
    const { english, chinese } = await validatePair(
      englishRelative,
      chineseRelative,
      { kind: 'queue', queueDate: day },
    );
    const source = english.document.data.sources[0];
    entries.push({
      scheduled_for: day,
      publisher: source.publisher,
      title: source.title,
      canonical_url: canonicalize(source.url),
      source_published_at: String(source.published_at),
      status: english.document.data.queue_status,
      english_path: englishRelative,
      chinese_path: chineseRelative,
      english,
      chinese,
    });
  }

  const orphaned = markdownNames.filter((name) => !pairedNames.has(name));
  assert.deepEqual(orphaned, [], `${relativePath(directory)}: orphaned or invalid Markdown files: ${orphaned.join(', ')}`);
  for (const publisher of publishers) {
    assert(
      entries.filter((entry) => entry.publisher === publisher).length <= 1,
      `${relativePath(directory)}: more than one ${publisher} pair`,
    );
  }
  return entries;
}

async function scanQueue(queueRoot) {
  let dateEntries = [];
  try {
    dateEntries = await readdir(queueRoot, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  const days = dateEntries
    .filter((entry) => entry.isDirectory() && dayPattern.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  const entries = [];
  for (const day of days) entries.push(...await loadDay(queueRoot, day));

  const seenUrls = new Map();
  for (const entry of entries) {
    const prior = seenUrls.get(entry.canonical_url);
    assert(!prior, `${entry.canonical_url} is queued more than once: ${prior} and ${entry.english_path}`);
    seenUrls.set(entry.canonical_url, entry.english_path);
  }
  return entries.sort((left, right) => (
    left.scheduled_for.localeCompare(right.scheduled_for)
    || left.publisher.localeCompare(right.publisher)
  ));
}

function manifestFrom(entries) {
  return {
    schema_version: 1,
    publishers: Object.fromEntries(publishers.map((publisher) => [
      publisher,
      entries
        .filter((entry) => entry.publisher === publisher)
        .map((entry) => ({
          scheduled_for: entry.scheduled_for,
          status: entry.status,
          title: entry.title,
          canonical_url: entry.canonical_url,
          source_published_at: entry.source_published_at,
          english_path: entry.english_path,
          chinese_path: entry.chinese_path,
        })),
    ])),
  };
}

function nextDates(entries, publisher, today) {
  const publisherEntries = entries.filter((entry) => entry.publisher === publisher);
  const tail = publisherEntries.at(-1)?.scheduled_for;
  const first = tail && tail >= today ? addDays(tail, 1) : today;
  return Array.from({ length: prefetchCount }, (_, index) => addDays(first, index));
}

async function readManifest(queueRoot) {
  const manifestPath = path.join(queueRoot, 'queue.json');
  if (!await exists(manifestPath)) return null;
  return JSON.parse(await readFile(manifestPath, 'utf8'));
}

async function syncManifest(queueRoot) {
  const entries = await scanQueue(queueRoot);
  const manifest = manifestFrom(entries);
  await writeAtomic(path.join(queueRoot, 'queue.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return { entries, manifest };
}

async function status(queueRoot, today) {
  const entries = await scanQueue(queueRoot);
  const due = Object.fromEntries(publishers.map((publisher) => {
    const entry = entries.find((candidate) => candidate.publisher === publisher && candidate.scheduled_for === today);
    return [publisher, entry ? {
      status: entry.status,
      title: entry.title,
      canonical_url: entry.canonical_url,
      english_path: entry.english_path,
      chinese_path: entry.chinese_path,
    } : null];
  }));
  return {
    schema_version: 1,
    queue_root: relativePath(queueRoot),
    date: today,
    due,
    next_dates: Object.fromEntries(publishers.map((publisher) => [publisher, nextDates(entries, publisher, today)])),
    queued_counts: Object.fromEntries(publishers.map((publisher) => [
      publisher,
      entries.filter((entry) => entry.publisher === publisher && entry.status === 'queued').length,
    ])),
    reserved_urls: entries.filter((entry) => entry.status === 'queued').map((entry) => entry.canonical_url).sort(),
  };
}

async function validateManifest(queueRoot) {
  const entries = await scanQueue(queueRoot);
  const expected = manifestFrom(entries);
  const actual = await readManifest(queueRoot);
  assert(actual, `${relativePath(path.join(queueRoot, 'queue.json'))}: missing ordered queue index; run sync`);
  assert.deepEqual(actual, expected, `${relativePath(path.join(queueRoot, 'queue.json'))}: index is stale; run sync`);
  return { entries, manifest: expected };
}

function withSourceBoundary(content, lang) {
  const heading = lang === 'zh' ? '## 来源材料' : '## Source material';
  const marker = lang === 'zh'
    ? '> **来源分界：** 下方是基于原文的转述与出处信息。除非元数据记录了兼容的明确许可，完整原文请通过官方链接阅读。'
    : '> **Source boundary:** The section below contains a sourced paraphrase and attribution. Unless the metadata records explicit compatible permission, read the complete original at the official link.';
  if (content.includes(`\n---\n\n${marker}\n\n${heading}\n`)) return content;
  assert(content.includes(`\n${heading}\n`), `queued ${lang} post is missing ${heading}`);
  return content.replace(`\n${heading}\n`, `\n---\n\n${marker}\n\n${heading}\n`);
}

function publishedDocument(queueDocument, actualTime, lang) {
  const data = {
    ...queueDocument.data,
    date: actualTime,
    run_mode: 'published',
    content_format: 'summary-source-v2',
  };
  delete data.queue_publish_date;
  delete data.queue_status;
  delete data.published_path;
  return { data, content: withSourceBoundary(queueDocument.content, lang) };
}

async function releaseEntry(entry, actualTime) {
  const englishOutput = `_posts/${entry.scheduled_for}-${path.basename(entry.english_path)}`;
  const chineseOutput = `_posts/${entry.scheduled_for}-${path.basename(entry.chinese_path)}`;
  const outputPairs = [
    [entry.english, englishOutput, 'en'],
    [entry.chinese, chineseOutput, 'zh'],
  ];
  const existing = await Promise.all(outputPairs.map(([, output]) => exists(path.join(root, output))));
  assert(existing.every(Boolean) || existing.every((value) => !value), `${entry.publisher} release is partial; inspect ${englishOutput} and ${chineseOutput}`);

  if (existing.every(Boolean)) {
    const published = await validatePair(englishOutput, chineseOutput, { kind: 'post' });
    assert.equal(published.urls[0], entry.canonical_url, `${englishOutput}: existing post belongs to a different source`);
  } else {
    const rendered = outputPairs.map(([queued, output, lang]) => {
      const document = publishedDocument(queued.document, actualTime, lang);
      validatePost(output, document, lang, { kind: 'post' });
      return [path.join(root, output), matter.stringify(document.content, document.data)];
    });
    for (const [output, content] of rendered) await writeAtomic(output, content);
    await validatePair(englishOutput, chineseOutput, { kind: 'post' });
  }

  for (const [queued, output] of outputPairs) {
    const data = { ...queued.document.data, queue_status: 'published', published_path: output };
    await writeAtomic(queued.absolute, matter.stringify(queued.document.content, data));
  }
  return {
    publisher: entry.publisher,
    canonical_url: entry.canonical_url,
    english_path: englishOutput,
    chinese_path: chineseOutput,
  };
}

async function release(queueRoot, day, actualTime) {
  assert.equal(String(actualTime).slice(0, 10), day, '--time must use the requested Shanghai date');
  assert(!Number.isNaN(new Date(actualTime).getTime()), '--time must be a valid timestamp');
  assert(new Date(actualTime).getTime() <= Date.now() + 300_000, '--time must not be in the future');
  const due = await loadDay(queueRoot, day);
  for (const publisher of publishers) {
    assert.equal(due.filter((entry) => entry.publisher === publisher).length, 1, `${day}: exactly one ${publisher} pair is required for release`);
  }

  const released = [];
  for (const publisher of publishers) {
    released.push(await releaseEntry(due.find((entry) => entry.publisher === publisher), actualTime));
  }
  await syncManifest(queueRoot);
  return { schema_version: 1, date: day, released };
}

function selfTest() {
  const sample = [
    { scheduled_for: '2026-09-08', publisher: 'Anthropic' },
    { scheduled_for: '2026-09-10', publisher: 'Anthropic' },
    { scheduled_for: '2026-09-09', publisher: 'OpenAI' },
  ];
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.deepEqual(nextDates(sample, 'Anthropic', '2026-09-07'), [
    '2026-09-11', '2026-09-12', '2026-09-13', '2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17',
  ]);
  assert.deepEqual(nextDates(sample, 'OpenAI', '2026-09-11'), [
    '2026-09-11', '2026-09-12', '2026-09-13', '2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17',
  ]);
  const migrated = publishedDocument({
    data: {
      run_mode: 'preview',
      queue_publish_date: '2026-09-11',
      queue_status: 'queued',
      published_path: '_posts/example.md',
    },
    content: '> Deck\n\n## Editorial summary\n\nSummary.\n\n## Source material\n\nSource.\n',
  }, '2026-09-11 05:00:00 +0800', 'en');
  assert.equal(migrated.data.run_mode, 'published');
  assert.equal(migrated.data.content_format, 'summary-source-v2');
  assert.equal(migrated.data.queue_publish_date, undefined);
  assert.match(migrated.content, /\n---\n\n> \*\*Source boundary:\*\*[^\n]+\n\n## Source material\n/);
  assert.throws(() => addDays('not-a-date', 1));
  process.stdout.write('Queue helper self-test passed.\n');
}

async function main() {
  if (process.argv.includes('--self-test')) {
    selfTest();
    return;
  }
  const [command, ...tokens] = process.argv.slice(2);
  assert(['status', 'sync', 'validate', 'release'].includes(command), 'command must be status, sync, validate, or release');
  const options = parseOptions(tokens);
  assert.match(options.date || '', dayPattern, '--date is required as YYYY-MM-DD');
  const queueRoot = path.resolve(root, options.root || defaultQueueRoot);

  if (command === 'release') {
    assert(options.time, 'release requires --time');
    process.stdout.write(`${JSON.stringify(await release(queueRoot, options.date, options.time), null, 2)}\n`);
    return;
  }
  if (command === 'sync') {
    const { manifest } = await syncManifest(queueRoot);
    process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
    return;
  }
  if (command === 'validate') {
    const { entries } = await validateManifest(queueRoot);
    process.stdout.write(`Validated ordered queue with ${entries.length} bilingual pair(s).\n`);
    return;
  }
  process.stdout.write(`${JSON.stringify(await status(queueRoot, options.date), null, 2)}\n`);
}

await main();
