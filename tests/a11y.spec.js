// axe-core scan: fail on serious/critical WCAG A/AA violations.
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

const PAGES = ['/', ...['credit-memo', 'nl2sql', 'anchor', 'enterprise-agents', 'production-ml'].map((p) => `/projects/${p}/`)];

for (const url of PAGES) {
  for (const width of [1440, 390]) {
    test(`${url} @${width}: no serious axe violations`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setViewportSize({ width, height: 900 });
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      const serious = violations.filter((v) => ['serious', 'critical'].includes(v.impact))
        .map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
      expect(serious).toEqual([]);
    });
  }
}
