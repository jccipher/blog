#!/usr/bin/env node

import assert from 'node:assert/strict';
import { copyFile } from 'node:fs/promises';
import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import {
  git,
  isAllowedPostPath,
  parseArgs,
  readJson,
  root,
  sha256File,
} from './lib.mjs';

const args = parseArgs();
assert.equal(typeof args['content-dir'], 'string', '--content-dir is required');
assert.equal(typeof args.manifest, 'string', '--manifest is required');
const manifest = await readJson(args.manifest);
assert.equal(manifest.mode, 'publish', 'only a publish-mode artifact may be committed');
assert.equal(git(['rev-parse', 'HEAD']), manifest.base_sha, 'BASE_MOVED: checkout differs from validated base SHA');

const paths = manifest.files.map((file) => file.path).sort();
assert(paths.length > 0 && paths.length <= 4, 'validated manifest must list one to four files');
for (const file of manifest.files) {
  assert(isAllowedPostPath(file.path), `validated path is outside allowlist: ${file.path}`);
  assert.equal(file.run_mode, 'published', `${file.path}: production artifact is not published mode`);
  const source = path.join(root, args['content-dir'], file.path);
  assert.equal(await sha256File(source), file.sha256, `validated artifact hash mismatch: ${file.path}`);
  await copyFile(source, path.join(root, file.path));
  assert.equal(await sha256File(file.path), file.sha256, `workspace hash mismatch: ${file.path}`);
}

for (const source of manifest.sources) {
  const result = spawnSync(
    process.execPath,
    ['.agents/skills/daily-ai-blog-digest/scripts/validate_digest.mjs', source.english_path, source.chinese_path],
    { cwd: root, encoding: 'utf8', stdio: 'inherit' },
  );
  assert.equal(result.status, 0, `pair validator failed before publication: ${source.english_path}`);
}

execFileSync('git', ['add', '--', ...paths], { cwd: root, stdio: 'inherit' });
const staged = git(['diff', '--cached', '--name-only', '--diff-filter=ACM']).split('\n').filter(Boolean).sort();
assert.deepEqual(staged, paths, 'staged paths differ from validated manifest');
const forbidden = git(['diff', '--cached', '--name-only', '--diff-filter=DR']).split('\n').filter(Boolean);
assert.deepEqual(forbidden, [], 'delete/rename is forbidden during publication');
process.stdout.write(`Prepared ${paths.length} validated files for an explicit Git commit.\n`);
