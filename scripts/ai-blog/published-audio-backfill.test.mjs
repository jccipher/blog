import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPublishedAudioManifest, buildPublishedAudioUploadPlan, materializePublishedAudioManifest, planPublishedAudioBackfill, runPublishedAudioBackfill, validateManualBackfillApproval } from './published-audio-backfill.mjs';

const entry = (day, slug, lang, published = true) => ({ day, slug, lang, published });
const metadata = (day, slug, lang) => ({
  scheduled_for: day,
  slug,
  lang,
  fingerprint: 'a'.repeat(64),
  summary_sha256: 'b'.repeat(64),
  sha256: 'c'.repeat(64),
  bytes: 123,
  duration_seconds: 12.3,
  file: `/tmp/${slug}.${lang}.mp3`
});

test('backfill selects only missing published tracks and rehydrates indexed local metadata', () => {
  const published = [
    entry('2026-09-05', 'ai-blog-anthropic-published', 'en'),
    entry('2026-09-05', 'ai-blog-anthropic-published', 'zh'),
    entry('2026-09-18', 'ai-blog-openai-queued', 'en', false)
  ];
  const existing = [metadata('2026-09-05', 'ai-blog-anthropic-published', 'en')];

  const result = planPublishedAudioBackfill({ published, existing });

  assert.deepEqual(result.missing, [entry('2026-09-05', 'ai-blog-anthropic-published', 'zh')]);
  assert.deepEqual(Object.keys(result.reconciledIndex.entries), ['ai-blog-anthropic-published:en']);
  assert.equal(result.reconciledIndex.entries['ai-blog-anthropic-published:en'].file, existing[0].file);
});

test('backfill synthesizes missing published tracks but never queued tracks', async () => {
  const published = [
    entry('2026-09-05', 'ai-blog-anthropic-published', 'en'),
    entry('2026-09-05', 'ai-blog-anthropic-published', 'zh'),
    entry('2026-09-18', 'ai-blog-openai-queued', 'en', false)
  ];
  const existing = [metadata('2026-09-05', 'ai-blog-anthropic-published', 'en')];
  const called = [];

  const result = await runPublishedAudioBackfill({
    published,
    existing,
    narrate: async item => {
      called.push(item);
      return metadata(item.day, item.slug, item.lang);
    }
  });

  assert.deepEqual(called, [entry('2026-09-05', 'ai-blog-anthropic-published', 'zh')]);
  assert.deepEqual(Object.keys(result.reconciledIndex.entries), [
    'ai-blog-anthropic-published:en',
    'ai-blog-anthropic-published:zh'
  ]);
});

test('manifest adds verified published audio and excludes queued audio', () => {
  const published = [
    entry('2026-09-05', 'ai-blog-anthropic-published', 'en'),
    entry('2026-09-18', 'ai-blog-openai-queued', 'en', false)
  ];
  const result = buildPublishedAudioManifest({
    published,
    index: { schema_version: 1, entries: { 'ai-blog-anthropic-published:en': metadata('2026-09-05', 'ai-blog-anthropic-published', 'en') } },
    current: { schema_version: 1, entries: [{ slug: 'ai-blog-existing', lang: 'zh', asset: 'existing.mp3' }] }
  });

  assert.deepEqual(result.entries.map(item => item.asset), [
    '2026-09-05_ai-blog-anthropic-published.en.aaaaaaaaaaaaaaaa.mp3',
    'existing.mp3'
  ]);
  assert.equal(result.entries.some(item => item.slug === 'ai-blog-openai-queued'), false);
});

test('manual backfill approval is scoped, short-lived, and permits the named repository only', () => {
  const now = Date.parse('2026-09-17T10:00:00+08:00');
  const approval = {
    id: 'approval-id',
    scope: 'one-published-audio-backfill',
    repository: 'jccipher/blog',
    human_confirmation: 'Publish only the completed published-post audio backfill.',
    allow_daytime: true,
    expires_at: '2026-09-17T11:30:00+08:00'
  };

  assert.equal(validateManualBackfillApproval({ approval, now, repository: 'jccipher/blog' }), Date.parse(approval.expires_at));
  assert.throws(() => validateManualBackfillApproval({ approval: { ...approval, allow_daytime: false }, now, repository: 'jccipher/blog' }), /daytime/);
  assert.throws(() => validateManualBackfillApproval({ approval, now, repository: 'other/blog' }), /repository/);
  assert.throws(() => validateManualBackfillApproval({ approval: { ...approval, expires_at: '2026-09-17T13:00:01+08:00' }, now, repository: 'jccipher/blog' }), /two hours/);
});

test('upload plan contains only manifest tracks that have matching local metadata', () => {
  const item = metadata('2026-09-05', 'ai-blog-anthropic-published', 'en');
  const manifest = buildPublishedAudioManifest({
    published: [entry('2026-09-05', 'ai-blog-anthropic-published', 'en')],
    index: { schema_version: 1, entries: { 'ai-blog-anthropic-published:en': item } },
    current: { schema_version: 1, entries: [] }
  });

  const plan = buildPublishedAudioUploadPlan({ manifest, index: { schema_version: 1, entries: { 'ai-blog-anthropic-published:en': item } } });

  assert.deepEqual(plan.entries, [{
    asset: '2026-09-05_ai-blog-anthropic-published.en.aaaaaaaaaaaaaaaa.mp3',
    bytes: 123,
    sha256: 'c'.repeat(64),
    local_file: '/tmp/ai-blog-anthropic-published.en.mp3'
  }]);
});

test('materializing the candidate writes only the public audio manifest', async () => {
  const writes = [];
  const manifest = { schema_version: 1, entries: [] };

  await materializePublishedAudioManifest({
    manifest,
    write: async (file, value) => writes.push({ file, value })
  });

  assert.deepEqual(writes, [{ file: 'assets/audio-manifest.json', value: manifest }]);
});
