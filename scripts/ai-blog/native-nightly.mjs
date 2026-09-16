#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { githubPreflight } from './github-publisher.mjs';

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

export function launchCommand(executable, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd: options.cwd || process.cwd(),
      env: process.env,
      stdio: 'inherit'
    });
    child.once('error', reject);
    child.once('close', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`Nightly pipeline stopped with ${signal ? `signal ${signal}` : `exit code ${code}`}`));
    });
  });
}

export async function runNativeNightly({
  root = process.cwd(),
  readApproval = readJson,
  preflight = githubPreflight,
  launch = launchCommand
} = {}) {
  const approvalFile = path.join(root, '.ai-blog/production-approval.json');
  const approval = await readApproval(approvalFile);
  assert(approval?.approved === true, 'Production approval is missing');
  const ready = await preflight({ expectedRepository: approval.repository });
  const nightly = path.join(root, '.agents/skills/nightly-blog-pipeline/scripts/nightly.mjs');
  await launch(process.execPath, [nightly, 'run'], { cwd: root });
  return { state: 'completed', repository: ready.repository, login: ready.login };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runNativeNightly().then(
    result => process.stdout.write(`${JSON.stringify(result)}\n`),
    error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
  );
}
