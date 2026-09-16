import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

const root = process.cwd();
const script = path.join(root, 'scripts/ai-blog/run-nightly.sh');

function run(args, env = {}) {
  return spawnSync('/bin/sh', [script, ...args], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, BLOG_NODE_EXECUTABLE: process.execPath, ...env }
  });
}

async function withReport(t, report) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'latentx-nightly-shell-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'report.json');
  await writeFile(file, `${JSON.stringify(report)}\n`);
  return file;
}

test('dry run resolves the one manual production command without running it', () => {
  const result = run(['--dry-run']);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, new RegExp(`/usr/bin/caffeinate -is ${process.execPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  assert.match(result.stdout, /scripts\/ai-blog\/native-nightly\.mjs/);
});

test('partial audio does not block a successful text publication', async t => {
  const report = await withReport(t, {
    text: { state: 'pushed' },
    deployment: { state: 'verified' },
    audio: { state: 'partial' }
  });

  const result = run(['--verify-report', report]);

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    state: 'ready',
    text: 'pushed',
    deployment: 'verified',
    audio: 'partial'
  });
});

test('missing text publication fails the final check', async t => {
  const report = await withReport(t, {
    text: { state: 'deferred' },
    deployment: { state: 'verified' },
    audio: { state: 'uploaded' }
  });

  const result = run(['--verify-report', report]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Text publication is incomplete/);
});

test('unverified deployment fails the final check', async t => {
  const report = await withReport(t, {
    text: { state: 'already-pushed' },
    deployment: { state: 'pending' },
    audio: { state: 'uploaded' }
  });

  const result = run(['--verify-report', report]);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Deployment verification is incomplete/);
});
