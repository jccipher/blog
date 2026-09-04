import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const output = path.join(process.cwd(), '_site', 'blog');

async function page(relativePath) {
  const html = await readFile(path.join(output, relativePath), 'utf8');
  assert.doesNotMatch(html, /{{|{%/, `${relativePath} contains unrendered Liquid`);
  assert.match(html, /data-engagement-root/, `${relativePath} is missing visitor telemetry`);
  assert.match(html, /assets\/js\/engagement\.js/, `${relativePath} is missing the engagement client`);
  assert.match(html, /data-support-dialog/, `${relativePath} is missing the support dialog`);
  return html;
}

const home = await page('index.html');
assert.match(home, /data-latest-visitor/);
assert.match(home, /data-page-views/);
assert.match(home, /data-site-views/);
assert.match(home, /data-favorite-toggle/);

const post = await page('posts/title/index.html');
assert.match(post, /data-inline-page-views/);
assert.match(post, /data-support-open/);
assert.match(post, /data-page-favorites/);

const favorites = await page('favorites/index.html');
assert.match(favorites, /data-favorites-page/);
assert.match(favorites, /<article class="saved-post"[^>]*data-favorite-item/);
assert.doesNotMatch(favorites, /<pre><code>[\s\S]*data-favorite-item/);

const chineseFavorites = await page('zh/favorites/index.html');
assert.match(chineseFavorites, /data-favorites-page/);
assert.match(chineseFavorites, /<article class="saved-post"[^>]*data-favorite-item/);
assert.doesNotMatch(chineseFavorites, /<pre><code>[\s\S]*data-favorite-item/);
assert.match(chineseFavorites, /还没有收藏文章/);

process.stdout.write('Rendered engagement features verified.\n');
