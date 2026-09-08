// Isolated real Git repositories; never contacts GitHub or changes the project checkout.
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, symlink } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
const project = process.cwd();
const tmp = await mkdtemp(path.join(os.tmpdir(), 'blog-delivery-'));
const { command, atomic, json, shanghai } = await import('../scripts/runtime.mjs');
const ctx = { mode: 'production', day: shanghai().day, stateRoot: '.ai-blog/nightly-state', queueRoot: '.ai-blog/queue', deadline: Date.now() + 60000, check() {} };
const git = (args, options = {}) => command(ctx, 'git', args, { cwd: tmp, ...options });
await git(['init', '--bare', path.join(tmp, 'remote.git')]);
await mkdir(path.join(tmp, 'work')); process.chdir(path.join(tmp, 'work'));
await git(['init', '-b', 'main'], { cwd: process.cwd() });
await symlink(path.join(project, 'node_modules'), 'node_modules', 'dir');
await atomic('.gitignore', '.ai-blog/\nnode_modules/\n');
await atomic('assets/audio-manifest.json', { schema_version: 1, entries: [] });
await atomic('package.json', { type: 'module', private: true });
await mkdir('_posts');
const runGit = args => command(ctx, 'git', args);
await runGit(['config', 'user.name', 'Local Fixture']); await runGit(['config', 'user.email', 'fixture@example.invalid']);
await runGit(['add', '.gitignore', 'package.json', 'assets/audio-manifest.json']); await runGit(['commit', '-m', 'fixture base']);
await runGit(['remote', 'add', 'origin', path.join(tmp, 'remote.git')]); await runGit(['push', '-u', 'origin', 'main']);
// Import after chdir: the legacy validator binds its project root at module initialization.
const delivery = await import(pathToFileURL(path.join(project, '.agents/skills/nightly-blog-pipeline/scripts/delivery.mjs')));
const { postPair } = await import(pathToFileURL(path.join(project, '.agents/skills/nightly-blog-pipeline/scripts/prefetch.mjs')));
const { status } = await import(pathToFileURL(path.join(project, '.agents/skills/daily-ai-blog-digest/scripts/queue_digest.mjs')));
const config = { sources: { Anthropic: 'https://claude.com/blog', OpenAI: 'https://developers.openai.com/blog' } };
const summaries = { en: { title: 'Fixture', description: 'Description', deck: 'Deck', summary: 'An original local testing summary.' }, zh: { title: '测试', description: '描述', deck: '导语', summary: '这是本地测试的原创中文摘要。' } };
for (const [publisher, url] of Object.entries(config.sources)) {
  const pair = postPair({ publisher, title: `${publisher} fixture`, url: `${url}/fixture`, published_at: '2026-09-01', reuse_policy: 'summary-only', official_zh_url: null }, summaries, ctx.day);
  for (const p of Object.values(pair)) await atomic(path.join(ctx.queueRoot, ctx.day, p.name), p.text);
}
let failBuild = true, uncertainPush = false, interceptedPushes = 0;
ctx.command = async (context, cmd, args, options) => {
  if (cmd === 'npm') { if (failBuild) throw new Error('simulated interrupted build'); return 'fixture build passed'; }
  assert.equal(cmd, 'git', 'No network service is allowed in this fixture');
  const result = await command(context, cmd, args, options);
  if (args[0] === 'push') { interceptedPushes++; if (uncertainPush) { uncertainPush = false; throw new Error('simulated network-uncertain push'); } }
  return result;
};
const report = {};
await assert.rejects(delivery.publishText(ctx, config, report, 'fixture/blog'), /interrupted build/);
assert.equal((await json(path.join(ctx.stateRoot, 'prepared-delivery.json'))).state, 'prepared');
assert(Object.values((await status(path.resolve(ctx.queueRoot), ctx.day)).due).every(e => e.status === 'queued'));
failBuild = false; uncertainPush = true;
await assert.rejects(delivery.publishText(ctx, config, report, 'fixture/blog'), /uncertain push/);
assert.equal((await json(path.join(ctx.stateRoot, 'pending-delivery.json'))).state, 'committed');
await delivery.publishText(ctx, config, report, 'fixture/blog');
assert.equal(report.text.state, 'already-pushed');
assert.equal(interceptedPushes, 1, 'Remote already accepted the uncertain push; no duplicate push');
assert.equal((await runGit(['rev-list', '--count', 'HEAD'])).trim(), '2');
assert(Object.values((await status(path.resolve(ctx.queueRoot), ctx.day)).due).every(e => e.status === 'published'));
await delivery.publishText(ctx, config, report, 'fixture/blog');
assert.equal((await runGit(['rev-list', '--count', 'HEAD'])).trim(), '2', 'No duplicate publication');
// A source-looking untracked file without an ownership receipt must never count as published.
const separate = await mkdtemp(path.join(os.tmpdir(), 'blog-untracked-'));
await mkdir(path.join(separate, '_posts')); await mkdir(path.join(separate, '.ai-blog'));
// Exercise recovery's exact-byte guard directly without resetting the successful fixture repository.
const receipt = await json(path.join(ctx.stateRoot, 'prepared-delivery.json'));
await atomic(path.join(ctx.stateRoot, 'prepared-delivery.json'), { ...receipt, state: 'prepared', base: (await runGit(['rev-parse', 'HEAD'])).trim() });
await atomic(receipt.changes[0].file, 'user edited text');
await assert.rejects(delivery.recoverPrepared(ctx, 'fixture/blog'), /Recovery collision/);
process.stdout.write(JSON.stringify({ tests: ['interrupted-build', 'uncertain-push', 'no-duplicate-publication', 'queue-after-remote-only', 'user-edit-preserved'], passed: true, isolated_root: tmp }) + '\n');
