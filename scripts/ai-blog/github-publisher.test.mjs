import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { githubPreflight, uploadReleaseAssets } from './github-publisher.mjs';

test('GitHub preflight rejects a repository connection without write permission', async () => {
  const calls = [];
  const run = async (executable, args) => {
    calls.push([executable, args]);
    if (args[0] === 'auth') return '';
    if (args.includes('user')) return 'jccipher\n';
    if (executable === 'git') return 'https://github.com/jccipher/blog.git\n';
    return JSON.stringify({ nameWithOwner: 'jccipher/blog', viewerPermission: 'READ', url: 'https://github.com/jccipher/blog' });
  };

  await assert.rejects(githubPreflight({ run, expectedRepository: 'jccipher/blog' }), /write permission/i);
  assert.deepEqual(calls, [
    ['gh', ['auth', 'status', '--active', '--hostname', 'github.com']],
    ['gh', ['api', '--hostname', 'github.com', 'user', '--jq', '.login']],
    ['git', ['remote', 'get-url', '--push', '--all', 'origin']],
    ['gh', ['repo', 'view', '--json', 'nameWithOwner,viewerPermission,url']]
  ]);
});

test('GitHub preflight rejects a same-named repository hosted outside github.com', async () => {
  const run = async (executable, args) => {
    if (args[0] === 'auth') return '';
    if (args.includes('user')) return 'jccipher\n';
    if (executable === 'git') return 'https://github.example.com/jccipher/blog.git\n';
    return JSON.stringify({
      nameWithOwner: 'jccipher/blog',
      viewerPermission: 'ADMIN',
      url: 'https://github.example.com/jccipher/blog'
    });
  };

  await assert.rejects(
    githubPreflight({ run, expectedRepository: 'jccipher/blog' }),
    /github\.com/i
  );
});

test('GitHub preflight rejects file URLs that disguise github.com as a path host', async () => {
  const run = async (executable, args) => {
    if (args[0] === 'auth') return '';
    if (args.includes('user')) return 'jccipher\n';
    if (executable === 'git') return 'file://github.com/jccipher/blog.git\n';
    return JSON.stringify({
      nameWithOwner: 'jccipher/blog',
      viewerPermission: 'ADMIN',
      url: 'https://github.com/jccipher/blog'
    });
  };

  await assert.rejects(
    githubPreflight({ run, expectedRepository: 'jccipher/blog' }),
    /https|ssh/i
  );
});

test('GitHub preflight rejects an origin with multiple push destinations', async () => {
  const run = async (executable, args) => {
    if (args[0] === 'auth') return '';
    if (args.includes('user')) return 'jccipher\n';
    if (executable === 'git') {
      return args.includes('--all')
        ? 'https://github.com/jccipher/blog.git\nhttps://github.com/jccipher/archive.git\n'
        : 'https://github.com/jccipher/blog.git\n';
    }
    return JSON.stringify({
      nameWithOwner: 'jccipher/blog',
      viewerPermission: 'ADMIN',
      url: 'https://github.com/jccipher/blog'
    });
  };

  await assert.rejects(
    githubPreflight({ run, expectedRepository: 'jccipher/blog' }),
    /exactly one push remote/i
  );
});

test('Release uploads fetch once, skip exact assets, upload missing assets, and persist verified receipts', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'github-audio-delivery-'));
  const receiptFile = path.join(directory, 'receipt.json');
  const firstAsset = '2026-09-11_ai-blog-anthropic-first.en.aaaaaaaaaaaaaaaa.mp3';
  const secondAsset = '2026-09-11_ai-blog-openai-second.zh.bbbbbbbbbbbbbbbb.mp3';
  const firstFile = path.join(directory, firstAsset);
  const secondFile = path.join(directory, secondAsset);
  await writeFile(firstFile, 'first');
  await writeFile(secondFile, 'second');
  const shaA = 'a7937b64b8caa58f03721bb6bacf5c78cb235febe0e70b1b84cd99541461a08e';
  const shaB = '16367aacb67a4a017c8da8ab95682ccb390863780f7114dda0a0e0c55644c7c4';
  const calls = [];
  const run = async (executable, args) => {
    calls.push([executable, args]);
    if (args.length === 2) return JSON.stringify({
      id: 42,
      assets: [{ id: 7, name: firstAsset, size: 5, digest: `sha256:${shaA}` }]
    });
    return JSON.stringify({ id: 8, name: secondAsset, size: 6, digest: `sha256:${shaB}` });
  };

  try {
    const result = await uploadReleaseAssets({
      run,
      repository: 'jccipher/blog',
      releaseTag: 'blog-audio',
      receiptFile,
      uploads: [
        { asset: firstAsset, bytes: 5, sha256: shaA, file: firstFile },
        { asset: secondAsset, bytes: 6, sha256: shaB, file: secondFile }
      ]
    });

    assert.deepEqual(result, { release_id: 42, uploaded: 1, skipped: 1 });
    assert.equal(calls.length, 2, 'release metadata must be fetched once for the whole batch');
    assert.deepEqual(calls[0], ['gh', ['api', 'repos/jccipher/blog/releases/tags/blog-audio']]);
    assert.deepEqual(calls[1], ['gh', [
      'api', '--method', 'POST', '-H', 'Content-Type: audio/mpeg', '--input', secondFile,
      `https://uploads.github.com/repos/jccipher/blog/releases/42/assets?name=${secondAsset}`
    ]]);
    assert.deepEqual(JSON.parse(await readFile(receiptFile, 'utf8')), {
      schema_version: 1,
      repository: 'jccipher/blog',
      release_tag: 'blog-audio',
      release_id: 42,
      assets: {
        [firstAsset]: { state: 'verified', source: 'remote-existing', id: 7, bytes: 5, sha256: shaA },
        [secondAsset]: { state: 'verified', source: 'uploaded', id: 8, bytes: 6, sha256: shaB }
      }
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('Release upload aborts before mutation when an asset name has a different digest', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'github-audio-collision-'));
  const asset = '2026-09-11_ai-blog-openai-collision.en.cccccccccccccccc.mp3';
  const audioFile = path.join(directory, asset);
  await writeFile(audioFile, 'audio');
  const sha = '6ed8919ce20490a5e3ad8630a4fab69475297abd07db73918dd5f36fcfaeb11b';
  let mutations = 0;
  const run = async (_executable, args) => {
    if (args.includes('POST')) mutations++;
    return JSON.stringify({
      id: 42,
      assets: [{ id: 9, name: asset, size: 5, digest: `sha256:${'d'.repeat(64)}` }]
    });
  };

  try {
    await assert.rejects(uploadReleaseAssets({
      run,
      repository: 'jccipher/blog',
      releaseTag: 'blog-audio',
      receiptFile: path.join(directory, 'receipt.json'),
      uploads: [{ asset, bytes: 5, sha256: sha, file: audioFile }]
    }), /digest mismatch/i);
    assert.equal(mutations, 0);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('Release upload validates the entire batch before uploading the first asset', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'github-audio-batch-'));
  const firstAsset = '2026-09-11_ai-blog-anthropic-first.en.aaaaaaaaaaaaaaaa.mp3';
  const secondAsset = '2026-09-11_ai-blog-openai-second.zh.bbbbbbbbbbbbbbbb.mp3';
  const firstFile = path.join(directory, firstAsset);
  const secondFile = path.join(directory, secondAsset);
  await writeFile(firstFile, 'first');
  await writeFile(secondFile, 'second');
  const shaA = 'a7937b64b8caa58f03721bb6bacf5c78cb235febe0e70b1b84cd99541461a08e';
  const shaB = '16367aacb67a4a017c8da8ab95682ccb390863780f7114dda0a0e0c55644c7c4';
  let mutations = 0;
  const run = async (_executable, args) => {
    if (args.includes('POST')) {
      mutations++;
      return JSON.stringify({ id: 8, name: firstAsset, size: 5, digest: `sha256:${shaA}` });
    }
    return JSON.stringify({
      id: 42,
      assets: [{ id: 9, name: secondAsset, size: 6, digest: `sha256:${'d'.repeat(64)}` }]
    });
  };

  try {
    await assert.rejects(uploadReleaseAssets({
      run,
      repository: 'jccipher/blog',
      releaseTag: 'blog-audio',
      receiptFile: path.join(directory, 'receipt.json'),
      uploads: [
        { asset: firstAsset, bytes: 5, sha256: shaA, file: firstFile },
        { asset: secondAsset, bytes: 6, sha256: shaB, file: secondFile }
      ]
    }), /digest mismatch/i);
    assert.equal(mutations, 0);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('Release upload rejects a malformed receipt before remote mutation', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'github-audio-receipt-'));
  const receiptFile = path.join(directory, 'receipt.json');
  const asset = '2026-09-11_ai-blog-openai-audio.en.dddddddddddddddd.mp3';
  const audioFile = path.join(directory, asset);
  await writeFile(audioFile, 'audio');
  await writeFile(receiptFile, JSON.stringify({
    schema_version: 1,
    repository: 'jccipher/blog',
    release_tag: 'blog-audio',
    release_id: 42,
    assets: 'corrupt'
  }));
  const sha = '6ed8919ce20490a5e3ad8630a4fab69475297abd07db73918dd5f36fcfaeb11b';
  let mutations = 0;
  const run = async (_executable, args) => {
    if (args.includes('POST')) mutations++;
    if (args.length === 2) return JSON.stringify({ id: 42, assets: [] });
    return JSON.stringify({ id: 8, name: asset, size: 5, digest: `sha256:${sha}` });
  };

  try {
    await assert.rejects(uploadReleaseAssets({
      run,
      repository: 'jccipher/blog',
      releaseTag: 'blog-audio',
      receiptFile,
      uploads: [{ asset, bytes: 5, sha256: sha, file: audioFile }]
    }), /receipt assets/i);
    assert.equal(mutations, 0);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('Release upload rejects noncanonical asset names before remote mutation', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'github-audio-name-'));
  const audioFile = path.join(directory, 'audio.mp3');
  await writeFile(audioFile, 'audio');
  const sha = '6ed8919ce20490a5e3ad8630a4fab69475297abd07db73918dd5f36fcfaeb11b';
  let mutations = 0;
  const run = async (_executable, args) => {
    if (args.includes('POST')) {
      mutations++;
      return JSON.stringify({ id: 8, name: 'bad-name.mp3', size: 5, digest: `sha256:${sha}` });
    }
    return JSON.stringify({ id: 42, assets: [] });
  };

  try {
    await assert.rejects(uploadReleaseAssets({
      run,
      repository: 'jccipher/blog',
      releaseTag: 'blog-audio',
      receiptFile: path.join(directory, 'receipt.json'),
      uploads: [{ asset: 'bad name.mp3', bytes: 5, sha256: sha, file: audioFile }]
    }), /asset name/i);
    assert.equal(mutations, 0);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
