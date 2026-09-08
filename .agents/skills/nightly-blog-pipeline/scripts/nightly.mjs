#!/usr/bin/env node
import assert from 'node:assert/strict';
import { cp, mkdir, readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { acquireLock, atomic, command, context, dayOffset, json, phase, shanghai, until } from './runtime.mjs';
import { inventory, narrate, prioritize } from '../../bilingual-blog-narrator/scripts/audio.mjs';
import { prefetch } from './prefetch.mjs';
import { approvedRepository, publishText, publishAudio, verifyDeployment, cleanupAudio } from './delivery.mjs';
import { recoverQueue } from './queue_transaction.mjs';
import { updateNightlyWiki } from '../../github-wiki-maintainer/scripts/nightly_wiki.mjs';

export function serialCompute() {
  const waiting = []; let active = false;
  const drain = async () => {
    if (active) return;
    active = true;
    while (waiting.length) {
      waiting.sort((a, b) => a.priority - b.priority);
      const { task, resolve, reject } = waiting.shift();
      try { resolve(await task()); } catch (e) { reject(e); }
    }
    active = false;
  };
  return (task, priority = 0) => new Promise((resolve, reject) => { waiting.push({ task, priority, resolve, reject }); queueMicrotask(drain); });
}
function options(tokens) {
  const result = {};
  for (let i = 0; i < tokens.length; i++) {
    assert(tokens[i].startsWith('--'));
    assert(tokens[i + 1] && !tokens[i + 1].startsWith('--'), `${tokens[i]} requires a value`);
    result[tokens[i].slice(2)] = tokens[++i];
  }
  return result;
}
export async function run(mode, args = {}) {
  const config = await json('.agents/skills/nightly-blog-pipeline/config.json');
  const production = mode === 'run';
  assert(!args['published-date'] || (mode === 'preview' && /^\d{4}-\d{2}-\d{2}$/.test(args['published-date']) && args['published-date'] <= shanghai().day), 'Published-date previews must name a non-future date');
  assert(['run', 'preview', 'test', 'setup', 'plan'].includes(mode));
  if (mode === 'plan') {
    const entries = prioritize(await inventory('.ai-blog/queue', '_posts'));
    return { phase: phase(), next: entries.slice(0, 12).map(({ day, slug, lang, published }) => ({ day, slug, lang, published })) };
  }
  const id = `${shanghai().day}-${randomUUID()}`;
  const stateRoot = production ? '.ai-blog/nightly-state' : `.ai-blog/preview-runs/${id}`;
  const ctx = await context({ mode: production ? 'production' : 'preview', stateRoot, approvalFile: args['approval-file'] });
  ctx.queueRoot = production ? '.ai-blog/queue' : `.ai-blog/preview-queue/${id}`;
  const releaseLock = await acquireLock('.ai-blog/nightly-run.lock');
  const report = { schema_version: 1, task_name: `${ctx.day}_cron_task`, mode, daytime_exception: ctx.exception,
    started_at: new Date().toISOString(), text: { state: 'not-attempted' }, audio: { state: 'not-attempted' }, events: [] };
  const reportFile = path.join(stateRoot, 'report.json');
  const compute = serialCompute();
  ctx.queueWrite = serialCompute();
  let fatal;
  // Outer watchdog does not depend on an LLM following a prompt. Child commands also have their own deadlines.
  const watchdog = setTimeout(() => { process.kill(process.pid, 'SIGTERM'); setTimeout(() => process.exit(75), 1200); }, Math.max(1, ctx.deadline - Date.now() - 1500));
  const onStop = () => { ctx.deadline = Math.min(ctx.deadline, Date.now()); };
  process.once('SIGTERM', onStop); process.once('SIGINT', onStop);
  const heartbeat = setInterval(() => { process.stdout.write(`Nightly pipeline: ${phase()} — ${report.events.at(-1)?.kind || 'running'}\n`); }, 30000);
  const event = async e => { report.events.push({ at: new Date().toISOString(), ...e }); await atomic(reportFile, report); };
  try {
    await recoverQueue(ctx.queueRoot);
    if (mode === 'test') {
      report.tests = await command(ctx, 'npm', ['run', 'test:nightly']);
      report.legacy_tests = await command(ctx, 'npm', ['run', 'test:ai-blog-automation']);
      report.build = await command(ctx, 'npm', ['run', 'check']);
      return report;
    }
    if (mode === 'setup') {
      const file = path.join(stateRoot, 'setup.job.json');
      await atomic(file, { deadline: ctx.deadline, models: [config.audio.model, config.summary_model] });
      report.setup = await command(ctx, config.python, ['.agents/skills/nightly-blog-pipeline/scripts/setup_models.py', file], { timeoutMs: ctx.deadline - Date.now() });
      return report;
    }
    if (!production) {
      // Copy queued material only; preview state never changes production reservations or processed URLs.
      await mkdir(ctx.queueRoot, { recursive: true });
      for (const day of await readdir('.ai-blog/queue')) if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
        await cp(path.join('.ai-blog/queue', day), path.join(ctx.queueRoot, day), { recursive: true });
      }
    }
    const models = await json('.ai-blog/models/lock.json', { models: {} });
    const failures = new Set();
    async function makeAudio(limit = Infinity) {
      let completed = 0;
      const ordered = prioritize((await inventory(ctx.queueRoot, '_posts', production || !!args['published-date'])).filter(e => !args['published-date'] || (e.published && e.day === args['published-date'])));
      for (const e of ordered) {
        if (completed >= limit || Date.now() >= ctx.deadline - 10000 || (production && phase() === 'closing')) break;
        const key = `${e.slug}:${e.lang}`;
        if (failures.has(key)) continue;
        try {
          const nextDay = ordered.find(e => !e.published)?.day;
          const priority = !e.published && e.day === nextDay ? 0 : e.published ? 2 : 4;
          const value = await compute(() => narrate(ctx, e, config, models), priority);
          completed++;
          await event({ kind: 'audio-ready', slug: e.slug, lang: e.lang, cached: !!value.cached, bytes: value.bytes, seconds: value.duration_seconds });
        } catch (e) { failures.add(key); await event({ kind: 'audio-failed', key, error: e.message }); }
      }
    }
    if (!production) {
      const limit = Number(args['max-audio'] ?? 4);
      assert(Number.isInteger(limit) && limit >= 0 && limit <= 28);
      await makeAudio(limit);
      const index = await json(path.join(stateRoot, 'audio-index.json'), { entries: {} });
      const entries = Object.values(index.entries).map(m => ({ ...m, asset: `${m.scheduled_for}_${m.slug}.${m.lang}.${m.fingerprint.slice(0, 16)}.mp3` }));
      const manifest = path.join(stateRoot, 'preview-audio.json'); await atomic(manifest, { schema_version: 1, entries });
      const first = args['published-date'] || prioritize(await inventory(ctx.queueRoot, '_posts', false))[0]?.day;
      assert(first, 'Preview needs a queued bilingual pair');
      report.build = await command(ctx, 'npm', ['run', 'check'], { env: { ...(!args['published-date'] ? { BLOG_PREVIEW_QUEUE: path.join(ctx.queueRoot, first) } : {}), BLOG_AUDIO_MANIFEST: manifest } });
      report.preview = { queue_date: first, audio_manifest: manifest, audio_count: entries.length, bytes: entries.reduce((s, e) => s + e.bytes, 0),
        pages: (await inventory(ctx.queueRoot, '_posts', !!args['published-date'])).filter(e => e.day === first && (!args['published-date'] || e.published)).map(e => `/blog${e.doc.data.permalink}`) };
      report.audio.state = failures.size ? 'partial-preview' : 'preview-ready';
    } else {
      const repo = await approvedRepository(ctx, config);
      // Publication has its own clock; waiting downloads or TTS cannot postpone the text trigger.
      const publication = (async () => {
        await until(ctx, Date.parse(`${ctx.day}T05:00:00+08:00`));
        while (phase() === 'publish' && Date.now() < ctx.deadline - 6 * 60000) {
          if (!['pushed', 'already-pushed'].includes(report.text.state)) {
            try { await ctx.queueWrite(() => publishText(ctx, config, report, repo)); }
            catch (e) { await event({ kind: 'text-publication-deferred', error: e.message }); }
          }
          try { await publishAudio(ctx, config, report, repo); }
          catch (e) { await event({ kind: 'audio-delivery-deferred', error: e.message }); }
          try { await verifyDeployment(ctx, report, repo); await cleanupAudio(ctx, config, report, repo); }
          catch (e) { await event({ kind: 'deployment-verification-deferred', error: e.message }); }
          if (!report.wiki && report.deployment?.state === 'verified') {
            try { await updateNightlyWiki(ctx, config, report, repo); }
            catch (e) { report.wiki = { state: 'deferred', error: e.message }; await event({ kind: 'wiki-deferred', error: e.message }); }
          }
          await until(ctx, Math.min(ctx.deadline - 6 * 60000, Date.now() + 120000));
        }
      })();
      const preparation = (async () => {
        const audio = makeAudio(); // Work on the next publication while network fetching waits.
        try { await prefetch(ctx, config, compute, report); }
        catch (e) { await event({ kind: 'prefetch-deferred', error: e.message }); }
        await audio;
        await makeAudio(); // Newly queued pairs become eligible for advance narration.
      })();
      await Promise.allSettled([preparation, publication]).then(results => results.forEach(r => { if (r.status === 'rejected') report.events.push({ kind: 'phase-failed', error: r.reason.message }); }));
    }
  } catch (e) { fatal = e; report.error = e.message; }
  finally {
    clearInterval(heartbeat); clearTimeout(watchdog); process.off('SIGTERM', onStop); process.off('SIGINT', onStop);
    report.finished_at = new Date().toISOString();
    await atomic(reportFile, report);
    await releaseLock();
    process.stdout.write(`Report: ${reportFile}\n`);
  }
  if (fatal) throw fatal;
  return report;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [mode, ...args] = process.argv.slice(2);
  try { process.stdout.write(`${JSON.stringify(await run(mode, options(args)), null, 2)}\n`); }
  catch (e) { process.stderr.write(`${e.message}\n`); process.exitCode = 1; }
}
