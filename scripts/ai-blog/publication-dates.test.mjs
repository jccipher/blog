import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { before, test } from 'node:test';

before(() => {
  execFileSync(process.execPath, ['scripts/preview-build.mjs'], {
    env: { ...process.env, TZ: 'UTC' },
    stdio: 'pipe',
  });
});

function aiArchiveEntries(html) {
  const pattern = /<a class="archive-item" href="[^"]*\/posts\/(ai-blog-[^/]+)\/">\s*<time datetime="([^"]+)">(\d{4}\.\d{2}\.\d{2})<\/time>/g;
  return [...html.matchAll(pattern)].map(([, slug, datetime, label]) => ({ slug, datetime, label }));
}

test('UTC Pages build shows exactly two AI posts per Shanghai editorial day from September 17', async () => {
  for (const languagePath of ['archives', 'zh/archives']) {
    const html = await readFile(`_site/blog/${languagePath}/index.html`, 'utf8');
    const entries = aiArchiveEntries(html);
    for (let offset = 0; offset < 15; offset++) {
      const date = new Date(Date.UTC(2026, 8, 17 + offset)).toISOString().slice(0, 10);
      const label = date.replaceAll('-', '.');
      const matches = entries.filter(entry => entry.label === label);
      assert.equal(matches.length, 2, `${languagePath}: ${label} should have two posts`);
      assert(matches.every(entry => entry.datetime === date), `${languagePath}: datetime should match ${date}`);
      assert.equal(matches.filter(entry => entry.slug.startsWith('ai-blog-anthropic-')).length, 1);
      assert.equal(matches.filter(entry => entry.slug.startsWith('ai-blog-openai-')).length, 1);
    }
  }
});

test('archive order follows editorial dates instead of original queue filenames', async () => {
  const html = await readFile('_site/blog/archives/index.html', 'utf8');
  const entries = aiArchiveEntries(html).filter(entry => entry.label >= '2026.09.17');
  assert.equal(entries.length, 30);
  assert.equal(entries[0].label, '2026.10.01');
  assert.equal(entries.at(-1).label, '2026.09.17');
  assert.deepEqual(entries.map(entry => entry.label), [...entries.map(entry => entry.label)].sort().reverse());
});

test('English and Chinese article headers use the assigned editorial date', async () => {
  for (const [relativePath, expected] of [
    ['posts/ai-blog-anthropic-reducing-cost-and-improving-performance-with-claude-platform', '2026.09.17'],
    ['posts/ai-blog-anthropic-how-an-anthropic-field-marketer-uses-claude-code-to-send-weekly-personalized-updates-to-every-sales-rep', '2026.09.18'],
    ['zh/posts/ai-blog-openai-codex-as-a-platform', '2026.10.01'],
  ]) {
    const html = await readFile(`_site/blog/${relativePath}/index.html`, 'utf8');
    assert(html.includes(`>${relativePath.startsWith('zh/') ? '发布于' : 'PUBLISHED'} ${expected}</time>`), relativePath);
  }
});
