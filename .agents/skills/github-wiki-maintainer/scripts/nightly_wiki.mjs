import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { atomic, command, json } from '../../nightly-blog-pipeline/scripts/runtime.mjs';

export function managedOperations(config, repo, revision, lang = 'en') {
  assert(/^[a-f0-9]{40}$/.test(revision));
  if (lang === 'zh') return `<!-- BEGIN CODEX-MAINTAINED: nightly-operations -->
## 夜间博客运行规则

- 时区：Asia/Shanghai。本机资源窗口：${config.window_start}–${config.window_end}，文字从 ${config.publish_at} 开始上传。
- 每批从每个官方来源新增 ${config.prefetch_per_publisher} 篇；每天每来源发布一篇独立文章的中英摘要。
- 中英语音只朗读编辑摘要。原文不翻译、不朗读；缺少音频不阻塞文字，已发布文字不自动删除或改写。
- 语音至少保留最近 ${config.audio.protect_days} 个自然日，超过容量预算时才清理更早的音频。
- 使用缓存的本地开源模型，不调用付费模型 API。每次新发起白天手动测试都需人工确认，正式任务不能使用预览例外。

已核验配置：[夜间流水线](https://github.com/${repo}/blob/${revision}/.agents/skills/nightly-blog-pipeline/config.json)。

<!-- codex-nightly-revision: ${revision} -->
<!-- END CODEX-MAINTAINED: nightly-operations -->`;
  return `<!-- BEGIN CODEX-MAINTAINED: nightly-operations -->\n## Nightly blog operations\n\n- Time zone: Asia/Shanghai. Local resource window: ${config.window_start}–${config.window_end}. Text uploads begin at ${config.publish_at}.\n- Each prefetch batch selects ${config.prefetch_per_publisher} new official articles per publisher; one bilingual-summary post per publisher is published daily.\n- English and Chinese audio covers only the editorial summary. Original source text is not translated or narrated.\n- Missing audio does not block text. Published text is never automatically deleted or rewritten.\n- Audio keeps at least ${config.audio.protect_days} calendar days; older audio is retained until capacity pressure requires oldest-first cleanup.\n- Inference uses cached open-source local models; no paid model API is part of the nightly runner.\n- Every new daytime manual test requires fresh human approval. Production cannot use a preview exception.\n\nVerified configuration: [nightly pipeline](https://github.com/${repo}/blob/${revision}/.agents/skills/nightly-blog-pipeline/config.json).\n\n<!-- codex-nightly-revision: ${revision} -->\n<!-- END CODEX-MAINTAINED: nightly-operations -->`;
}
export async function updateNightlyWiki(ctx, config, report, repo) {
  const approval = await json('.ai-blog/production-approval.json');
  if (!approval.wiki) { report.wiki = { state: 'not-authorized' }; return; }
  if (report.deployment?.state !== 'verified') { report.wiki = { state: 'waiting-for-verified-revision' }; return; }
  ctx.check(true);
  const revision = (await command(ctx, 'git', ['log', '-1', '--format=%H', '--', '.agents/skills/nightly-blog-pipeline', '.agents/skills/bilingual-blog-narrator', '.agents/skills/daily-ai-blog-digest', '.agents/skills/github-wiki-maintainer', '.github/workflows/pages.yml'])).trim();
  const work = await mkdtemp(path.join(os.tmpdir(), 'latentx-wiki-'));
  await command(ctx, 'git', ['clone', '--depth', '1', `https://github.com/${repo}.wiki.git`, work], { timeoutMs: 120000 });
  const file = path.join(work, 'Nightly-Pipeline.md');
  const existing = await readFile(file, 'utf8').catch(e => { if (e.code === 'ENOENT') return null; throw e; });
  const home = await readFile(path.join(work, 'Home.md'), 'utf8');
  const language = /[\u4e00-\u9fff]/.test(existing || home) ? 'zh' : 'en';
  const block = managedOperations(config, repo, revision, language);
  const region = /<!-- BEGIN CODEX-MAINTAINED: nightly-operations -->[\s\S]*?<!-- END CODEX-MAINTAINED: nightly-operations -->/;
  if (existing) assert(region.test(existing), 'Existing Wiki page has no managed region; preserve it for human review');
  const next = existing ? existing.replace(region, block) : `# Nightly Pipeline\n\n${block}\n`;
  if (next === existing) { report.wiki = { state: 'unchanged' }; return; }
  await atomic(file, next);
  const sidebarPath = path.join(work, '_Sidebar.md');
  const sidebar = await readFile(sidebarPath, 'utf8').catch(e => { if (e.code === 'ENOENT') return ''; throw e; });
  const paths = ['Nightly-Pipeline.md'];
  if (!sidebar.includes('Nightly-Pipeline')) { await atomic(sidebarPath, `${sidebar.trimEnd()}\n- [[Nightly Pipeline|Nightly-Pipeline]]\n`); paths.push('_Sidebar.md'); }
  await command(ctx, config.python, [path.resolve('.agents/skills/github-wiki-maintainer/scripts/validate_wiki.py'), work]);
  await command(ctx, 'git', ['diff', '--check'], { cwd: work });
  const branch = (await command(ctx, 'git', ['branch', '--show-current'], { cwd: work })).trim();
  await command(ctx, 'git', ['fetch', 'origin', branch], { cwd: work });
  assert.equal((await command(ctx, 'git', ['rev-parse', 'HEAD'], {cwd:work})).trim(), (await command(ctx, 'git', ['rev-parse', `origin/${branch}`], {cwd:work})).trim(), 'Wiki changed concurrently');
  ctx.check(true);
  await command(ctx, 'git', ['add', '--', ...paths], { cwd: work });
  await command(ctx, 'git', ['diff', '--cached', '--check'], { cwd: work });
  await command(ctx, 'git', ['commit', '-m', `Document nightly pipeline at ${revision.slice(0, 12)}`], { cwd: work });
  ctx.check(true); await command(ctx, 'git', ['push', 'origin', branch], { cwd: work, timeoutMs: 120000 });
  const wikiCommit = (await command(ctx, 'git', ['rev-parse', 'HEAD'], { cwd: work })).trim();
  report.wiki = { state: 'pushed', wiki_commit: wikiCommit, project_revision: revision, url: `https://github.com/${repo}/wiki/Nightly-Pipeline` };
  ctx.check();
  const response = await fetch(report.wiki.url, { signal: AbortSignal.timeout(Math.max(1, Math.min(45000, ctx.deadline - Date.now()))) });
  assert(response.ok && (await response.text()).includes(revision), 'Wiki was pushed but its public page is not yet verified');
  report.wiki.state = 'verified';
}
