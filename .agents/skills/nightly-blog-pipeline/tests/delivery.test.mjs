import test from 'node:test';
import assert from 'node:assert/strict';
import { command } from '../scripts/runtime.mjs';
test('Real local Git delivery survives interruption without consuming or duplicating posts', async () => {
  const output = await command({ check() {}, deadline: Date.now() + 65000 }, process.execPath, ['.agents/skills/nightly-blog-pipeline/tests/delivery-fixture.mjs']);
  assert(JSON.parse(output.trim()).passed);
});
test('Full seven-per-source prefetch resumes and preserves existing queue entries', async () => {
  const output = await command({ check() {}, deadline: Date.now() + 65000 }, process.execPath, ['.agents/skills/nightly-blog-pipeline/tests/prefetch-fixture.mjs']);
  assert.equal(JSON.parse(output.trim()).new_markdown_files, 28);
});
