import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import matter from 'gray-matter';
import yaml from 'js-yaml';
import { Liquid } from 'liquidjs';
import { marked } from 'marked';

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

for (const fileName of postFiles) {
  const source = matter(await readFile(path.join(root, '_posts', fileName), 'utf8'));
  const slug = fileName.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '');
  const html = marked.parse(source.content);
  const firstParagraph = html.match(/<p>(.*?)<\/p>/s)?.[1] || '';
  posts.push({
    ...source.data,
    slug: source.data.slug || slug,
    url: source.data.permalink || `/posts/${slug}/`,
    content: html,
    excerpt: stripHtml(firstParagraph),
  });
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
process.stdout.write(`Preview built at ${outputRoot}\n`);
