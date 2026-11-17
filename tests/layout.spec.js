// Responsive layout: no horizontal overflow, no runtime errors, nav reachable. SHOTS=1 saves screenshots.
const { test, expect } = require('@playwright/test');

const PAGES = ['/', ...['credit-memo', 'nl2sql', 'anchor', 'enterprise-agents', 'production-ml'].map((p) => `/projects/${p}/`)];
const WIDTHS = [1440, 768, 390, 320];

for (const url of PAGES) {
  for (const width of WIDTHS) {
    test(`${url} @${width}px: no overflow or errors`, async ({ page }, info) => {
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text())) errors.push(m.text()); });
      // Static test server has no Worker; give PATCH's status probe an answer instead of a 404.
      await page.route('**/api/guide/status', (r) => r.fulfill({ json: { configured: false, providers: [], tracing: false } }));
      await page.setViewportSize({ width, height: 900 });
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      const overflow = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const wide = [...document.querySelectorAll('body *')].filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.right > vw + 1 && getComputedStyle(el).position !== 'fixed' && !el.closest('.notebook-index');
        }).slice(0, 5).map((el) => `${el.tagName.toLowerCase()}.${el.className}`);
        return { scroll: document.documentElement.scrollWidth - vw, wide };
      });
      expect(overflow.scroll, `page scrolls horizontally: ${overflow.wide.join(', ')}`).toBeLessThanOrEqual(0);
      expect(overflow.wide, 'elements extend past the viewport').toEqual([]);
      expect(errors).toEqual([]);
      if (process.env.SHOTS) {
        const name = `${url === '/' ? 'home' : url.split('/')[2]}-${width}-${info.project.name}.png`;
        await page.screenshot({ path: `qa-screenshots/${name}`, fullPage: true });
      }
    });
  }
}

for (const url of ['/', '/projects/anchor/']) {
  test(`${url} mobile menu opens, navigates, closes on Escape`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto(url);
    const toggle = page.locator('.nav-toggle');
    const nav = page.locator('#site-nav');
    await expect(toggle).toBeVisible();
    await expect(nav).toBeHidden();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    for (const label of ['projects', 'lab', 'notebook', 'toolkit', 'shipping log', 'contact']) {
      await expect(nav.getByRole('link', { name: label, exact: true })).toBeVisible();
    }
    await page.keyboard.press('Escape');
    await expect(nav).toBeHidden();
    await expect(toggle).toBeFocused();
    await toggle.click();
    await nav.getByRole('link', { name: 'notebook' }).click();
    await expect(page).toHaveURL(/#notebook$/);
    await expect(nav).toBeHidden();
  });
}

test('desktop shows nav inline and hides the menu button', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.locator('.nav-toggle')).toBeHidden();
  await expect(page.locator('#site-nav')).toBeVisible();
});
