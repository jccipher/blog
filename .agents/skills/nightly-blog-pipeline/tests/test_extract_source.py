import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('extract_source', Path(__file__).parent.parent / 'scripts/extract_source.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class ExtractionTests(unittest.TestCase):
    def test_long_article_not_short_deck(self):
        html = '<h1>Title</h1><time datetime="2026-09-01"></time><div class="w-richtext">Deck</div><div class="w-richtext"><p>Complete body paragraph one.</p><p>Final paragraph two.</p></div><footer>Unwanted footer</footer>'
        r = module.extract(html, 'https://claude.com/blog/test')
        self.assertEqual(r['body'], 'Complete body paragraph one.\nFinal paragraph two.')
        self.assertEqual(r['published_at'], '2026-09-01')

    def test_ld_json_canonical_and_official_zh(self):
        html = '<script type="application/ld+json">{"@graph":[{"headline":"Official title","datePublished":"2026-08-25T12:00:00Z"}]}</script><link rel="canonical" href="https://claude.com/blog/test/"><link rel="alternate" hreflang="zh-CN" href="/zh/blog/test"><article>Whole article</article>'
        r = module.extract(html, 'https://claude.com/blog/test?utm_source=anything')
        self.assertEqual(r['title'], 'Official title')
        self.assertEqual(r['url'], 'https://claude.com/blog/test')
        self.assertEqual(r['official_zh_url'], 'https://claude.com/zh/blog/test')

    def test_index_filters_external_links_and_keeps_pagination_before_removing_navigation(self):
        html = '<a href="/blog/new/">New</a><a href="https://unofficial.example/blog/copied">Bad</a><nav><a rel="next" href="/blog?page=2">Next</a></nav>'
        r = module.extract(html, 'https://developers.openai.com/blog')
        self.assertEqual(r['links'], ['https://developers.openai.com/blog/new'])
        self.assertEqual(r['next'], 'https://developers.openai.com/blog?page=2')

    def test_unknown_dates_and_chinese_mirrors_not_invented(self):
        r = module.extract('<h1>No date</h1><link rel="alternate" hreflang="zh" href="https://unofficial.example/blog/test">', 'https://claude.com/blog/test')
        self.assertEqual(r['published_at'], '')
        self.assertIsNone(r['official_zh_url'])

if __name__ == '__main__':
    unittest.main()
