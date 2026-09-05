#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { root } from './lib.mjs';

const independentEnglishPattern = /^\d{4}-\d{2}-\d{2}-ai-blog-(?:anthropic|openai)-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;
const names = (await readdir(path.join(root, '_posts')))
  .filter((name) => independentEnglishPattern.test(name) && !name.endsWith('-zh.md'))
  .sort();

for (const englishName of names) {
  const englishPath = path.posix.join('_posts', englishName);
  const chinesePath = englishPath.replace(/\.md$/, '-zh.md');
  const result = spawnSync(
    process.execPath,
    ['.agents/skills/daily-ai-blog-digest/scripts/validate_digest.mjs', englishPath, chinesePath],
    { cwd: root, encoding: 'utf8', stdio: 'inherit' },
  );
  assert.equal(result.status, 0, `AI blog validation failed for ${englishPath}`);
}

process.stdout.write(`Validated ${names.length} independent AI blog pair(s).\n`);
