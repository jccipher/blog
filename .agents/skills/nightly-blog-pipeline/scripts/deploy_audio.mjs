#!/usr/bin/env node
// Runs in the Pages build. Unavailable audio must not block a text deployment.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { atomic, json, sha256, shanghai, phase } from './runtime.mjs';
import { retentionPlan } from '../../bilingual-blog-narrator/scripts/audio.mjs';

export async function materializeAudio({ repo, config, manifest, today = shanghai().day, deadline = Date.now() + 180000, fetchAsset, storeAsset }) {
  const entries = [], failed = [];
  try {
    assert(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo || ''), 'GitHub repository is required');
    const plan = retentionPlan(manifest.entries, { today, budgetBytes: config.audio.budget_bytes, protectedDays: config.audio.protect_days });
    if (!plan.fits) return { entries, failed, capacity_blocked: true };
    // Today's assets win if the bounded download budget cannot fetch the entire archive.
    for (const entry of plan.keep.sort((a, b) => b.published_on.localeCompare(a.published_on))) {
      try {
        assert(/^\d{4}-\d{2}-\d{2}_ai-blog-(?:anthropic|openai)-[a-z0-9-]+\.(?:en|zh)\.[a-f0-9]{16}\.mp3$/.test(entry.asset));
        assert(entry.bytes > 0 && entry.bytes <= 100000000 && /^[a-f0-9]{64}$/.test(entry.sha256));
        assert(Date.now() < deadline, 'Audio download budget reached');
        const bytes = await fetchAsset(entry, deadline);
        assert(bytes.length === entry.bytes && sha256(bytes) === entry.sha256, 'Audio checksum mismatch');
        entries.push({ ...entry, file: await storeAsset(entry, bytes) });
      } catch (error) { failed.push({ asset: entry.asset, error: error.message }); }
    }
  } catch (error) { failed.push({ asset: null, error: error.message }); }
  return { entries, failed, capacity_blocked: false };
}

async function main() {
  let result;
  try {
    const approvedDeadline = Number(process.env.BLOG_DEPLOYMENT_DEADLINE || 0);
    assert(phase() === 'publish' || (approvedDeadline > Date.now() && approvedDeadline <= Date.now() + 2 * 3600000), 'Build audio downloads require the publication window or this run\'s explicit approval');
    const repo = process.env.GITHUB_REPOSITORY;
    const config = await json('.agents/skills/nightly-blog-pipeline/config.json');
    const manifest = await json('assets/audio-manifest.json');
    const deadline = Math.min(Date.now() + 180000, approvedDeadline || Date.parse(shanghai().day + 'T05:30:00+08:00'));
    result = await materializeAudio({
      repo, config, manifest, deadline,
      fetchAsset: async (entry, stop) => {
        const url = 'https://github.com/' + repo + '/releases/download/' + config.audio.release_tag + '/' + entry.asset;
        const response = await fetch(url, { signal: AbortSignal.timeout(Math.max(1, Math.min(45000, stop - Date.now()))) });
        assert(response.ok, 'Audio HTTP ' + response.status);
        const chunks = []; let size = 0;
        for await (const chunk of response.body) { size += chunk.length; assert(size <= entry.bytes); chunks.push(chunk); }
        return Buffer.concat(chunks);
      },
      storeAsset: async (entry, bytes) => {
        await mkdir('.ai-blog/deploy-audio', { recursive: true });
        const file = '.ai-blog/deploy-audio/' + entry.asset;
        await writeFile(file, bytes); return file;
      },
    });
  } catch (error) { result = { entries: [], failed: [{ asset: null, error: error.message }] }; }
  await atomic('.ai-blog/deploy-audio.json', { schema_version: 1, entries: result.entries });
  await atomic('.ai-blog/deploy-audio-report.json', { ...result, ready: result.entries.length });
  process.stdout.write('Audio ready: ' + result.entries.length + '; unavailable: ' + result.failed.length + '. Text is independent.\n');
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
