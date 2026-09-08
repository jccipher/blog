import assert from 'node:assert/strict';
import { mkdtemp, mkdir, symlink, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const project = process.cwd();
const work = await mkdtemp(path.join(os.tmpdir(), 'blog-prefetch-'));
process.chdir(work); await symlink(path.join(project, 'node_modules'), 'node_modules', 'dir');
await mkdir('_posts');
const { atomic, json, dayOffset } = await import('../scripts/runtime.mjs');
await atomic('package.json', { type: 'module' });
const { prefetch, postPair } = await import(pathToFileURL(path.join(project, '.agents/skills/nightly-blog-pipeline/scripts/prefetch.mjs')));
const { status } = await import(pathToFileURL(path.join(project, '.agents/skills/daily-ai-blog-digest/scripts/queue_digest.mjs')));
const config = { sources: { Anthropic: 'https://claude.com/blog', OpenAI: 'https://developers.openai.com/blog' }, prefetch_per_publisher: 7 };
const ctx = { day: '2026-09-08', mode: 'preview', stateRoot: '.ai-blog/preview-runs/fixture', queueRoot: '.ai-blog/preview-queue/fixture', deadline: Date.now() + 60000, check() {}, queueWrite: task => task() };
const g = { en: { title: 'Fixture', description: 'Description', deck: 'Deck', summary: 'An original testing summary.' }, zh: { title: '测试', description: '描述', deck: '导语', summary: '原创中文摘要，用于验证队列。' } };
const articles = new Map();
for (const [publisher, index] of Object.entries(config.sources)) {
  for (let i = 0; i < 10; i++) {
    const article = { publisher, title: `${publisher} article ${i}`, url: `${index}/article-${i}`, published_at: dayOffset('2026-09-07', -i), body: 'Verified source body. '.repeat(30), official_zh_url: null };
    articles.set(article.url, article);
  }
  const reserved = { ...articles.get(`${index}/article-0`), reuse_policy: 'summary-only' };
  for (const p of Object.values(postPair(reserved, g, '2026-09-10'))) await atomic(path.join(ctx.queueRoot, '2026-09-10', p.name), p.text);
}
let calls = 0, generated = 0, fail = true;
const fixtures = {
  page: async url => { calls++; return articles.get(url) || { links: [...articles.keys()].filter(s => s.startsWith(`${url}/`)).reverse(), next: null }; },
  summary: async source => { generated++; if (fail && source.publisher === 'OpenAI') throw new Error('model interruption'); return g; },
};
await assert.rejects(prefetch(ctx, config, task => task(), { events: [] }, fixtures), /model interruption/);
assert.equal(Object.values((await status(path.resolve(ctx.queueRoot), ctx.day)).due).filter(Boolean).length, 0, 'Incomplete batch must not leak into the queue');
fail = false;
await prefetch(ctx, config, task => task(), { events: [] }, fixtures);
const state = await json(path.join(ctx.stateRoot, `${ctx.day}-prefetch.json`));
assert(state.completed);
for (const [publisher, items] of Object.entries(state.publishers)) {
  assert.equal(items.length, 7, 'Existing reserved articles do not count toward seven');
  assert(items.every(i => !i.article.url.endsWith('/article-0')));
  assert.deepEqual(items.map(i => i.day), ['2026-09-08', '2026-09-11', '2026-09-12', '2026-09-13', '2026-09-14', '2026-09-15', '2026-09-16']);
  assert(items.every(i => i.done && i.paths.length === 2));
}
const before = calls;
await prefetch(ctx, config, task => task(), { events: [] }, fixtures);
assert.equal(calls, before, 'Retry of completed daily batch never selects another seven');
assert.equal(generated, 15, 'Only interrupted summary is repeated; completed drafts survive');
const q = await status(path.resolve(ctx.queueRoot), ctx.day);
assert(Object.values(q.due).every(e => e.status === 'queued'));
await assert.rejects(prefetch({ ...ctx, mode: 'production' }, config, task => task(), { events: [] }, fixtures), /Fixtures/);
process.stdout.write(JSON.stringify({ passed: true, new_pairs: 14, new_markdown_files: 28, existing_pairs_preserved: 2, isolated_root: work }) + '\n');
