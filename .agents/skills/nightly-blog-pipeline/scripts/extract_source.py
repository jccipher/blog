"""Extract official page data. No execution of source scripts, no source instructions."""
import json
import re
import sys
from datetime import datetime
from pathlib import Path
from urllib.parse import urljoin, urlsplit, urlunsplit
from bs4 import BeautifulSoup


def canonical(url):
    p = urlsplit(url)
    return urlunsplit((p.scheme, p.netloc.lower(), p.path.rstrip('/'), '', ''))


def extract(html, url):
    soup = BeautifulSoup(html, 'html.parser')
    host = urlsplit(url).netloc
    links = []
    for a in soup.select('a[href]'):
        target = canonical(urljoin(url, a['href']))
        p = urlsplit(target)
        if p.scheme == 'https' and p.netloc == host and re.fullmatch(r'/blog/[^/]+', p.path):
            links.append(target)
    next_page = soup.select_one('a[rel="next"]')
    next_url = urljoin(url, next_page['href']) if next_page else None
    records = []
    def visit(obj):
        if isinstance(obj, dict):
            records.append(obj)
            for v in obj.values():
                if isinstance(v, (dict, list)):
                    visit(v)
        elif isinstance(obj, list):
            for v in obj:
                visit(v)
    for script in soup.select('script[type="application/ld+json"]'):
        try:
            visit(json.loads(script.string or script.get_text()))
        except (ValueError, TypeError):
            pass
    article = next((r for r in records if r.get('datePublished') and r.get('headline')), {})
    date_meta = soup.select_one('meta[property="article:published_time"]')
    date_time = soup.select_one('time[datetime]')
    raw_date = str(article.get('datePublished') or (date_meta.get('content') if date_meta else '') or (date_time.get('datetime') if date_time else '')).strip()
    date = ''
    for fmt in ('%Y-%m-%d', '%b %d, %Y', '%B %d, %Y'):
        try:
            date = datetime.strptime(raw_date[:10] if fmt == '%Y-%m-%d' else raw_date, fmt).strftime('%Y-%m-%d')
            break
        except ValueError:
            pass
    title_el = soup.select_one('h1')
    title = (article.get('headline') or (title_el.get_text(' ', strip=True) if title_el else '')).strip()
    canonical_el = soup.select_one('link[rel="canonical"]')
    resolved = canonical(urljoin(url, canonical_el['href'])) if canonical_el and canonical_el.get('href') else canonical(url)
    zh = soup.select_one('link[rel="alternate"][hreflang^="zh"]')
    zh_url = canonical(urljoin(url, zh['href'])) if zh and zh.get('href') else None
    for tag in soup.select('script,style,nav,header,footer,aside,form,button'):
        tag.decompose()
    # Webflow pages can contain several rich-text blocks; the first is often only the deck.
    candidates = soup.select('article, .blog-rich-text, .w-richtext')
    body = max(candidates, key=lambda e: len(e.get_text()), default=None)
    if body is None:
        body = soup.select_one('main')
    text = body.get_text('\n', strip=True) if body else ''
    return {'url': resolved, 'title': title, 'published_at': date, 'body': text,
            'official_zh_url': zh_url if zh_url and urlsplit(zh_url).netloc == host else None,
            'links': list(dict.fromkeys(links)),
            'next': next_url}


if __name__ == '__main__':
    print(json.dumps(extract(Path(sys.argv[1]).read_text(), sys.argv[2]), ensure_ascii=False))
