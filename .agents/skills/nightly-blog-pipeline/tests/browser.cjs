// Optional real-browser acceptance test. Supply Playwright through NODE_PATH or local dev dependencies.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

(async () => {
  const base = process.env.BLOG_PREVIEW_URL || 'http://127.0.0.1:4174';
  assert(new URL(base).hostname === '127.0.0.1' || (process.env.BLOG_TEST_PUBLIC === 'true' && base === 'https://jccipher.github.io'), 'Browser acceptance must target the local preview or explicitly authorized project site');
  const slugs = (process.env.BLOG_TEST_SLUGS || 'ai-blog-anthropic-claude-in-chrome-generally-available,ai-blog-openai-scaling-cyber-defenders-with-daybreak').split(',');
  assert(slugs.length === 2 && slugs.every(s => /^ai-blog-(anthropic|openai)-[a-z0-9-]+$/.test(s)));
  const reportDir = '.ai-blog/browser-acceptance';
  await fs.mkdir(reportDir, { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.env.BLOG_TEST_CHROME_PATH ? { executablePath: process.env.BLOG_TEST_CHROME_PATH } : {}) });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 960 } });
    page.on('pageerror', e => errors.push(e.message));
    const results = [];
    for (const slug of slugs) {
      for (const lang of ['en','zh']) {
        const url = `${base}/blog/${lang === 'zh' ? 'zh/' : ''}posts/${slug}/`;
        await page.goto(url, { waitUntil: 'networkidle' });
        assert.equal(await page.locator('[data-summary-audio]').count(), 1);
        const source = await page.locator('audio source').getAttribute('src');
        const response = await page.request.get(`${base}${source}`, { headers: { Range: 'bytes=0-1023' } });
        assert.equal(response.status(), 206); assert.equal((await response.body()).length, 1024);
        assert.equal(response.headers()['content-type'], 'audio/mpeg');
        await page.locator('audio').evaluate(async a => { a.muted = true; await a.play(); });
        await page.waitForFunction(() => document.querySelector('audio').currentTime > 0.1);
        await page.selectOption('[data-audio-rate]', '1.5');
        assert.equal(await page.locator('audio').evaluate(a => a.playbackRate), 1.5);
        await page.click('[data-audio-seek="15"]');
        assert((await page.locator('audio').evaluate(a => a.currentTime)) >= 15);
        await page.locator('audio').evaluate(a => a.pause());
        assert.equal(await page.locator('audio').getAttribute('autoplay'), null);
        assert.equal(await page.locator('audio').getAttribute('preload'), 'none');
        const destination = path.join(reportDir, `${slug}-${lang}.png`);
        await page.screenshot({ path: destination, fullPage: false });
        results.push({ url, source, playback: 'passed', range: 'passed', rate: 'passed', screenshot: destination });
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/blog/zh/posts/${slugs[0]}/`);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: path.join(reportDir, 'mobile-zh.png'), fullPage: false });
    await page.locator('audio').evaluate(a => { a.dispatchEvent(new Event('error')); });
    assert(await page.locator('[data-audio-error]').isVisible());
    assert(await page.locator('.article-copy').isVisible());
    await page.goto(`${base}/blog/posts/title/`);
    assert.equal(await page.locator('[data-summary-audio]').count(), 0);
    assert.deepEqual(errors, []);
    const report = { passed: true, pages: results, mobile_overflow: false, missing_audio_preserves_text: true };
    await fs.writeFile(path.join(reportDir, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
