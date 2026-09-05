#!/usr/bin/env node

import assert from 'node:assert/strict';
import { cp, mkdir, rm } from 'node:fs/promises';
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
  writeJson,
} from './lib.mjs';

function workingTreePaths() {
  const output = execFileSync('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all'], {
    cwd: root,
    encoding: 'utf8',
  });
  return output.split('\0').filter(Boolean).map((record) => {
    assert(!/[RC]/.test(record.slice(0, 2)), `rename/copy is forbidden: ${record}`);
    return record.slice(3);
  }).sort();
}

function runPairValidator(englishPath, chinesePath) {
  const validator = '.agents/skills/daily-ai-blog-digest/scripts/validate_digest.mjs';
  const result = spawnSync(process.execPath, [validator, englishPath, chinesePath], {
    cwd: root,
    encoding: 'utf8',
    stdio: 'inherit',
  });
  assert.equal(result.status, 0, `pair validator failed for ${englishPath}`);
}

const args = parseArgs();
for (const required of ['plan', 'manifest', 'patch']) {
  assert.equal(typeof args[required], 'string', `--${required} is required`);
}

const plan = await readJson(args.plan);
const manifest = await readJson(args.manifest);
assert.equal(manifest.status, 'generated', 'manifest must describe generated content');
assert.equal(manifest.base_sha, plan.base_sha, 'manifest and run plan base SHA differ');
assert.equal(manifest.mode, plan.mode, 'manifest and run plan mode differ');
assert.equal(git(['rev-parse', 'HEAD']), plan.base_sha, 'validation checkout does not match base SHA');
assert.deepEqual(workingTreePaths(), [], 'validation must start from a clean checkout');
assert(manifest.files.length > 0 && manifest.files.length <= 4, 'manifest must contain one to four files');

execFileSync('git', ['apply', '--check', args.patch], { cwd: root, stdio: 'inherit' });
execFileSync('git', ['apply', args.patch], { cwd: root, stdio: 'inherit' });

const expectedPaths = manifest.files.map((file) => file.path).sort();
for (const file of manifest.files) {
  assert(isAllowedPostPath(file.path), `manifest path is outside allowlist: ${file.path}`);
  assert.equal(await sha256File(file.path), file.sha256, `file hash mismatch after patch apply: ${file.path}`);
  const expectedMode = plan.mode === 'publish' ? 'published' : 'preview';
  assert.equal(file.run_mode, expectedMode, `manifest run_mode mismatch: ${file.path}`);
}
assert.deepEqual(workingTreePaths(), expectedPaths, 'applied patch changed undeclared paths');

for (const source of manifest.sources) {
  runPairValidator(source.english_path, source.chinese_path);
}

const contentRoot = path.join(root, '.ai-blog', 'validated-content');
await rm(contentRoot, { recursive: true, force: true });
for (const file of manifest.files) {
  const destination = path.join(contentRoot, file.path);
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(path.join(root, file.path), destination);
}

await writeJson('.ai-blog/validated-manifest.json', {
  ...manifest,
  validation: {
    pair_contract: 'passed',
    path_allowlist: 'passed',
    file_hashes: 'passed',
    validated_at: new Date().toISOString(),
  },
});
process.stdout.write(`Validated and copied ${manifest.files.length} generated post files.\n`);
