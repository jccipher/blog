import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { materializeAudio } from '../scripts/deploy_audio.mjs';
import { managedOperations } from '../../github-wiki-maintainer/scripts/nightly_wiki.mjs';
import { command, json, sha256 } from '../scripts/runtime.mjs';
import { deploymentWindow } from '../scripts/deployment_window.mjs';

const bytes = Buffer.from('fixture audio bytes'), today = '2026-09-08';
const config = await json('.agents/skills/nightly-blog-pipeline/config.json');
const asset = (day, lang = 'en') => ({ published_on: day, asset: `${day}_ai-blog-openai-fixture.${lang}.1234567890abcdef.mp3`, bytes: bytes.length, sha256: sha256(bytes) });
const options = entries => ({ repo: 'fixture/blog', config, today, manifest: { entries }, fetchAsset: async () => bytes, storeAsset: async e => `.ai-blog/deploy-audio/${e.asset}` });

test('Daytime push never deploys without explicit one-run authorization', () => {
  const now = new Date('2026-09-08T14:00:00+08:00'), sha = 'a'.repeat(40);
  assert.equal(deploymentWindow({ eventName: 'push', sha, now }).allowed, false);
  const inputs = { confirm_daytime: true, approved_sha: sha, approved_until: '2026-09-08T15:59:00+08:00' };
  assert.equal(deploymentWindow({ eventName: 'workflow_dispatch', inputs, sha, now }).allowed, true);
  assert.equal(deploymentWindow({ eventName: 'push', inputs, sha, now }).allowed, false);
  for (const override of [{ approved_sha: 'b'.repeat(40) }, { approved_until: '2026-09-08T13:59:00+08:00' }, { approved_until: '2026-09-08T17:00:00+08:00' }, { confirm_daytime: false }]) {
    assert.equal(deploymentWindow({ eventName: 'workflow_dispatch', inputs: { ...inputs, ...override }, sha, now }).allowed, false);
  }
});
test('Scheduled deployment uses the fixed nightly deadlines with no stored daytime flag', () => {
  const result = deploymentWindow({ eventName: 'push', sha: 'a'.repeat(40), now: new Date('2026-09-08T05:00:00+08:00') });
  assert(result.allowed && !result.daytime_exception);
  assert.equal(result.deadline, Date.parse('2026-09-08T05:30:00+08:00'));
  assert.equal(deploymentWindow({ eventName: 'push', now: new Date('2026-09-08T05:25:00+08:00') }).allowed, false);
});

test('Pages audio downloads prioritize current publication and verify hashes', async () => {
  const order = [], opts = options([asset('2026-08-01'), asset(today)]);
  const result = await materializeAudio({ ...opts, fetchAsset: async e => { order.push(e.published_on); return bytes; } });
  assert.deepEqual(order, [today, '2026-08-01']);
  assert.equal(result.entries.length, 2); assert.equal(result.failed.length, 0);
});
test('Missing one language does not block other audio or throw into the text build', async () => {
  const result = await materializeAudio({ ...options([asset(today), asset(today, 'zh')]), fetchAsset: async e => {
    if (e.asset.includes('.en.')) throw new Error('HTTP 404'); return bytes;
  } });
  assert.equal(result.entries.length, 1); assert.equal(result.failed.length, 1);
  assert(result.entries[0].asset.includes('.zh.'));
});
test('Corrupt audio cannot reach a player', async () => {
  let writes = 0;
  const result = await materializeAudio({ ...options([asset(today)]), fetchAsset: async () => Buffer.from('wrong'), storeAsset: async () => writes++ });
  assert.equal(result.entries.length, 0); assert.equal(writes, 0); assert.match(result.failed[0].error, /checksum/);
});
test('Invalid or over-budget metadata fails only the audio lane', async () => {
  assert.equal((await materializeAudio({ ...options([]), manifest: null })).entries.length, 0);
  const result = await materializeAudio({ ...options([asset(today)]), config: { audio: { budget_bytes: 1, protect_days: 7 } } });
  assert.equal(result.capacity_blocked, true); assert.equal(result.entries.length, 0);
});
test('Audio deadline and unsafe asset names are rejected without storage', async () => {
  let writes = 0;
  const opts = { ...options([asset(today)]), storeAsset: async () => writes++ };
  assert.equal((await materializeAudio({ ...opts, deadline: 1 })).entries.length, 0);
  assert.equal((await materializeAudio({ ...opts, manifest: { entries: [{ ...asset(today), asset: '../escape.mp3' }] } })).entries.length, 0);
  assert.equal(writes, 0);
});
test('Wiki operation page preserves the global audit baseline and validates both languages', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'blog-wiki-test-'));
  const revision = 'a'.repeat(40);
  await writeFile(path.join(directory, 'Home.md'), `# Home\n\n[[Nightly-Pipeline]]\n\n<!-- codex-project-revision: ${'b'.repeat(40)} -->\n`);
  await writeFile(path.join(directory, '_Sidebar.md'), '- [[Home]]\n- [[Nightly Pipeline|Nightly-Pipeline]]\n');
  for (const lang of ['en', 'zh']) {
    const block = managedOperations(config, 'fixture/blog', revision, lang);
    assert(!block.includes('codex-project-revision:'));
    await writeFile(path.join(directory, 'Nightly-Pipeline.md'), `# Nightly Pipeline\n\n${block}\n`);
    const output = await command({ check() {}, deadline: Date.now() + 30000 }, 'python3', ['.agents/skills/github-wiki-maintainer/scripts/validate_wiki.py', directory]);
    assert.match(output, /valid/i);
  }
});
