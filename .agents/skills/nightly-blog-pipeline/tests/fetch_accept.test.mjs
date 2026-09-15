import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceAccept } from '../../daily-ai-blog-digest/scripts/fetch_with_retry.mjs';

test('HTML source URLs do not advertise Markdown content negotiation', () => {
  assert.equal(sourceAccept(new URL('https://developers.openai.com/blog')), 'text/html,application/xhtml+xml');
});

test('explicit Markdown source URLs request Markdown', () => {
  assert.equal(sourceAccept(new URL('https://developers.openai.com/blog/example.md')), 'text/markdown,text/plain;q=0.8');
});
