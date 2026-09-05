#!/usr/bin/env node

import assert from 'node:assert/strict';
import process from 'node:process';
import { parseArgs, readJson } from './lib.mjs';

const args = parseArgs();
assert.equal(typeof args.manifest, 'string', '--manifest is required');
const manifest = await readJson(args.manifest);
const baseUrl = String(args['base-url'] || 'https://jccipher.github.io/blog/').replace(/\/+$/, '');
const timeoutSeconds = Number(args.timeout || 600);
assert(Number.isFinite(timeoutSeconds) && timeoutSeconds >= 10 && timeoutSeconds <= 1800, '--timeout must be between 10 and 1800 seconds');

function htmlText(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: { 'user-agent': 'LATENTX-Publication-Verifier/1.0' },
    signal: AbortSignal.timeout(30_000),
  });
  assert.equal(response.status, 200, `${url} returned HTTP ${response.status}`);
  return response.text();
}

async function verifyOnce() {
  for (const file of manifest.files) {
    const url = `${baseUrl}${file.permalink}`;
    const html = await fetchHtml(url);
    assert.doesNotMatch(html, /{{|{%/, `${url} contains unrendered Liquid`);
    assert(html.includes(file.title) || html.includes(htmlText(file.title)), `${url} does not contain expected title`);
    assert(html.includes(file.source_url), `${url} does not contain canonical source URL`);
    assert(html.includes(`${baseUrl}${file.translation_url}`), `${url} does not contain the alternate-language URL`);
  }

  const home = await fetchHtml(`${baseUrl}/`);
  const archive = await fetchHtml(`${baseUrl}/archives/`);
  for (const source of manifest.sources) {
    const slug = manifest.files.find((file) => file.source_url === source.canonical_url)?.slug;
    assert(slug, `manifest has no slug for ${source.canonical_url}`);
    const postPath = `/blog/posts/${slug}/`;
    assert(home.includes(postPath) || archive.includes(postPath), `home/archive does not link ${postPath}`);
  }
}

const deadline = Date.now() + timeoutSeconds * 1000;
let delayMs = 20_000;
let lastError;
let attempt = 0;
while (Date.now() < deadline) {
  attempt += 1;
  try {
    await verifyOnce();
    process.stdout.write(`Verified ${manifest.files.length} production page(s) on attempt ${attempt}.\n`);
    process.exit(0);
  } catch (error) {
    lastError = error;
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    process.stderr.write(`Production verification attempt ${attempt} failed: ${error.message}\n`);
    await new Promise((resolve) => setTimeout(resolve, Math.min(delayMs, remaining)));
    delayMs = Math.min(delayMs * 2, 120_000);
  }
}

throw new Error(`PUBLIC_VERIFY_TIMEOUT after ${attempt} attempt(s): ${lastError?.message || 'unknown error'}`);
