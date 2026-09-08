import assert from 'node:assert/strict';
import { cp, mkdir, readFile, rename, stat } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { atomic, json } from './runtime.mjs';

async function exists(file) { return !!await stat(file).catch(e => { if (e.code === 'ENOENT') return null; throw e; }); }
// Caller owns the queue mutex. Backups stay local, recoverable and outside the scanned queue.
export async function recoverQueue(queueRoot) {
  const journalFile = `${queueRoot}.transaction.json`;
  const journal = await json(journalFile, null);
  if (!journal || journal.state !== 'promoting') return;
  assert(/^[a-f0-9-]+$/.test(journal.id));
  for (const item of journal.days) {
    assert(/^\d{4}-\d{2}-\d{2}$/.test(item.day));
    const target = path.join(queueRoot, item.day);
    const work = `${queueRoot}.transactions/${journal.id}`;
    const prepared = path.join(work, 'prepared', item.day), backup = path.join(work, 'backup', item.day);
    if (await exists(backup)) {
      if (await exists(target)) { await mkdir(path.join(work, 'interrupted'), {recursive:true}); await rename(target, path.join(work, 'interrupted', item.day)); }
      await rename(backup, target);
    } else if (!item.had_previous && !await exists(prepared) && await exists(target)) {
      await mkdir(path.join(work, 'interrupted'), {recursive:true}); await rename(target, path.join(work, 'interrupted', item.day));
    }
  }
  await atomic(journalFile, { ...journal, state: 'rolled-back' });
}
export async function promoteBatch(queueRoot, items, { afterRename = () => {} } = {}) {
  await recoverQueue(queueRoot);
  const id = randomUUID(), work = `${queueRoot}.transactions/${id}`;
  const days = [...new Set(items.map(i => i.day))].sort();
  const journal = { id, state: 'preparing', days: [] };
  for (const day of days) {
    assert(/^\d{4}-\d{2}-\d{2}$/.test(day));
    const target = path.join(queueRoot, day), prepared = path.join(work, 'prepared', day);
    const hadPrevious = await exists(target);
    if (hadPrevious) await cp(target, prepared, { recursive: true });
    else await mkdir(prepared, { recursive: true });
    for (const item of items.filter(i => i.day === day)) for (const source of item.paths) {
      const destination = path.join(prepared, path.basename(source));
      const content = await readFile(source), old = await readFile(destination).catch(e => { if (e.code === 'ENOENT') return null; throw e; });
      const expected = item.expected?.[path.basename(source)];
      assert(!old || old.equals(content) || (typeof expected === 'string' && old.toString('utf8') === expected), `Queue collision: ${destination}`);
      if (!old || !old.equals(content)) await cp(source, destination);
    }
    journal.days.push({ day, had_previous: hadPrevious });
  }
  await mkdir(queueRoot, { recursive: true }); await mkdir(path.join(work, 'backup'), { recursive: true });
  journal.state = 'promoting'; await atomic(`${queueRoot}.transaction.json`, journal);
  try {
    for (const item of journal.days) {
      const target = path.join(queueRoot, item.day);
      if (item.had_previous) await rename(target, path.join(work, 'backup', item.day));
      await rename(path.join(work, 'prepared', item.day), target);
      await afterRename(item.day);
    }
    await atomic(`${queueRoot}.transaction.json`, { ...journal, state: 'committed' });
  } catch (e) { await recoverQueue(queueRoot); throw e; }
}
