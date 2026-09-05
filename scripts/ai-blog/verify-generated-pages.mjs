#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { parseArgs, readJson, root } from './lib.mjs';

const args = parseArgs();
assert.equal(typeof args.manifest, 'string', '--manifest is required');
const manifest = await readJson(args.manifest);

function htmlText(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

for (const file of manifest.files) {
  const relative = file.lang === 'zh'
    ? path.join('zh', 'posts', file.slug, 'index.html')
    : path.join('posts', file.slug, 'index.html');
  const html = await readFile(path.join(root, '_site', 'blog', relative), 'utf8');
  assert.doesNotMatch(html, /{{|{%/, `${relative} contains unrendered Liquid`);
  assert(html.includes(file.title) || html.includes(htmlText(file.title)), `${relative} does not contain the expected title`);
  assert(html.includes(file.source_url), `${relative} does not link the canonical source`);
  assert(html.includes(`/blog${file.translation_url}`), `${relative} does not link its translation`);
  assert.match(html, /<link rel="canonical" href="https:\/\/jccipher\.github\.io\/blog\//, `${relative} lacks the production canonical URL`);
}

process.stdout.write(`Verified ${manifest.files.length} generated HTML page(s).\n`);
