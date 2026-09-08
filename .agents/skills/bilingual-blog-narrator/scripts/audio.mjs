import assert from 'node:assert/strict';
import { readFile, readdir, stat, copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';
import { atomic, command, dayOffset, json, sha256, shanghai } from '../../nightly-blog-pipeline/scripts/runtime.mjs';

function tokenText(tokens) {
  return tokens.map(t => {
    if (['html', 'image', 'def', 'hr'].includes(t.type)) return '';
    if (t.type === 'code') return '';
    if (t.type === 'list') return t.items.map(i => tokenText(i.tokens)).join('\n');
    if (t.type === 'table') return ''; // A visual table is not a reliable reading order.
    return t.tokens ? tokenText(t.tokens) : (t.text || '') + (['paragraph', 'heading'].includes(t.type) ? '\n' : '');
  }).join(' ');
}
export function summaryText(content, lang, dictionary = {}) {
  const start = lang === 'zh' ? /^## 编辑摘要\s*$/m : /^## Editorial summary\s*$/m;
  const match = start.exec(content);
  assert(match, 'Summary heading missing; never fall back to reading the full article');
  const body = content.slice(match.index + match[0].length);
  const stop = /\n(?:---\s*\n|## (?:Source material|来源材料)\s*\n)/.exec(body);
  assert(stop, 'Source boundary missing; refusing full-text narration');
  let text = tokenText(marked.lexer(body.slice(0, stop.index)))
    .replace(/https?:\/\/\S+/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n').trim();
  for (const [term, spoken] of Object.entries(dictionary)) {
    text = text.replace(new RegExp(`(?<![A-Za-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z0-9])`, 'g'), spoken);
  }
  assert(text.length > 10, 'Summary has no substantive speakable content');
  return text;
}
export function fingerprint(text, config, lang, revision) {
  assert(revision, 'A pinned local model revision is required');
  return sha256(JSON.stringify({ text, lang, model: config.model, revision, voice: config.voices[lang], bitrate: config.bitrate_kbps, extractor: 1 }));
}
export function prioritize(entries, now = new Date()) {
  const clock = shanghai(now);
  const next = clock.day; // Today's delayed unpublished pair still precedes tomorrow's.
  const dueDate = entries.filter(e => !e.published && e.day >= next).map(e => e.day).sort()[0];
  const rank = e => !e.published && e.day === dueDate ? 0 : e.published ? 1 : 2;
  return [...entries].sort((a, b) => rank(a) - rank(b) || a.day.localeCompare(b.day) || a.slug.localeCompare(b.slug) || a.lang.localeCompare(b.lang));
}
export function retentionPlan(entries, { today, budgetBytes, protectedDays = 7 }) {
  assert(Number.isSafeInteger(budgetBytes) && budgetBytes > 0);
  const cutoff = dayOffset(today, -(protectedDays - 1));
  const keep = [...entries];
  for (const e of keep) {
    assert(/^\d{4}-\d{2}-\d{2}$/.test(e.published_on) && e.published_on <= today, 'Only actually published audio may reach GitHub');
    assert(Number.isSafeInteger(e.bytes) && e.bytes > 0);
  }
  let total = keep.reduce((s, e) => s + e.bytes, 0);
  const remove = [];
  for (const entry of [...keep].sort((a, b) => a.published_on.localeCompare(b.published_on) || a.asset.localeCompare(b.asset))) {
    if (total <= budgetBytes) break;
    if (entry.published_on >= cutoff) continue;
    remove.push(entry); keep.splice(keep.indexOf(entry), 1); total -= entry.bytes;
  }
  // Caller must not execute any removal when even protected audio cannot fit.
  return { keep, remove, total_bytes: total, fits: total <= budgetBytes, protected_from: cutoff };
}
export async function inventory(queueRoot, postsRoot, includePublished = true) {
  const records = new Map();
  async function scan(dir, published) {
    for (const name of await readdir(dir).catch(e => { if (e.code === 'ENOENT') return []; throw e; })) {
      if (!name.endsWith('.md')) continue;
      const file = path.join(dir, name), doc = matter(await readFile(file, 'utf8'));
      const { data } = doc;
      if (!data.slug?.startsWith('ai-blog-') || !['en', 'zh'].includes(data.lang)) continue;
      if (published && data.run_mode === 'preview') continue;
      if (!published && data.queue_status !== 'queued') continue;
      const day = published ? name.slice(0, 10) : path.basename(dir);
      records.set(`${data.slug}:${data.lang}`, { slug: data.slug, lang: data.lang, day, published, file, doc });
    }
  }
  for (const d of await readdir(queueRoot).catch(() => [])) if (/^\d{4}-\d{2}-\d{2}$/.test(d)) await scan(path.join(queueRoot, d), false);
  if (includePublished) await scan(postsRoot, true);
  return [...records.values()];
}
export async function narrate(ctx, entry, config, modelLock) {
  ctx.check();
  const dictionary = await json('.agents/skills/bilingual-blog-narrator/pronunciation.json');
  const text = summaryText(entry.doc.content, entry.lang, dictionary[entry.lang]);
  const revision = modelLock.models[config.audio.model]?.revision;
  const hash = fingerprint(text, config.audio, entry.lang, revision);
  const name = `${entry.slug}.${entry.lang}.${hash.slice(0, 16)}`;
  const dir = path.join(ctx.queueRoot, entry.day, 'audio');
  const file = path.join(dir, `${name}.mp3`), metaFile = path.join(dir, `${name}.json`);
  const existing = await json(metaFile, null);
  if (existing?.fingerprint === hash) {
    const buf = await readFile(file).catch(() => null);
    if (buf && sha256(buf) === existing.sha256) {
      const indexFile = path.join(ctx.stateRoot, 'audio-index.json');
      const index = await json(indexFile, { schema_version: 1, entries: {} });
      index.entries[`${entry.slug}:${entry.lang}`] = { ...existing, file };
      await atomic(indexFile, index);
      return { ...existing, file, cached: true };
    }
  }
  // Never let date-folder promotion move a model's open output file.
  const workFile = path.join('.ai-blog/narration-work', ctx.mode, `${name}.mp3`);
  const job = `${workFile}.job.json`;
  await atomic(job, { kind: 'tts', text, lang: entry.lang, voice: config.audio.voices[entry.lang], model: config.audio.model,
    output: workFile, bitrate: config.audio.bitrate_kbps, deadline: ctx.deadline, model_lock: '.ai-blog/models/lock.json' });
  await command(ctx, config.python, ['.agents/skills/nightly-blog-pipeline/scripts/model_worker.py', job], { timeoutMs: ctx.deadline - Date.now(), env: { HF_HUB_OFFLINE: '1', TRANSFORMERS_OFFLINE: '1', HF_HOME: path.resolve('.ai-blog/models/hub') } });
  const probe = JSON.parse(await command(ctx, 'ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', workFile]));
  const duration = Number(probe.format.duration);
  assert(duration > 1 && probe.streams.some(s => s.codec_type === 'audio'), 'Invalid or empty audio');
  const buf = await readFile(workFile);
  const meta = { schema_version: 1, slug: entry.slug, lang: entry.lang, scheduled_for: entry.day, fingerprint: hash,
    summary_sha256: sha256(text), sha256: sha256(buf), bytes: buf.length, duration_seconds: duration,
    model: config.audio.model, revision, voice: config.audio.voices[entry.lang], scope: 'summary', file,
    generated_at: new Date().toISOString() };
  await ctx.queueWrite(async () => {
    ctx.check(); await mkdir(dir, { recursive: true });
    await copyFile(workFile, file); await atomic(metaFile, meta);
  });
  const indexFile = path.join(ctx.stateRoot, 'audio-index.json');
  const index = await json(indexFile, { schema_version: 1, entries: {} });
  index.entries[`${entry.slug}:${entry.lang}`] = meta;
  await atomic(indexFile, index);
  return meta;
}
