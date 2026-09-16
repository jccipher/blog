import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { runNativeNightly } from './native-nightly.mjs';

test('Native nightly runner never starts publication when GitHub preflight fails', async () => {
  let launches = 0;
  await assert.rejects(runNativeNightly({
    root: '/work/blog',
    readApproval: async () => ({ approved: true, repository: 'jccipher/blog' }),
    preflight: async () => { throw new Error('credential expired'); },
    launch: async () => { launches++; }
  }), /credential expired/);
  assert.equal(launches, 0);
});

test('Native nightly runner launches the existing production pipeline only after a writable preflight', async () => {
  const events = [];
  const result = await runNativeNightly({
    root: '/work/blog',
    readApproval: async file => {
      events.push(['approval', file]);
      return { approved: true, repository: 'jccipher/blog' };
    },
    preflight: async options => {
      events.push(['preflight', options]);
      return { login: 'jccipher', repository: 'jccipher/blog', permission: 'ADMIN' };
    },
    launch: async (executable, args, options) => {
      events.push(['launch', executable, args, options]);
    }
  });

  assert.deepEqual(result, { state: 'completed', repository: 'jccipher/blog', login: 'jccipher' });
  assert.deepEqual(events, [
    ['approval', path.join('/work/blog', '.ai-blog/production-approval.json')],
    ['preflight', { expectedRepository: 'jccipher/blog' }],
    ['launch', process.execPath, [path.join('/work/blog', '.agents/skills/nightly-blog-pipeline/scripts/nightly.mjs'), 'run'], { cwd: '/work/blog' }]
  ]);
});
