#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';

const execFileAsync = promisify(execFile);
const repositoryPattern = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const writablePermissions = new Set(['ADMIN', 'MAINTAIN', 'WRITE']);
const audioAssetPattern = /^\d{4}-\d{2}-\d{2}_ai-blog-(?:anthropic|openai)-[a-z0-9-]+\.(?:en|zh)\.[a-f0-9]{16}\.mp3$/;

function repositoryFromRemote(remote) {
  const value = String(remote || '').trim();
  const ssh = value.match(/^git@github\.com:([^/]+\/[^/]+?)(?:\.git)?$/i);
  if (ssh) return ssh[1];
  let parsed;
  try { parsed = new URL(value); }
  catch { throw new Error('Origin push remote must be a github.com URL'); }
  const approvedProtocol = parsed.protocol === 'https:'
    || (parsed.protocol === 'ssh:' && parsed.username === 'git');
  assert(approvedProtocol, 'Origin push remote must use HTTPS or SSH');
  assert.equal(parsed.hostname.toLowerCase(), 'github.com', 'Origin push remote must use github.com');
  return parsed.pathname.replace(/^\//, '').replace(/\.git$/, '').replace(/\/$/, '');
}

export async function runCommand(executable, args, options = {}) {
  try {
    const { stdout } = await execFileAsync(executable, args, {
      cwd: options.cwd || process.cwd(),
      env: options.env || process.env,
      maxBuffer: 20 * 1024 * 1024,
      timeout: options.timeoutMs || 120000,
      encoding: 'utf8'
    });
    return stdout;
  } catch (error) {
    const detail = String(error.stderr || error.stdout || error.message).trim();
    throw new Error(`${executable} ${args.slice(0, 3).join(' ')} failed${detail ? `: ${detail}` : ''}`);
  }
}

export async function githubPreflight({ run = runCommand, expectedRepository }) {
  assert(repositoryPattern.test(expectedRepository || ''), 'Expected repository must use owner/name');
  await run('gh', ['auth', 'status', '--active', '--hostname', 'github.com']);
  const login = (await run('gh', ['api', '--hostname', 'github.com', 'user', '--jq', '.login'])).trim();
  assert(login, 'GitHub authentication did not return a user');
  const pushRemotes = String(await run('git', ['remote', 'get-url', '--push', '--all', 'origin']))
    .split(/\r?\n/).map(value => value.trim()).filter(Boolean);
  assert.equal(pushRemotes.length, 1, 'Origin must have exactly one push remote');
  const remoteRepository = repositoryFromRemote(pushRemotes[0]);
  assert.equal(remoteRepository, expectedRepository, 'Origin push remote does not match the approved repository');
  const repository = JSON.parse(await run('gh', ['repo', 'view', '--json', 'nameWithOwner,viewerPermission,url']));
  assert.equal(repository.nameWithOwner, expectedRepository, 'Current checkout does not match the approved repository');
  const repositoryUrl = new URL(repository.url);
  assert.equal(repositoryUrl.hostname.toLowerCase(), 'github.com', 'Resolved repository must use github.com');
  assert(writablePermissions.has(repository.viewerPermission), `GitHub connection lacks write permission for ${expectedRepository}`);
  return { login, repository: repository.nameWithOwner, permission: repository.viewerPermission };
}

function assertRemoteAsset(asset, upload) {
  assert.equal(asset.size, upload.bytes, `Remote asset size mismatch: ${upload.asset}`);
  assert.equal(asset.digest, `sha256:${upload.sha256}`, `Remote asset digest mismatch: ${upload.asset}`);
}

async function readJson(file, fallback = null) {
  try { return JSON.parse(await readFile(file, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return fallback; throw error; }
}

async function atomicJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`);
  await rename(temporary, file);
}

async function verifyLocalAsset(upload) {
  const metadata = await stat(upload.file);
  assert(metadata.isFile(), `Audio source is not a file: ${upload.file}`);
  assert.equal(metadata.size, upload.bytes, `Local asset size mismatch: ${upload.asset}`);
  const digest = createHash('sha256').update(await readFile(upload.file)).digest('hex');
  assert.equal(digest, upload.sha256, `Local asset digest mismatch: ${upload.asset}`);
}

function assertReceipt(receipt, { repository, releaseTag, releaseId }) {
  assert(receipt && typeof receipt === 'object' && !Array.isArray(receipt), 'Upload receipt must be an object');
  assert.equal(receipt.schema_version, 1, 'Upload receipt schema version mismatch');
  assert.equal(receipt.repository, repository, 'Upload receipt repository mismatch');
  assert.equal(receipt.release_tag, releaseTag, 'Upload receipt release tag mismatch');
  assert.equal(receipt.release_id, releaseId, 'Upload receipt release id mismatch');
  assert(receipt.assets && typeof receipt.assets === 'object' && !Array.isArray(receipt.assets), 'Upload receipt assets must be an object');
  for (const [asset, record] of Object.entries(receipt.assets)) {
    assert(asset && record && typeof record === 'object' && !Array.isArray(record), `Invalid upload receipt asset: ${asset || '(empty)'}`);
    assert.equal(record.state, 'verified', `Upload receipt asset is not verified: ${asset}`);
    assert(['remote-existing', 'uploaded'].includes(record.source), `Invalid upload receipt source: ${asset}`);
    assert(Number.isSafeInteger(record.id) && record.id > 0, `Invalid upload receipt asset id: ${asset}`);
    assert(Number.isSafeInteger(record.bytes) && record.bytes > 0, `Invalid upload receipt byte count: ${asset}`);
    assert(/^[a-f0-9]{64}$/.test(record.sha256 || ''), `Invalid upload receipt digest: ${asset}`);
  }
}

export async function uploadReleaseAssets({
  run = runCommand,
  repository,
  releaseTag,
  uploads,
  receiptFile,
  check = () => {}
}) {
  assert(repositoryPattern.test(repository || ''), 'Repository must use owner/name');
  assert(releaseTag && !/[\r\n]/.test(releaseTag), 'Release tag is required');
  assert(Array.isArray(uploads) && uploads.length > 0, 'At least one audio upload is required');
  assert(receiptFile, 'Receipt path is required');
  check();
  const release = JSON.parse(await run('gh', ['api', `repos/${repository}/releases/tags/${releaseTag}`]));
  assert(Number.isSafeInteger(release.id) && Array.isArray(release.assets), 'Unexpected GitHub release response');
  let receipt = await readJson(receiptFile, null);
  if (receipt) {
    assertReceipt(receipt, { repository, releaseTag, releaseId: release.id });
  } else {
    receipt = { schema_version: 1, repository, release_tag: releaseTag, release_id: release.id, assets: {} };
  }
  const assets = new Map(release.assets.map(asset => [asset.name, asset]));
  assert.equal(assets.size, release.assets.length, 'Remote release contains duplicate asset names');
  const uploadNames = new Set();
  for (const upload of uploads) {
    check();
    assert(audioAssetPattern.test(upload.asset || ''), `Invalid audio asset name: ${upload.asset || '(empty)'}`);
    assert(Number.isSafeInteger(upload.bytes) && upload.bytes > 0 && /^[a-f0-9]{64}$/.test(upload.sha256), 'Invalid audio upload record');
    assert(!uploadNames.has(upload.asset), `Duplicate audio upload record: ${upload.asset}`);
    uploadNames.add(upload.asset);
    await verifyLocalAsset(upload);
    const existing = assets.get(upload.asset);
    if (existing) assertRemoteAsset(existing, upload);
  }
  let uploaded = 0;
  let skipped = 0;

  for (const upload of uploads) {
    check();
    const existing = assets.get(upload.asset);
    if (existing) {
      receipt.assets[upload.asset] = { state: 'verified', source: 'remote-existing', id: existing.id, bytes: upload.bytes, sha256: upload.sha256 };
      await atomicJson(receiptFile, receipt);
      skipped++;
      continue;
    }

    const url = `https://uploads.github.com/repos/${repository}/releases/${release.id}/assets?name=${encodeURIComponent(upload.asset)}`;
    const created = JSON.parse(await run('gh', [
      'api', '--method', 'POST', '-H', 'Content-Type: audio/mpeg', '--input', upload.file, url
    ], { timeoutMs: 120000 }));
    assert.equal(created.name, upload.asset, 'GitHub returned a different asset name');
    assertRemoteAsset(created, upload);
    assets.set(created.name, created);
    receipt.assets[upload.asset] = { state: 'verified', source: 'uploaded', id: created.id, bytes: upload.bytes, sha256: upload.sha256 };
    await atomicJson(receiptFile, receipt);
    uploaded++;
  }
  return { release_id: release.id, uploaded, skipped };
}

function parseOptions(tokens) {
  const result = {};
  for (let index = 0; index < tokens.length; index += 2) {
    const key = tokens[index];
    assert(key?.startsWith('--') && tokens[index + 1] && !tokens[index + 1].startsWith('--'), `Invalid option near ${key || '(end)'}`);
    result[key.slice(2)] = tokens[index + 1];
  }
  return result;
}

async function main(tokens) {
  const [mode, ...rest] = tokens;
  const options = parseOptions(rest);
  assert(['doctor', 'upload'].includes(mode), 'Usage: github-publisher.mjs doctor|upload --repo owner/name [--tag TAG --plan FILE --receipt FILE]');
  const preflight = await githubPreflight({ expectedRepository: options.repo });
  if (mode === 'doctor') return { state: 'ready', ...preflight };
  const plan = await readJson(options.plan);
  assert(Array.isArray(plan?.entries), 'Upload plan must contain entries');
  const uploads = plan.entries.map(entry => ({
    asset: entry.asset,
    bytes: entry.bytes,
    sha256: entry.sha256,
    file: entry.local_file
  }));
  const delivery = await uploadReleaseAssets({
    repository: preflight.repository,
    releaseTag: options.tag,
    uploads,
    receiptFile: options.receipt
  });
  return { state: 'verified', ...preflight, ...delivery };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).then(
    result => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`),
    error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
  );
}
