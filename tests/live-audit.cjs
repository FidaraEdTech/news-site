const { chromium } = require('@playwright/test');
const { default: AxeBuilder } = require('@axe-core/playwright');
const fs = require('fs');

(async () => {
  fs.mkdirSync('test-results/live-review', { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const base = process.env.REVIEW_URL || 'https://frontlinedaily.org';
  const report = { pages: [], layouts: [], errors: [] };
  page.on('pageerror', error => report.errors.push(error.message));
  await page.goto(base, { waitUntil: 'networkidle', timeout: 90000 });
  const story = await page.locator('a[href^="/story/"]').first().getAttribute('href');
  for (const route of ['/', '/about', '/search?q=government', '/?category=humanitarian-affairs', story]) {
    if (!route) continue;
    const response = await page.goto(base + route, { waitUntil: 'networkidle', timeout: 90000 });
    const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    report.pages.push({ route, status: response.status(), title: await page.title(), canonical: await page.locator('link[rel="canonical"]').getAttribute('href').catch(() => null), storyLinks: await page.locator('a[href^="/story/"]').count(), violations: audit.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })) });
  }
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base, { waitUntil: 'networkidle', timeout: 90000 });
    await page.evaluate(() => window.scrollTo(0, 0));
    report.layouts.push(await page.evaluate(() => ({ width: innerWidth, contentWidth: document.documentElement.scrollWidth, storyLinks: document.querySelectorAll('a[href^="/story/"]').length })));
    await page.screenshot({ path: `test-results/live-review/home-${width}.png`, fullPage: true });
    await page.screenshot({ path: `test-results/live-review/home-${width}-screen.png` });
  }
  if (story) {
    await page.goto(base + story, { waitUntil: 'networkidle', timeout: 90000 });
    await page.screenshot({ path: 'test-results/live-review/story-desktop.png', fullPage: true });
  }
  fs.writeFileSync('test-results/live-review/report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
})().catch(error => { console.error(error); process.exitCode = 1; });
