import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import matter from 'gray-matter';
import { phase, context, dayOffset, shanghai, command, acquireLock, inside } from '../scripts/runtime.mjs';
import { summaryText, prioritize, fingerprint, retentionPlan } from '../../bilingual-blog-narrator/scripts/audio.mjs';
import { fetchWithRetry } from '../../daily-ai-blog-digest/scripts/fetch_with_retry.mjs';
import { postPair } from '../scripts/prefetch.mjs';
import { assertTextPreserved, sourceBoundary } from '../scripts/delivery.mjs';
import { serialCompute } from '../scripts/nightly.mjs';
import { validatePost } from '../../daily-ai-blog-digest/scripts/validate_digest.mjs';
import { promoteBatch } from '../scripts/queue_transaction.mjs';

for (const [time, expected] of [['00:59:59','closed'],['01:00:00','prepare'],['04:59:59','prepare'],['05:00:00','publish'],['05:24:59','publish'],['05:25:00','closing'],['05:30:00','closed'],['12:00:00','closed']]) {
  test(`Shanghai boundary ${time}`, () => assert.equal(phase(new Date(`2026-09-09T${time}+08:00`)), expected));
}
test('Shanghai date and leap-year arithmetic', () => {
  assert.equal(shanghai(new Date('2026-09-08T17:00:00Z')).day, '2026-09-09');
  assert.equal(dayOffset('2028-02-28', 1), '2028-02-29');
});
test('No automatic daytime work', async () => {
  await assert.rejects(context({ mode: 'production', stateRoot: '/tmp/unused', now: new Date('2026-09-09T12:00:00+08:00') }), /Outside/);
});
test('Human exception is preview-only, expiring and single-use across run directories', async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'blog-grant-'));
  const file = path.join(tmp, 'grant.json');
  const grant = { id: randomUUID(), scope: 'one-preview-run', human_confirmation: 'test fixture only', expires_at: new Date(Date.now() + 60000).toISOString() };
  await writeFile(file, JSON.stringify(grant));
  await assert.rejects(context({ mode: 'production', approvalFile: file, stateRoot: tmp }), /never authorize production/);
  const ctx = await context({ mode: 'preview', approvalFile: file, stateRoot: tmp });
  assert.equal(ctx.exception, true); assert.throws(() => ctx.check(true));
  await assert.rejects(context({ mode: 'preview', approvalFile: file, stateRoot: path.join(tmp, 'other') }), /EEXIST/);
  await writeFile(file, JSON.stringify({ ...grant, id: randomUUID(), expires_at: '2020-01-01T00:00:00Z' }));
  await assert.rejects(context({ mode: 'preview', approvalFile: file, stateRoot: tmp }), /expired/);
});
test('Exclusive run lock and path boundary', async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'blog-lock-'));
  const unlock = await acquireLock(path.join(tmp, 'run.lock'));
  await assert.rejects(acquireLock(path.join(tmp, 'run.lock')));
  await unlock();
  assert.throws(() => inside(tmp, '../escape'));
});
test('A stuck child is terminated at its own deadline', async () => {
  const start = Date.now();
  await assert.rejects(command({ check() {}, deadline: Date.now() + 3000 }, process.execPath, ['-e', 'setInterval(()=>{},1000)'], { timeoutMs: 50 }), /deadline exceeded/);
  assert(Date.now() - start < 2500);
});
test('A SIGTERM-ignoring child is force-killed', async () => {
  const start = Date.now();
  await assert.rejects(command({ check() {}, deadline: Date.now() + 4000 }, process.execPath, ['-e', 'process.on("SIGTERM",()=>{});setInterval(()=>{},1000)'], { timeoutMs: 150 }), /deadline exceeded/);
  assert(Date.now() - start < 3500);
});
const body = '> Deck not narrated\n\n## Editorial summary\n\nRead **this summary** about [MCP](https://example.org).\n\n```js\nsecret_code()\n```\n\n---\n\n> **Source boundary:** Source follows\n\n## Source material\n\nDO NOT NARRATE THE ORIGINAL';
test('Narration extracts only summary and strips code/URLs', () => {
  const text = summaryText(body, 'en', { MCP: 'M C P' });
  assert.match(text, /this summary/); assert.match(text, /M C P/);
  assert(!/Deck|ORIGINAL|Source boundary|secret_code|https/.test(text));
});
test('Legacy boundary supported; missing boundary fails closed', () => {
  assert(summaryText(body.replace('\n---\n\n> **Source boundary:** Source follows\n', ''), 'en'));
  assert.throws(() => summaryText('## Editorial summary\nThis is a longer text without a boundary.', 'en'));
});
test('Chinese summary extraction', () => {
  assert.equal(summaryText('## 编辑摘要\n\n这是需要朗读的中文摘要内容。\n\n## 来源材料\n原文不朗读', 'zh'), '这是需要朗读的中文摘要内容。');
});
test('Cache keys invalidate for text, voice, language and model revision', () => {
  const c = { model: 'x', voices: { en: 'Ryan', zh: 'Serena' }, bitrate_kbps: 48 };
  const key = fingerprint('hello', c, 'en', 'r1');
  assert.equal(key, fingerprint('hello', c, 'en', 'r1'));
  for (const k of [fingerprint('new', c, 'en', 'r1'), fingerprint('hello', c, 'en', 'r2'), fingerprint('hello', c, 'zh', 'r1')]) assert.notEqual(key, k);
});
test('Next publication wins over backlog and audio repair', () => {
  const list = [{ day: '2026-09-08', published: true, slug: 'a', lang: 'en' }, { day: '2026-09-10', published: false, slug: 'c', lang: 'zh' }, { day: '2026-09-09', published: false, slug: 'b', lang: 'en' }];
  assert.deepEqual(prioritize(list, new Date('2026-09-09T01:00:00+08:00')).map(e => e.slug), ['b','a','c']);
  assert.equal(prioritize(list, new Date('2026-09-09T05:00:00+08:00'))[0].slug, 'b');
});
const audio = (date, n = 100) => ({ asset: `${date}.mp3`, published_on: date, bytes: n });
test('Keep audio older than seven days while below budget', () => {
  const plan = retentionPlan([audio('2026-08-01'), audio('2026-09-08')], { today: '2026-09-08', budgetBytes: 500 });
  assert.equal(plan.keep.length, 2); assert.equal(plan.remove.length, 0);
});
test('Evict oldest only under pressure; seven calendar days protected', () => {
  const plan = retentionPlan([audio('2026-09-01'), audio('2026-09-02'), audio('2026-09-08')], { today: '2026-09-08', budgetBytes: 200 });
  assert.deepEqual(plan.remove.map(e => e.published_on), ['2026-09-01']); assert(plan.fits);
});
test('Protected audio over budget blocks audio, not text, and never authorizes deletion', () => {
  const plan = retentionPlan([audio('2026-09-02', 200), audio('2026-09-08', 200)], { today: '2026-09-08', budgetBytes: 100 });
  assert.equal(plan.fits, false); assert.equal(plan.remove.length, 0);
});
test('Queued future audio cannot be published by a retention plan', () => {
  assert.throws(() => retentionPlan([audio('2026-09-09')], { today: '2026-09-08', budgetBytes: 1000 }));
});
test('Timeout policy remains twenty total attempts and nineteen 120s waits', async () => {
  let attempts = 0; const sleeps = [];
  await assert.rejects(fetchWithRetry(new URL('https://claude.com/blog/test'), {
    attemptFetch: async () => { attempts++; throw Object.assign(new Error('timeout'), { name: 'TimeoutError' }); },
    sleep: async ms => sleeps.push(ms),
  }), /20 attempts/);
  assert.equal(attempts, 20); assert.deepEqual(sleeps, Array(19).fill(120000));
});
test('Non-timeout HTTP failure is never retried', async () => {
  let count = 0;
  await assert.rejects(fetchWithRetry(new URL('https://claude.com/blog/test'), { attemptFetch: async () => { count++; throw new Error('HTTP 403'); } }));
  assert.equal(count, 1);
});
test('Retry cannot extend beyond the global resource deadline', async () => {
  let count = 0;
  await assert.rejects(fetchWithRetry(new URL('https://claude.com/blog/test'), { deadline: 1000, clock: () => 0, attemptFetch: async () => { count++; } }), /deadline/);
  assert.equal(count, 0);
});
test('Serialized GPU work never overlaps', async () => {
  const compute = serialCompute(); let active = 0, max = 0;
  await Promise.all(Array.from({length: 4}, () => compute(async () => { max = Math.max(max, ++active); await new Promise(r => setTimeout(r, 5)); active--; })));
  assert.equal(max, 1);
});
test('Next publication text jumps ahead of pending backlog compute', async () => {
  const compute = serialCompute(), order = [];
  await Promise.all([compute(() => order.push('future audio'), 4), compute(() => order.push('today text'), -1), compute(() => order.push('today audio'), 0)]);
  assert.deepEqual(order, ['today text', 'today audio', 'future audio']);
});
test('Cancellation shortens the enforced context deadline', async () => {
  const ctx = await context({ mode: 'preview', stateRoot: '/tmp/unused', now: new Date('2999-09-09T01:00:00+08:00') });
  ctx.deadline = Date.now() - 1;
  assert.throws(() => ctx.check(), /deadline/);
});
test('Automation never deletes or rewrites published text', () => {
  assertTextPreserved([{status:'A', file:'_posts/new.md'}, {status:'M', file:'assets/audio-manifest.json'}]);
  for (const status of ['D','M','R100']) assert.throws(() => assertTextPreserved([{ status, file:'_posts/old.md' }]));
  assert.throws(() => assertTextPreserved([{status:'M', file:'README.md'}]));
});
test('Generated bilingual pairs share untranslated source attribution and validate', () => {
  const source = {publisher:'OpenAI', title:'Example post', url:'https://developers.openai.com/blog/example', published_at:'2026-09-01', reuse_policy:'summary-only', official_zh_url:null};
  const pair = postPair(source, {en:{title:'Title', description:'Description', deck:'Deck', summary:'This is an original summary.'},zh:{title:'标题',description:'描述',deck:'导语',summary:'这是原创中文摘要，说明实际意义与局限。'}}, '2026-09-09');
  for (const lang of ['en','zh']) validatePost(pair[lang].name, matter(pair[lang].text), lang, {kind:'queue', queueDate:'2026-09-09'});
  assert.equal(matter(pair.en.text).data.run_mode, 'preview');
  assert.equal(matter(pair.en.text).content.split('### OpenAI:')[1], matter(pair.zh.text).content.split('### OpenAI:')[1]);
});
test('Legacy source boundary migration is idempotent', () => {
  const converted = sourceBoundary('> Deck\n\n## Editorial summary\nSummary\n\n## Source material\nOriginal', 'en');
  assert.equal(converted, sourceBoundary(converted, 'en'));
});
test('Interrupted batch promotion restores the old queue without partial pairs', async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'blog-queue-'));
  const queue = path.join(tmp, 'queue'), staging = path.join(tmp, 'staging');
  await mkdir(path.join(queue, '2026-09-09'), { recursive: true }); await mkdir(staging);
  await writeFile(path.join(queue, '2026-09-09', 'old.md'), 'permanent existing queue');
  await writeFile(path.join(staging, 'new.md'), 'new English'); await writeFile(path.join(staging, 'new-zh.md'), '新中文');
  const items = [{ day: '2026-09-09', paths: [path.join(staging, 'new.md')] }, { day: '2026-09-10', paths: [path.join(staging, 'new-zh.md')] }];
  await assert.rejects(promoteBatch(queue, items, { afterRename: () => { throw new Error('simulated crash'); } }), /simulated crash/);
  assert.equal(await readFile(path.join(queue, '2026-09-09', 'old.md'), 'utf8'), 'permanent existing queue');
  await assert.rejects(readFile(path.join(queue, '2026-09-09', 'new.md')), /ENOENT/);
  await promoteBatch(queue, items);
  assert.equal(await readFile(path.join(queue, '2026-09-10', 'new-zh.md'), 'utf8'), '新中文');
});
