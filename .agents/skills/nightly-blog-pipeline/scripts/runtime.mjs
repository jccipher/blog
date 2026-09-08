import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, rename, open, unlink, realpath } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';

export const sha256 = value => createHash('sha256').update(value).digest('hex');
export const dayOffset = (day, n) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
export function shanghai(now = new Date()) {
  const s = new Date(now.getTime() + 8 * 3600000).toISOString();
  return { day: s.slice(0, 10), time: s.slice(11, 16), timestamp: `${s.slice(0, 10)} ${s.slice(11, 19)} +0800` };
}
export function phase(now = new Date()) {
  const { time } = shanghai(now);
  if (time < '01:00' || time >= '05:30') return 'closed';
  if (time >= '05:25') return 'closing';
  return time < '05:00' ? 'prepare' : 'publish';
}
export async function json(file, fallback) {
  try { return JSON.parse(await readFile(file, 'utf8')); }
  catch (e) { if (e.code === 'ENOENT' && fallback !== undefined) return fallback; throw e; }
}
export async function atomic(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${randomUUID()}`;
  await writeFile(tmp, typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
  await rename(tmp, file);
}
export function inside(root, relative) {
  assert(!path.isAbsolute(relative), 'Only relative paths are accepted');
  const target = path.resolve(root, relative);
  assert(target.startsWith(`${path.resolve(root)}${path.sep}`), 'Path escapes its root');
  return target;
}
export async function regularInside(root, relative) {
  const target = inside(root, relative);
  assert((await realpath(target)).startsWith(`${await realpath(root)}${path.sep}`), 'Symlink escapes its root');
  return target;
}
export async function acquireLock(file) {
  await mkdir(path.dirname(file), { recursive: true });
  const handle = await open(file, 'wx').catch(e => { throw new Error(`Another run owns ${file}; inspect it before recovery (${e.code})`); });
  await handle.writeFile(JSON.stringify({ pid: process.pid, started: new Date().toISOString() }));
  await handle.close();
  return () => unlink(file);
}
export async function context({ mode, approvalFile, stateRoot, now = new Date() }) {
  assert(['preview', 'production'].includes(mode));
  const { day } = shanghai(now);
  let deadline = Date.parse(`${day}T05:30:00+08:00`);
  let exception = false;
  if (approvalFile) {
    assert.equal(mode, 'preview', 'A daytime exception can never authorize production or uploads');
    const grant = await json(approvalFile);
    assert(grant.scope === 'one-preview-run' && grant.human_confirmation && grant.id, 'A fresh human confirmation is required');
    assert(Date.parse(grant.expires_at) > now.getTime(), 'Human confirmation has expired');
    assert(Date.parse(grant.expires_at) - now.getTime() <= 6 * 3600000, 'Daytime exception may not exceed six hours');
    // Exclusive receipt prevents reusing the same confirmation, even from a copied file.
    const receipt = path.join('.ai-blog', 'approvals', `${sha256(grant.id)}.used.json`);
    await mkdir(path.dirname(receipt), { recursive: true });
    await writeFile(receipt, JSON.stringify({ ...grant, consumed_at: now.toISOString() }), { flag: 'wx' });
    exception = true;
    deadline = Date.parse(grant.expires_at);
  } else {
    assert(phase(now) !== 'closed' && phase(now) !== 'closing', 'Outside 01:00–05:25 Asia/Shanghai; request a NEW human-approved preview exception');
  }
  const ctx = { mode, day, deadline, exception, stateRoot };
  ctx.check = (upload = false) => {
    assert(Date.now() < ctx.deadline, 'Run deadline reached');
    if (upload) assert(mode === 'production' && !exception && phase() === 'publish', 'Uploads require production authorization and 05:00–05:25');
  };
  return ctx;
}
export function command(ctx, cmd, args = [], { cwd = process.cwd(), env = {}, timeoutMs = 900000 } = {}) {
  ctx.check();
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, env: { ...process.env, ...env }, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', expired = false, killTimer;
    const kill = signal => { try { process.kill(process.platform === 'win32' ? child.pid : -child.pid, signal); } catch {} };
    const timer = setTimeout(() => { expired = true; kill('SIGTERM'); killTimer = setTimeout(() => kill('SIGKILL'), 1000); }, Math.max(1, Math.min(timeoutMs, ctx.deadline - Date.now() - 1500)));
    const stop = () => { expired = true; kill('SIGTERM'); killTimer ??= setTimeout(() => kill('SIGKILL'), 1000); };
    process.once('SIGTERM', stop); process.once('SIGINT', stop);
    child.stdout.on('data', b => { stdout += b; if (stdout.length > 20000000) kill('SIGTERM'); });
    child.stderr.on('data', b => { stderr = (stderr + b).slice(-20000); });
    child.once('error', reject);
    child.once('close', code => {
      clearTimeout(timer); clearTimeout(killTimer); process.off('SIGTERM', stop); process.off('SIGINT', stop);
      if (expired || code !== 0) reject(new Error(`${cmd}: ${expired ? 'deadline exceeded' : `exit ${code}`}\n${stderr.slice(-5000)}`));
      else resolve(stdout);
    });
  });
}
export async function until(ctx, target) {
  while (Date.now() < target) { ctx.check(); await new Promise(r => setTimeout(r, Math.min(1000, target - Date.now()))); }
}
