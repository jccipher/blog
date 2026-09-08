import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import matter from 'gray-matter';
import yaml from 'js-yaml';
import { Liquid } from 'liquidjs';
import { marked } from 'marked';
import { summaryText } from '../.agents/skills/bilingual-blog-narrator/scripts/audio.mjs';
import { json, sha256 } from '../.agents/skills/nightly-blog-pipeline/scripts/runtime.mjs';

const root = process.cwd();
const outputRoot = path.join(root, '_site', 'blog');
const config = yaml.load(await readFile(path.join(root, '_config.yml'), 'utf8'));
const engine = new Liquid({ strictVariables: false, strictFilters: false });

engine.registerFilter('relative_url', (value) => `${config.baseurl || ''}${value}`.replace(/\/+/g, '/'));
engine.registerFilter('absolute_url', (value) => `${config.url || ''}${config.baseurl || ''}${value}`.replace(/([^:]\/)\/+/g, '$1'));
engine.registerFilter('date_to_xmlschema', (value) => new Date(value).toISOString());
engine.registerFilter('normalize_whitespace', (value) => String(value ?? '').replace(/\s+/g, ' ').trim());

const stripHtml = (value) => String(value ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const postFiles = (await readdir(path.join(root, '_posts'))).filter((name) => name.endsWith('.md')).sort().reverse();
const posts = [];
const audioManifest = await json(path.join(root, process.env.BLOG_AUDIO_MANIFEST || 'assets/audio-manifest.json'), { entries: [] });
const pronunciation = await json('.agents/skills/bilingual-blog-narrator/pronunciation.json');
const previewFiles = [];
if (process.env.BLOG_PREVIEW_QUEUE) {
  const previewRoot = path.resolve(root, process.env.BLOG_PREVIEW_QUEUE);
  if (!previewRoot.startsWith(path.join(root, '.ai-blog', 'preview-queue') + path.sep)) throw new Error('Preview overlay must be inside .ai-blog/preview-queue');
  for (const name of await readdir(previewRoot)) if (name.endsWith('.md')) previewFiles.push(path.join(previewRoot, name));
}

for (const sourcePath of [...postFiles.map(name => path.join(root, '_posts', name)), ...previewFiles]) {
  const fileName = path.basename(sourcePath);
  const source = matter(await readFile(sourcePath, 'utf8'));
  const slug = fileName.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '');
  const html = marked.parse(source.content);
  const firstParagraph = html.match(/<p>(.*?)<\/p>/s)?.[1] || '';
  let summaryAudio;
  const audio = audioManifest.entries.find(e => e.slug === source.data.slug && e.lang === source.data.lang);
  if (audio && /^\d{4}-\d{2}-\d{2}_ai-blog-(?:anthropic|openai)-[a-z0-9-]+\.(?:en|zh)\.[a-f0-9]{16}\.mp3$/.test(audio.asset)) {
    try {
      if (sha256(summaryText(source.content, source.data.lang, pronunciation[source.data.lang])) === audio.summary_sha256) summaryAudio = `/assets/audio/${audio.asset}`;
    } catch { /* A missing/legacy boundary must never enable full-article narration. */ }
  }
  const record = {
    ...source.data,
    slug: source.data.slug || slug,
    url: source.data.permalink || `/posts/${slug}/`,
    content: html,
    excerpt: stripHtml(firstParagraph),
    summary_audio: summaryAudio,
  };
  const prior = posts.findIndex(p => p.url === record.url);
  if (prior >= 0) posts[prior] = record; else posts.push(record);
}

const site = { ...config, posts };

async function renderLayout(layoutName, page, content) {
  const file = path.join(root, '_layouts', `${layoutName}.html`);
  const source = matter(await readFile(file, 'utf8'));
  const rendered = await engine.parseAndRender(source.content, { site, page, content });
  return source.data.layout ? renderLayout(source.data.layout, page, rendered) : rendered;
}

async function renderPage(sourcePath, pageUrl) {
  const source = matter(await readFile(sourcePath, 'utf8'));
  const page = { ...source.data, url: pageUrl };
  const liquidContent = await engine.parseAndRender(source.content, { site, page });
  const content = sourcePath.endsWith('.md') ? marked.parse(liquidContent) : liquidContent;
  return renderLayout(page.layout, page, content);
}

async function writePage(relativeDestination, html) {
  const destination = path.join(outputRoot, relativeDestination);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, html);
}

function destinationForUrl(url) {
  const cleanUrl = url.replace(/^\/+/, '');
  return cleanUrl.endsWith('.html') ? cleanUrl : path.join(cleanUrl, 'index.html');
}

await rm(path.join(root, '_site'), { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });

await writePage('index.html', await renderPage(path.join(root, 'index.md'), '/'));
await writePage('archives/index.html', await renderPage(path.join(root, 'archives.md'), '/archives/'));
await writePage('about/index.html', await renderPage(path.join(root, 'about.md'), '/about/'));
await writePage('favorites/index.html', await renderPage(path.join(root, 'favorites.md'), '/favorites/'));
await writePage('404.html', await renderPage(path.join(root, '404.html'), '/404.html'));
await writePage('zh/index.html', await renderPage(path.join(root, 'zh', 'index.md'), '/zh/'));
await writePage('zh/archives/index.html', await renderPage(path.join(root, 'zh', 'archives.md'), '/zh/archives/'));
await writePage('zh/about/index.html', await renderPage(path.join(root, 'zh', 'about.md'), '/zh/about/'));
await writePage('zh/favorites/index.html', await renderPage(path.join(root, 'zh', 'favorites.md'), '/zh/favorites/'));
await writePage('zh/404.html', await renderPage(path.join(root, 'zh', '404.html'), '/zh/404.html'));

for (const post of posts) {
  const html = await renderLayout(post.layout || 'post', post, post.content);
  await writePage(destinationForUrl(post.url), html);
}

await cp(path.join(root, 'assets'), path.join(outputRoot, 'assets'), { recursive: true });
if (process.env.BLOG_AUDIO_MANIFEST) {
  await mkdir(path.join(outputRoot, 'assets/audio'), { recursive: true });
  for (const e of audioManifest.entries) {
    if (!posts.some(p => p.summary_audio === `/assets/audio/${e.asset}`)) continue;
    const file = path.resolve(root, e.file || '');
    if (!file.startsWith(path.join(root, '.ai-blog') + path.sep)) throw new Error('Preview audio must remain local');
    const bytes = await readFile(file);
    if (sha256(bytes) !== e.sha256) throw new Error('Preview audio checksum mismatch');
    await writeFile(path.join(outputRoot, 'assets/audio', e.asset), bytes);
  }
}
process.stdout.write(`Preview built at ${outputRoot}\n`);
