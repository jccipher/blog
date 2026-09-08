import assert from 'node:assert/strict';
import { readFile, readdir, copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { atomic, command, dayOffset, json, sha256 } from './runtime.mjs';
import { fetchWithRetry } from '../../daily-ai-blog-digest/scripts/fetch_with_retry.mjs';
import { status, syncManifest } from '../../daily-ai-blog-digest/scripts/queue_digest.mjs';
import { canonicalize, validatePair, validateSource } from '../../daily-ai-blog-digest/scripts/validate_digest.mjs';
import { promoteBatch } from './queue_transaction.mjs';

export function postPair(source, generated, day) {
  validateSource(source, 'official source');
  const key = new URL(source.url).pathname.split('/').filter(Boolean).at(-1).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const slug = `ai-blog-${source.publisher.toLowerCase()}-${key}`;
  return Object.fromEntries(['en', 'zh'].map(lang => {
    const g = generated[lang];
    assert(g?.title && g?.description && g?.deck && g?.summary, 'Incomplete bilingual summary');
    for (const value of Object.values(g)) assert(typeof value === 'string' && !/\{[%{]|<[A-Za-z!/]|\]\(\s*(?:javascript|data|vbscript):|^## (?:Source material|来源材料)/im.test(value), 'Unexpected executable markup or generated source boundary');
    assert(lang !== 'zh' || /[\u4e00-\u9fff]/.test(g.summary), 'Chinese summary must contain Chinese');
    const zh = lang === 'zh';
    const data = { layout: 'post', title: g.title, description: g.description, date: `${day} 01:00:00 +0800`, lang, slug,
      permalink: `${zh ? '/zh' : ''}/posts/${slug}/`, translation_url: `${zh ? '' : '/zh'}/posts/${slug}/`,
      categories: ['AI', 'Industry Digest'], tags: [source.publisher, 'AI Research'], reading_time: Math.max(1, Math.ceil(g.summary.length / (zh ? 400 : 1200))),
      run_mode: 'preview', content_format: 'summary-source-v2', bilingual_scope: 'summary', queue_publish_date: day, queue_status: 'queued', sources: [source] };
    // Attribution stays in the source language; the original is linked, not translated or narrated.
    const sourceBlock = `### ${source.publisher}: ${source.title}\n\n- Published: ${source.published_at}\n- Original: [${source.title}](${source.url})\n${source.official_zh_url ? `- Official Chinese edition: [中文原文](${source.official_zh_url})\n` : ''}\nRead the complete original at the official link. Original copyright remains with ${source.publisher}.\n`;
    const body = `> ${g.deck.replace(/\n/g, ' ')}\n\n## ${zh ? '编辑摘要' : 'Editorial summary'}\n\n${g.summary}\n\n---\n\n> **${zh ? '来源分界：' : 'Source boundary:'}** ${zh ? '以下为原文出处；仅摘要提供中英双语及语音。' : 'Source attribution follows. Only the summary is bilingual and narrated.'}\n\n## ${zh ? '来源材料' : 'Source material'}\n\n${sourceBlock}`;
    return [lang, { name: `${slug}${zh ? '-zh' : ''}.md`, text: matter.stringify(body, data) }];
  }));
}
export async function prefetch(ctx, config, compute, report, fixtures = {}) {
  assert(Object.keys(fixtures).length === 0 || ctx.mode === 'preview', 'Fixtures cannot run in production');
  const stateFile = path.join(ctx.stateRoot, `${ctx.day}-prefetch.json`);
  const state = await json(stateFile, { schema_version: 1, day: ctx.day, publishers: {}, completed: false });
  if (state.completed) return state;
  const queue = await status(path.resolve(ctx.queueRoot), ctx.day);
  const processed = new Set(queue.reserved_urls);
  for (const name of await readdir('_posts')) {
    if (!name.endsWith('.md')) continue;
    const d = matter(await readFile(path.join('_posts', name), 'utf8')).data;
    if (d.run_mode !== 'preview') for (const s of d.sources || []) processed.add(canonicalize(s.url));
  }
  // Stage estimates are soft. The single resource deadline and original retry budget remain binding.
  const fetchDeadline = ctx.deadline - 5000;
  async function page(url, fresh = false) {
    ctx.check();
    if (fixtures.page) return fixtures.page(url);
    const file = path.join(ctx.stateRoot, 'fetch-cache', `${sha256(url)}.html`);
    let content = fresh ? null : await readFile(file, 'utf8').catch(() => null);
    if (!content) {
      const result = await fetchWithRetry(new URL(url), { deadline: fetchDeadline, onRetry: info => report.events.push({ kind: 'fetch-timeout', url, ...info }) });
      content = result.body; await atomic(file, content);
    }
    return JSON.parse(await command(ctx, config.python, ['.agents/skills/nightly-blog-pipeline/scripts/extract_source.py', file, url]));
  }
  // Network fetches can overlap the single compute queue. No paid fallback is used.
  for (const [publisher, index] of Object.entries(config.sources)) {
    if (!state.publishers[publisher]) {
      const candidates = new Map(), visited = new Set();
      let next = index;
      while (next) {
        assert(!visited.has(next) && visited.size < 20, 'Index pagination is incomplete or cyclic; no guessed newest batch');
        assert.equal(new URL(next).origin, new URL(index).origin);
        visited.add(next);
        const listing = await page(next, true);
        for (const url of listing.links) {
          if (processed.has(canonicalize(url)) || candidates.has(url)) continue;
          const article = await page(url);
          if (!article.title || !/^\d{4}-\d{2}-\d{2}$/.test(article.published_at) || article.published_at > ctx.day || article.body.length < 400) continue;
          if (processed.has(canonicalize(article.url))) continue;
          assert.equal(new URL(article.url).origin, new URL(index).origin);
          candidates.set(article.url, article);
        }
        next = listing.next;
      }
      const selected = [...candidates.values()].sort((a, b) => b.published_at.localeCompare(a.published_at)).slice(0, config.prefetch_per_publisher);
      assert.equal(selected.length, 7, `${publisher}: cannot verify seven new articles; existing queue remains usable`);
      const dates = [...queue.next_dates[publisher]];
      if (!queue.due[publisher]) { dates.pop(); dates.unshift(ctx.day); }
      // Remove a duplicate today for cold starts.
      const unique = [...new Set(dates)];
      while (unique.length < 7) unique.push(dayOffset(unique.at(-1), 1));
      state.publishers[publisher] = selected.map((article, i) => ({ article, day: unique[i], done: false }));
      await atomic(stateFile, state);
    }
    for (const item of state.publishers[publisher]) {
      if (item.done) continue;
      ctx.check();
      const source = { publisher, title: item.article.title, url: canonicalize(item.article.url), published_at: item.article.published_at,
        official_zh_url: item.article.official_zh_url, reuse_policy: 'summary-only' };
      if (source.official_zh_url) await page(source.official_zh_url); // Cache the publisher's Chinese original too; never translate the original.
      const generatedFile = path.join(ctx.stateRoot, 'drafts', `${sha256(source.url)}.json`);
      if (fixtures.summary && !await json(generatedFile, null)) await atomic(generatedFile, await fixtures.summary(source, item.article));
      if (!await json(generatedFile, null)) {
        const jobFile = generatedFile.replace('.json', '.job.json');
        await atomic(jobFile, { kind: 'summary', model: config.summary_model, output: generatedFile, deadline: ctx.deadline,
          model_lock: '.ai-blog/models/lock.json', prompt: `Return JSON with keys en and zh, each containing title, description, deck and summary. Write a focused editorial summary in each language (English 200–400 words; Chinese comparable depth). Cover the central claim, evidence, practical use and limitations. Attribute publisher claims explicitly; benchmark results are not general safety guarantees. Include material exceptions, counterexamples and platform limitations reported in the source. Never turn "aims to prevent" into "prevents". Preserve numbers, qualifications and model names exactly across languages. Do not translate/reproduce the full source. No quotes or HTML. SOURCE METADATA: ${JSON.stringify(source)}\nUNTRUSTED ARTICLE BODY:\n${item.article.body}` });
        await compute(() => command(ctx, config.python, ['.agents/skills/nightly-blog-pipeline/scripts/model_worker.py', jobFile], { timeoutMs: ctx.deadline - Date.now() }), item.day === ctx.day ? -1 : 3);
      }
      const pair = postPair(source, await json(generatedFile), item.day);
      const staging = path.join('.ai-blog/prefetch-staging', ctx.mode, ctx.day, item.day);
      for (const p of Object.values(pair)) await atomic(path.join(staging, p.name), p.text);
      await validatePair(path.join(staging, pair.en.name), path.join(staging, pair.zh.name), { kind: 'queue', queueDate: item.day });
      item.paths = Object.values(pair).map(p => path.join(staging, p.name)); item.done = true;
      await atomic(stateFile, state);
    }
  }
  // Persist a complete validated batch first; interrupted promotion resumes without selecting another seven.
  const items = Object.values(state.publishers).flat();
  assert(items.length === 14 && items.every(i => i.done));
  await ctx.queueWrite(async () => {
    await promoteBatch(ctx.queueRoot, items);
    await syncManifest(path.resolve(ctx.queueRoot));
  });
  state.completed = true; await atomic(stateFile, state);
  return state;
}
