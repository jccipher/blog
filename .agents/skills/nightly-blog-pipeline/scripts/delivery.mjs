import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import { atomic, command as runCommand, json, sha256, shanghai } from './runtime.mjs';
import { inventory, retentionPlan, summaryText } from '../../bilingual-blog-narrator/scripts/audio.mjs';
import { status, syncManifest } from '../../daily-ai-blog-digest/scripts/queue_digest.mjs';
import { validatePair, validatePost } from '../../daily-ai-blog-digest/scripts/validate_digest.mjs';
import { promoteBatch } from './queue_transaction.mjs';

const command = (ctx, ...args) => (ctx.command || runCommand)(ctx, ...args);
const maybeRead = file => readFile(file, 'utf8').catch(e => { if (e.code === 'ENOENT') return null; throw e; });

export async function staticSiteBytes(directory) {
  let total = 0;
  for (const entry of await readdir(directory, { withFileTypes: true }).catch(e => { if (e.code === 'ENOENT') return []; throw e; })) {
    const file = path.join(directory, entry.name);
    if (file.endsWith(`${path.sep}assets${path.sep}audio`)) continue;
    if (entry.isDirectory()) total += await staticSiteBytes(file);
    else if (entry.isFile()) total += (await stat(file)).size;
  }
  return total;
}

export function assertTextPreserved(changes) {
  for (const { status: code, file } of changes) {
    if (file.startsWith('_posts/')) assert(code === 'A', `Published text is immutable in automation: ${code} ${file}`);
    else assert(file === 'assets/audio-manifest.json' && ['A', 'M'].includes(code), `Unrelated change: ${code} ${file}`);
  }
}
export function sourceBoundary(body, lang) {
  const heading = lang === 'zh' ? '## 来源材料' : '## Source material';
  if (/\n---\n\n> \*\*(?:Source boundary:|来源分界：)\*\*/.test(body)) return body;
  assert(body.includes(`\n${heading}\n`));
  return body.replace(`\n${heading}\n`, `\n---\n\n> **${lang === 'zh' ? '来源分界：' : 'Source boundary:'}** ${lang === 'zh' ? '原文出处如下；语音仅覆盖摘要。' : 'Source attribution follows; narration covers the summary only.'}\n\n${heading}\n`);
}
export async function approvedRepository(ctx, config) {
  ctx.check();
  assert(ctx.mode === 'production' && !ctx.exception, 'Preview cannot mutate GitHub');
  const grant = await json('.ai-blog/production-approval.json');
  assert(grant.approved === true && grant.human_confirmation && grant.config_sha256 === sha256(JSON.stringify(config)), 'Production requires human acceptance of this configuration');
  const repo = (await command(ctx, 'gh', ['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner'])).trim();
  assert(repo === grant.repository, 'Repository does not match production approval');
  return repo;
}
async function gitClean(ctx) {
  assert.equal((await command(ctx, 'git', ['diff', '--name-only'])).trim(), '', 'Tracked changes require human review');
  assert.equal((await command(ctx, 'git', ['diff', '--cached', '--name-only'])).trim(), '', 'Existing staged changes must be preserved');
  assert.equal((await command(ctx, 'git', ['branch', '--show-current'])).trim(), 'main');
  await command(ctx, 'git', ['fetch', 'origin', 'main']);
  const head = (await command(ctx, 'git', ['rev-parse', 'HEAD'])).trim();
  assert.equal(head, (await command(ctx, 'git', ['rev-parse', 'origin/main'])).trim(), 'Local and remote main must be synchronized');
  return head;
}
async function commitPush(ctx, paths, message, repo, base) {
  ctx.check(true);
  await command(ctx, 'git', ['diff', '--check']);
  await command(ctx, 'git', ['fetch', 'origin', 'main']);
  assert.equal(base, (await command(ctx, 'git', ['rev-parse', 'origin/main'])).trim(), 'Remote advanced; never overwrite it');
  await command(ctx, 'git', ['add', '--', ...paths]);
  const lines = (await command(ctx, 'git', ['diff', '--cached', '--name-status'])).trim().split('\n').filter(Boolean);
  assertTextPreserved(lines.map(l => { const [status, file] = l.split('\t'); assert(paths.includes(file)); return { status, file }; }));
  await command(ctx, 'git', ['diff', '--cached', '--check']);
  await command(ctx, 'git', ['commit', '-m', message]);
  const commit = (await command(ctx, 'git', ['rev-parse', 'HEAD'])).trim();
  // The receipt exists before pushing, so a network-uncertain push resumes the same commit.
  const receiptFile = path.join(ctx.stateRoot, 'pending-delivery.json');
  await atomic(receiptFile, { repository: repo, commit, base, paths, state: 'committed' });
  ctx.check(true);
  await command(ctx, 'git', ['push', 'origin', 'HEAD:main'], { timeoutMs: 120000 });
  await atomic(receiptFile, { repository: repo, commit, base, paths, state: 'pushed' });
  return commit;
}
export async function recoverDelivery(ctx, repo) {
  const file = path.join(ctx.stateRoot, 'pending-delivery.json');
  const r = await json(file, null);
  if (!r || r.state !== 'committed') return;
  ctx.check(true);
  assert.equal(r.repository, repo);
  assert.equal((await command(ctx, 'git', ['rev-parse', 'HEAD'])).trim(), r.commit);
  await command(ctx, 'git', ['fetch', 'origin', 'main']);
  const remote = (await command(ctx, 'git', ['rev-parse', 'origin/main'])).trim();
  assert([r.base, r.commit].includes(remote), 'Uncertain push now conflicts with remote changes; human review required');
  if (remote === r.base) await command(ctx, 'git', ['push', 'origin', 'HEAD:main'], { timeoutMs: 120000 });
  await atomic(file, { ...r, state: 'pushed' });
}
export async function recoverPrepared(ctx, repo) {
  await recoverDelivery(ctx, repo);
  const file = path.join(ctx.stateRoot, 'prepared-delivery.json');
  const r = await json(file, null);
  if (!r || r.state === 'pushed') return;
  ctx.check(true);
  assert.equal(r.repository, repo);
  const paths = r.changes.map(e => e.file);
  assertTextPreserved(r.changes.map(e => ({ file: e.file, status: e.before === null ? 'A' : 'M' })));
  const changed = (await command(ctx, 'git', ['diff', 'HEAD', '--name-only'])).trim().split('\n').filter(Boolean);
  assert(changed.every(p => paths.includes(p)), 'Unrelated tracked changes must be preserved during recovery');
  const head = (await command(ctx, 'git', ['rev-parse', 'HEAD'])).trim();
  if (head === r.base) {
    for (const e of r.changes) {
      const current = await maybeRead(e.file);
      assert(current === e.before || current === e.content, `Recovery collision: ${e.file}`);
    }
    for (const e of r.changes) await atomic(e.file, e.content);
    await command(ctx, 'npm', ['run', 'check'], { timeoutMs: 8 * 60000 });
    r.commit = await commitPush(ctx, paths, r.message, repo, r.base);
  } else {
    // Includes a crash after git commit but before the push receipt was written.
    assert.equal((await command(ctx, 'git', ['rev-parse', 'HEAD^'])).trim(), r.base, 'Unexpected commits require human recovery');
    assert.equal(changed.length, 0, 'Post-commit edits require human review');
    const committed = (await command(ctx, 'git', ['diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD'])).trim().split('\n').filter(Boolean);
    assert.deepEqual(committed.sort(), [...paths].sort());
    for (const e of r.changes) assert.equal(await command(ctx, 'git', ['show', `HEAD:${e.file}`]), e.content, `Committed content changed: ${e.file}`);
    await atomic(path.join(ctx.stateRoot, 'pending-delivery.json'), { repository: repo, base: r.base, commit: head, paths, state: 'committed' });
    await recoverDelivery(ctx, repo); r.commit = head;
  }
  await atomic(file, { ...r, state: 'pushed' });
  return r.commit;
}
async function deliverChanges(ctx, changes, message, repo, base) {
  assert(changes.length > 0);
  const file = path.join(ctx.stateRoot, 'prepared-delivery.json');
  assert((await json(file, { state: 'pushed' })).state === 'pushed', 'Previous delivery must recover first');
  for (const e of changes) assert.equal(await maybeRead(e.file), e.before, `Refusing to overwrite ${e.file}`);
  // Record exact owned bytes BEFORE touching posts or the manifest. Untracked user files are not receipts.
  await atomic(file, { repository: repo, base, message, changes, state: 'prepared' });
  return recoverPrepared(ctx, repo);
}
export async function publishText(ctx, config, report, repo) {
  ctx.check(true);
  await recoverPrepared(ctx, repo);
  const base = await gitClean(ctx);
  const q = await status(path.resolve(ctx.queueRoot), ctx.day);
  assert(Object.values(q.due).every(Boolean), 'Today must contain both publishers; audio absence does not block text');
  const changes = [], mark = [], pairs = [];
  const timestamp = shanghai().timestamp;
  for (const publisher of Object.keys(config.sources)) {
    const entry = q.due[publisher];
    await validatePair(entry.english_path, entry.chinese_path, { kind: 'queue', queueDate: ctx.day });
    const pair = [];
    for (const [lang, file] of [['en', entry.english_path], ['zh', entry.chinese_path]]) {
      const target = `_posts/${ctx.day}-${path.basename(file)}`;
      const queued = matter(await readFile(file, 'utf8'));
      const existing = await maybeRead(target);
      if (existing !== null) {
        assert.equal((await command(ctx, 'git', ['ls-files', '--', target])).trim(), target, 'Untracked post is not proof of publication; human review required');
        assert(matter(existing).data.sources[0].url === entry.canonical_url, 'Existing post belongs to another source');
      }
      else {
        const data = { ...queued.data, date: timestamp, run_mode: 'published', content_format: 'summary-source-v2' };
        for (const k of ['queue_status', 'queue_publish_date', 'published_path']) delete data[k];
        changes.push({ file: target, before: null, content: matter.stringify(sourceBoundary(queued.content, lang), data) });
      }
      pair.push(target); mark.push({ file, queued, target });
    }
    pairs.push(pair);
  }
  // Validate the queued pair and each resulting document before touching published paths.
  for (const pair of pairs) {
    for (const target of pair) {
      const e = changes.find(e => e.file === target);
      validatePost(target, matter(e ? e.content : await readFile(target, 'utf8')), target.endsWith('-zh.md') ? 'zh' : 'en');
    }
  }
  if (changes.length) report.text = { state: 'pushed', commit: await deliverChanges(ctx, changes, `Publish AI blog posts for ${ctx.day}`, repo, base) };
  else report.text = { state: 'already-pushed', commit: base };
  const updates = [];
  for (const { file, queued, target } of mark) {
    const staged = path.join('.ai-blog/prefetch-staging/published', ctx.day, path.basename(file));
    await atomic(staged, matter.stringify(queued.content, { ...queued.data, queue_status: 'published', published_path: target }));
    updates.push({ day: ctx.day, paths: [staged], expected: { [path.basename(file)]: await readFile(file, 'utf8') } });
  }
  // Both languages change state in the same recoverable date-folder transaction.
  await promoteBatch(ctx.queueRoot, updates);
  await syncManifest(path.resolve(ctx.queueRoot));
}
export async function publishAudio(ctx, config, report, repo) {
  ctx.check(true);
  await recoverPrepared(ctx, repo);
  const base = await gitClean(ctx);
  const current = await json('assets/audio-manifest.json');
  const local = await json(path.join(ctx.stateRoot, 'audio-index.json'), { entries: {} });
  const dictionary = await json('.agents/skills/bilingual-blog-narrator/pronunciation.json');
  const published = (await inventory(ctx.queueRoot, '_posts')).filter(e => e.published);
  const merged = new Map(current.entries.map(e => [`${e.slug}:${e.lang}`, e]));
  const uploads = [];
  for (const e of published) {
    const m = local.entries[`${e.slug}:${e.lang}`];
    if (!m || m.summary_sha256 !== sha256(summaryText(e.doc.content, e.lang, dictionary[e.lang]))) continue;
    const bytes = await readFile(m.file).catch(() => null);
    if (!bytes || sha256(bytes) !== m.sha256) continue;
    const asset = `${e.day}_${e.slug}.${e.lang}.${m.fingerprint.slice(0, 16)}.mp3`;
    const record = { slug: e.slug, lang: e.lang, published_on: e.day, asset, bytes: bytes.length, sha256: m.sha256, summary_sha256: m.summary_sha256, duration_seconds: m.duration_seconds };
    if (merged.get(`${e.slug}:${e.lang}`)?.asset !== asset) { merged.set(`${e.slug}:${e.lang}`, record); uploads.push({ record, file: m.file }); }
  }
  const budget = Math.min(config.audio.budget_bytes, config.audio.site_budget_bytes - await staticSiteBytes('_site/blog'));
  if (budget <= 0) { report.audio = { state: 'capacity-blocked', reason: 'Static text/assets leave no audio budget' }; return; }
  const plan = retentionPlan([...merged.values()], { today: ctx.day, budgetBytes: budget, protectedDays: config.audio.protect_days });
  if (!plan.fits) { report.audio = { state: 'capacity-blocked', protected_from: plan.protected_from }; return; }
  const next = { schema_version: 1, entries: plan.keep.sort((a, b) => a.asset.localeCompare(b.asset)) };
  if (JSON.stringify(next) === JSON.stringify(current)) { report.audio = { ...report.audio, state: 'unchanged' }; return; }
  // Upload only files included in the accepted capacity plan. Original article text never enters this path.
  for (const { record, file } of uploads.filter(u => next.entries.some(e => e.asset === u.record.asset))) {
    ctx.check(true);
    const release = JSON.parse(await command(ctx, 'gh', ['api', `repos/${repo}/releases/tags/${config.audio.release_tag}`]));
    const exists = release.assets.find(a => a.name === record.asset);
    if (exists) { assert.equal(exists.size, record.bytes); assert(!exists.digest || exists.digest === `sha256:${record.sha256}`, 'Remote asset digest mismatch'); continue; }
    // Use GitHub's raw upload API to keep a readable stable name without renaming local cache files.
    const url = `https://uploads.github.com/repos/${repo}/releases/${release.id}/assets?name=${encodeURIComponent(record.asset)}`;
    await command(ctx, 'gh', ['api', '--method', 'POST', '-H', 'Content-Type: audio/mpeg', '--input', file, url], { timeoutMs: 120000 });
  }
  const retiredFile = path.join(ctx.stateRoot, 'retired-audio.json');
  const retired = await json(retiredFile, { entries: [] });
  const removed = current.entries.filter(e => !next.entries.some(n => n.asset === e.asset));
  retired.entries = [...new Map([...retired.entries, ...removed].map(e => [e.asset, e])).values()];
  await atomic(retiredFile, retired);
  report.audio = { state: 'pushed', commit: await deliverChanges(ctx, [{ file: 'assets/audio-manifest.json', before: await readFile('assets/audio-manifest.json', 'utf8'), content: `${JSON.stringify(next, null, 2)}\n` }], `Update summary audio for ${ctx.day}`, repo, base), total_bytes: plan.total_bytes };
  // Cleanup requires successful deployment, performed separately by the caller.
  report.audio.remove_after_deployment = removed;
}
export async function verifyDeployment(ctx, report, repo) {
  const commit = report.audio?.commit || report.text?.commit;
  if (!commit) return;
  if (report.deployment?.state === 'verified' && report.deployment.commit === commit) return;
  const stop = Math.min(ctx.deadline - 5 * 60000, Date.now() + 10 * 60000);
  while (Date.now() < stop) {
    ctx.check();
    const runs = JSON.parse(await command(ctx, 'gh', ['run', 'list', '--repo', repo, '--workflow', 'pages.yml', '--commit', commit, '--json', 'status,conclusion,databaseId']));
    const run = runs[0];
    if (run?.status === 'completed') {
      assert.equal(run.conclusion, 'success', 'GitHub Pages deployment failed');
      report.deployment = { state: 'workflow-succeeded', commit, run: run.databaseId };
      const entries = await inventory(ctx.queueRoot, '_posts');
      const [owner, name] = repo.split('/');
      const base = `https://${owner}.github.io/${name}`;
      const pages = [];
      for (const e of entries.filter(e => e.published && e.day === ctx.day)) {
        ctx.check();
        const url = `${base}${e.doc.data.permalink}`;
        const response = await fetch(url, { signal: AbortSignal.timeout(Math.min(45000, Math.max(1, stop - Date.now()))) });
        assert(response.ok, `Public page unavailable: ${url}`);
        const html = await response.text();
        assert(html.includes(e.slug) && html.includes(e.lang === 'zh' ? '编辑摘要' : 'Editorial summary'), 'Unexpected public page');
        pages.push(url);
      }
      const manifest = await json('assets/audio-manifest.json');
      const audio = [];
      for (const e of manifest.entries.filter(e => e.published_on === ctx.day)) {
        if (Date.now() >= stop) break;
        const url = `${base}/assets/audio/${e.asset}`;
        const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(Math.min(45000, Math.max(1, stop - Date.now()))) });
        audio.push({ url, ready: response.ok });
      }
      report.deployment = { ...report.deployment, state: 'verified', pages, audio };
      return;
    }
    await new Promise(r => setTimeout(r, 10000));
  }
  report.deployment = { state: 'unverified', commit };
}
export async function cleanupAudio(ctx, config, report, repo) {
  if (report.deployment?.state !== 'verified') return;
  ctx.check(true);
  const live = await json('assets/audio-manifest.json');
  const release = JSON.parse(await command(ctx, 'gh', ['api', `repos/${repo}/releases/tags/${config.audio.release_tag}`]));
  const retiredFile = path.join(ctx.stateRoot, 'retired-audio.json');
  const retired = await json(retiredFile, { entries: [] });
  let deleted = 0;
  for (const old of [...retired.entries]) {
    if (live.entries.some(e => e.asset === old.asset) || old.published_on >= dayCutoff(ctx.day, config.audio.protect_days)) continue;
    const a = release.assets.find(e => e.name === old.asset);
    if (a) { ctx.check(true); await command(ctx, 'gh', ['api', '--method', 'DELETE', `repos/${repo}/releases/assets/${a.id}`]); }
    retired.entries = retired.entries.filter(e => e.asset !== old.asset);
    await atomic(retiredFile, retired); deleted++;
  }
  // Old Pages snapshots may contain retired audio. Remove only completed earlier Pages artifacts.
  if (deleted) {
    const pages = JSON.parse(await command(ctx, 'gh', ['api', '--paginate', '--slurp', `repos/${repo}/actions/artifacts?name=github-pages&per_page=100`]));
    for (const a of pages.flatMap(p => p.artifacts)) {
      if (a.workflow_run?.id === report.deployment.run) continue;
      if (a.created_at > report.started_at) continue;
      ctx.check(true); await command(ctx, 'gh', ['api', '--method', 'DELETE', `repos/${repo}/actions/artifacts/${a.id}`]);
    }
  }
}
function dayCutoff(day, count) { return new Date(Date.parse(`${day}T00:00:00Z`) - (count - 1) * 86400000).toISOString().slice(0, 10); }
