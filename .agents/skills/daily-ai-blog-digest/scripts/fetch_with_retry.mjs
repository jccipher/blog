#!/usr/bin/env node

import assert from 'node:assert/strict';
import { mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const cacheRoot = path.resolve(root, '.ai-blog/fetch-cache');
const allowedHosts = new Set(['claude.com', 'anthropic.com', 'developers.openai.com', 'openai.com']);
const maxAttempts = 20;
const retryIntervalMs = 120_000;
const requestTimeoutMs = 45_000;
const maxBodyBytes = 5 * 1024 * 1024;

function parseArgs(tokens) {
  const [rawUrl, ...options] = tokens;
  assert(rawUrl && !rawUrl.startsWith('--'), 'URL is required');
  const parsed = {};
  for (let index = 0; index < options.length; index += 1) {
    const token = options[index];
    assert(token.startsWith('--'), `unexpected argument: ${token}`);
    const value = options[index + 1];
    assert(value && !value.startsWith('--'), `${token} requires a value`);
    parsed[token.slice(2)] = value;
    index += 1;
  }
  assert(parsed.output, '--output is required');
  return { rawUrl, output: parsed.output };
}

function normalizeHost(hostname) {
  return hostname.toLowerCase().replace(/^www\./, '');
}

function validateOfficialUrl(rawUrl) {
  const url = new URL(rawUrl);
  assert.equal(url.protocol, 'https:', 'only HTTPS source URLs are allowed');
  assert(allowedHosts.has(normalizeHost(url.hostname)), `unsupported source host: ${url.hostname}`);
  return url;
}

function validateOutput(rawOutput) {
  assert(!path.isAbsolute(rawOutput), '--output must be relative to the repository');
  const absolute = path.resolve(root, rawOutput);
  assert(absolute.startsWith(`${cacheRoot}${path.sep}`), '--output must be inside .ai-blog/fetch-cache');
  assert(['.html', '.md'].includes(path.extname(absolute)), '--output must use an .html or .md extension');
  return absolute;
}

function isTimeout(error) {
  const timeoutNames = new Set(['AbortError', 'TimeoutError']);
  const timeoutCodes = new Set([
    'ETIMEDOUT',
    'UND_ERR_CONNECT_TIMEOUT',
    'UND_ERR_HEADERS_TIMEOUT',
    'UND_ERR_BODY_TIMEOUT',
  ]);
  let current = error;
  while (current) {
    if (timeoutNames.has(current.name) || timeoutCodes.has(current.code)) return true;
    current = current.cause;
  }
  return false;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function readLimitedBody(response) {
  assert(response.body, 'response body is missing');
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    assert(size <= maxBodyBytes, `source body exceeds ${maxBodyBytes} bytes`);
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

async function fetchOnce(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(requestTimeoutMs),
    headers: {
      accept: 'text/html,application/xhtml+xml,text/markdown;q=0.9,text/plain;q=0.8',
      'user-agent': 'LATENTX-AI-Blog-Digest/1.0',
    },
  });
  assert(response.ok, `HTTP ${response.status} ${response.statusText}`);
  validateOfficialUrl(response.url);
  const contentType = response.headers.get('content-type') || '';
  assert(
    /text\/html|application\/xhtml\+xml|text\/markdown|text\/plain/i.test(contentType),
    `unexpected content type: ${contentType || 'missing'}`,
  );
  return { finalUrl: response.url, contentType, body: await readLimitedBody(response) };
}

async function fetchWithRetry(url) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const result = await fetchOnce(url);
      return { ...result, attempts: attempt };
    } catch (error) {
      if (!isTimeout(error)) throw error;
      if (attempt === maxAttempts) {
        throw new Error(`network timeout after ${maxAttempts} attempts; fetch abandoned`, { cause: error });
      }
      process.stderr.write(`Network timeout on attempt ${attempt}/${maxAttempts}; retrying in 120 seconds.\n`);
      await delay(retryIntervalMs);
    }
  }
  throw new Error('unreachable retry state');
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

function selfTest() {
  assert.equal(validateOfficialUrl('https://claude.com/blog').hostname, 'claude.com');
  assert.equal(validateOfficialUrl('https://www.anthropic.com/news').hostname, 'www.anthropic.com');
  assert.throws(() => validateOfficialUrl('http://claude.com/blog'));
  assert.throws(() => validateOfficialUrl('https://example.com/blog'));
  assert.equal(isTimeout({ name: 'AbortError' }), true);
  assert.equal(isTimeout({ cause: { code: 'UND_ERR_CONNECT_TIMEOUT' } }), true);
  assert.equal(isTimeout(new Error('HTTP 500')), false);
  assert.equal(maxAttempts, 20);
  assert.equal(retryIntervalMs, 120_000);
  assert.doesNotThrow(() => validateOutput('.ai-blog/fetch-cache/article.md'));
  assert.throws(() => validateOutput('.ai-blog/fetch-cache/article.txt'));
  process.stdout.write('Fetch retry helper self-test passed.\n');
}

async function main() {
  if (process.argv.includes('--self-test')) {
    selfTest();
    return;
  }
  const { rawUrl, output } = parseArgs(process.argv.slice(2));
  const url = validateOfficialUrl(rawUrl);
  const outputPath = validateOutput(output);
  const result = await fetchWithRetry(url);
  await writeAtomic(outputPath, result.body);
  process.stdout.write(`${JSON.stringify({
    requested_url: url.toString(),
    final_url: result.finalUrl,
    content_type: result.contentType,
    output: path.relative(root, outputPath).split(path.sep).join('/'),
    attempts: result.attempts,
    bytes: Buffer.byteLength(result.body),
  }, null, 2)}\n`);
}

await main();
