import assert from 'node:assert/strict';

export const audioKey = entry => `${entry.slug}:${entry.lang}`;

export function planPublishedAudioBackfill({ published, existing }) {
  const publishedTracks = published.filter(entry => entry.published);
  const publishedKeys = new Set(publishedTracks.map(audioKey));
  assert.equal(publishedKeys.size, publishedTracks.length, 'Published audio inventory contains duplicate tracks');

  const existingByKey = new Map();
  for (const metadata of existing) {
    const key = audioKey(metadata);
    if (!publishedKeys.has(key)) continue;
    assert(!existingByKey.has(key), `Multiple local metadata records exist for ${key}`);
    existingByKey.set(key, metadata);
  }

  return {
    missing: publishedTracks.filter(entry => !existingByKey.has(audioKey(entry))),
    reconciledIndex: {
      schema_version: 1,
      entries: Object.fromEntries([...existingByKey].sort(([left], [right]) => left.localeCompare(right)))
    }
  };
}

export async function runPublishedAudioBackfill({ published, existing, narrate }) {
  const initial = planPublishedAudioBackfill({ published, existing });
  const generated = [];
  for (const entry of initial.missing) generated.push(await narrate(entry));
  return planPublishedAudioBackfill({ published, existing: [...existing, ...generated] });
}

export function buildPublishedAudioManifest({ published, index, current }) {
  const publishedTracks = published.filter(entry => entry.published);
  const merged = new Map((current?.entries || []).map(entry => [audioKey(entry), entry]));
  for (const entry of publishedTracks) {
    const metadata = index.entries[audioKey(entry)];
    if (!metadata) continue;
    assert.equal(metadata.scheduled_for, entry.day, `Audio date mismatch for ${audioKey(entry)}`);
    assert.match(metadata.fingerprint || '', /^[a-f0-9]{64}$/, `Audio fingerprint is invalid for ${audioKey(entry)}`);
    assert.match(metadata.sha256 || '', /^[a-f0-9]{64}$/, `Audio checksum is invalid for ${audioKey(entry)}`);
    assert.match(metadata.summary_sha256 || '', /^[a-f0-9]{64}$/, `Summary checksum is invalid for ${audioKey(entry)}`);
    assert(Number.isSafeInteger(metadata.bytes) && metadata.bytes > 0, `Audio size is invalid for ${audioKey(entry)}`);
    assert(Number.isFinite(metadata.duration_seconds) && metadata.duration_seconds > 0, `Audio duration is invalid for ${audioKey(entry)}`);
    merged.set(audioKey(entry), {
      slug: entry.slug,
      lang: entry.lang,
      published_on: entry.day,
      asset: `${entry.day}_${entry.slug}.${entry.lang}.${metadata.fingerprint.slice(0, 16)}.mp3`,
      bytes: metadata.bytes,
      sha256: metadata.sha256,
      summary_sha256: metadata.summary_sha256,
      duration_seconds: metadata.duration_seconds
    });
  }
  return { schema_version: 1, entries: [...merged.values()].sort((left, right) => left.asset.localeCompare(right.asset)) };
}

export function buildPublishedAudioUploadPlan({ manifest, index }) {
  return {
    entries: manifest.entries.map(record => {
      const metadata = index.entries[audioKey(record)];
      assert(metadata, `Missing local metadata for ${audioKey(record)}`);
      assert.equal(record.sha256, metadata.sha256, `Audio checksum changed for ${audioKey(record)}`);
      assert.equal(record.bytes, metadata.bytes, `Audio size changed for ${audioKey(record)}`);
      assert.equal(record.asset, `${record.published_on}_${record.slug}.${record.lang}.${metadata.fingerprint.slice(0, 16)}.mp3`, `Audio asset name changed for ${audioKey(record)}`);
      assert(metadata.file, `Missing local file for ${audioKey(record)}`);
      return { asset: record.asset, bytes: record.bytes, sha256: record.sha256, local_file: metadata.file };
    })
  };
}

export async function materializePublishedAudioManifest({ manifest, write }) {
  await write('assets/audio-manifest.json', manifest);
}

export function validateManualBackfillApproval({ approval, now = Date.now(), repository }) {
  assert(approval?.id && approval.human_confirmation, 'A fresh human confirmation is required');
  assert.equal(approval.scope, 'one-published-audio-backfill', 'Approval scope does not permit audio backfill');
  assert.equal(approval.repository, repository, 'Approval repository does not match');
  assert.equal(approval.allow_daytime, true, 'A daytime backfill requires explicit daytime approval');
  const expiresAt = Date.parse(approval.expires_at);
  assert(Number.isFinite(expiresAt) && expiresAt > now, 'Manual backfill approval has expired');
  assert(expiresAt - now <= 2 * 60 * 60 * 1000, 'Manual backfill approval may not exceed two hours');
  return expiresAt;
}
