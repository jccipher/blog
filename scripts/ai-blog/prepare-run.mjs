#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import matter from 'gray-matter';
import {
  appendGithubOutput,
  canonicalizeSourceUrl,
  git,
  root,
  shanghaiNow,
  writeJson,
} from './lib.mjs';

const eventName = process.env.EVENT_NAME || 'workflow_dispatch';
const requestedMode = eventName === 'workflow_dispatch'
  ? process.env.MANUAL_MODE
  : process.env.SCHEDULE_MODE;
const mode = requestedMode === 'publish' ? 'publish' : 'shadow';
const now = shanghaiNow();
const baseSha = git(['rev-parse', 'HEAD']);
assert.match(baseSha, /^[0-9a-f]{40}$/, 'base SHA must be a full Git commit hash');

const processedUrls = new Set();
const postNames = (await readdir(path.join(root, '_posts'))).filter((name) => name.endsWith('.md'));
for (const name of postNames) {
  const document = matter(await readFile(path.join(root, '_posts', name), 'utf8'));
  if (document.data.run_mode === 'preview' || !Array.isArray(document.data.sources)) continue;
  for (const source of document.data.sources) {
    if (!source?.url) continue;
    try {
      processedUrls.add(canonicalizeSourceUrl(source.url));
    } catch {
      // Legacy non-target sources are intentionally outside this automation's processed set.
    }
  }
}

const runId = process.env.GITHUB_RUN_ID || 'local';
const runAttempt = process.env.GITHUB_RUN_ATTEMPT || '1';
const plan = {
  schema_version: 1,
  run_key: `${now.day}-${runId}-${runAttempt}`,
  run_id: runId,
  run_attempt: runAttempt,
  event_name: eventName,
  mode,
  base_sha: baseSha,
  shanghai_day: now.day,
  shanghai_time: now.frontMatterDate,
  created_at: now.iso,
  manual_reason: String(process.env.MANUAL_REASON || '').trim().slice(0, 500),
  processed_urls: [...processedUrls].sort(),
  source_indexes: {
    Anthropic: 'https://claude.com/blog',
    OpenAI: 'https://developers.openai.com/blog',
  },
  limits: {
    max_sources: 2,
    one_per_publisher: true,
  },
};

await writeJson('.ai-blog/run-plan.json', plan);
await appendGithubOutput({ base_sha: baseSha, mode, run_key: plan.run_key });
process.stdout.write(`Prepared ${mode} run ${plan.run_key} with ${processedUrls.size} processed source URLs.\n`);
