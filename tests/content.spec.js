// Static content guards: confidentiality, canonical links, routes, status tags.
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PAGES = ['/', ...['credit-memo', 'nl2sql', 'anchor', 'enterprise-agents', 'production-ml'].map((p) => `/projects/${p}/`)];
const SITE_FILES = fs.readdirSync(ROOT).filter((f) => /\.(html|js|css|md)$/.test(f) && f !== 'playwright.config.js')
  .concat(fs.readdirSync(path.join(ROOT, 'projects')).map((p) => `projects/${p}/index.html`))
  .concat(['cv-source/cv.html', 'wrangler.toml', '.dev.vars.example'])
  .concat(fs.readdirSync(path.join(ROOT, 'server')).filter((f) => f.endsWith('.js')).map((f) => `server/${f}`));

// Confidential names live in an untracked local file (one term per line) so they never ship in the repo or ZIP.
const TERMS_FILE = path.join(__dirname, '.forbidden-terms');

test('no confidential names in site source', () => {
  expect(fs.existsSync(TERMS_FILE), `create ${TERMS_FILE} (one confidential term per line)`).toBe(true);
  const terms = fs.readFileSync(TERMS_FILE, 'utf8').split('\n').map((t) => t.trim().toLowerCase()).filter(Boolean);
  expect(terms.length).toBeGreaterThan(0);
  for (const f of SITE_FILES) {
    const text = fs.readFileSync(path.join(ROOT, f), 'utf8').toLowerCase();
    for (const t of terms) expect(text.includes(t), `${f} contains a confidential term`).toBe(false);
  }
});

test('Anchor links never point at /admin', () => {
  for (const f of SITE_FILES) expect(fs.readFileSync(path.join(ROOT, f), 'utf8')).not.toMatch(/studyanchor\.org\/admin/i);
});

const CANONICAL_EXTERNAL = new Set([
  'https://www.linkedin.com/in/david-mwiti-38316b18b/',
  'https://github.com/mwiti6844',
  'https://studyanchor.org/',
]);
const EMAILS = ['david.mwiti.muthiru@gmail.com', 'david.mwiti@studyanchor.org'];

for (const url of PAGES) {
  test(`links on ${url} resolve and are canonical`, async ({ page, request }) => {
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => a.href));
    expect(hrefs.length).toBeGreaterThan(3);
    for (const href of new Set(hrefs)) {
      if (href.startsWith('tel:')) {
        expect(href).toBe('tel:+254716003852');
      } else if (href.startsWith('mailto:')) {
        expect(EMAILS.some((e) => href.startsWith(`mailto:${e}`)), href).toBe(true);
      } else if (href.startsWith('http://localhost')) {
        const res = await request.get(href.split('#')[0]);
        expect(res.status(), href).toBe(200);
      } else {
        expect(CANONICAL_EXTERNAL.has(href), `non-canonical external link ${href}`).toBe(true);
      }
    }
    // Hash targets must exist on the homepage.
    const home = await request.get('/');
    const html = await home.text();
    for (const h of hrefs.filter((x) => x.includes('#'))) {
      const id = h.split('#')[1];
      if (h.replace(/#.*/, '').endsWith(':8123/')) expect(html.includes(`id="${id}"`), `missing #${id}`).toBe(true);
    }
  });
}

test('CV downloads as a PDF', async ({ request }) => {
  const res = await request.get('/David_Mwiti_CV.pdf');
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('pdf');
  expect((await res.body()).subarray(0, 5).toString()).toBe('%PDF-');
});

const STATUS = { 'credit-memo': 'SHIPPED', nl2sql: 'SHIPPED', anchor: 'LIVE PILOT', 'enterprise-agents': 'IN DEVELOPMENT', 'production-ml': 'SHIPPED' };
for (const [slug, status] of Object.entries(STATUS)) {
  test(`${slug} shows status ${status}`, async ({ page }) => {
    await page.goto(`/projects/${slug}/`);
    await expect(page.locator('.case-status')).toContainText(status);
  });
}

test('homepage section numbers are sequential', async ({ page }) => {
  await page.goto('/');
  const nums = await page.$$eval('section > .eyebrow, section > div > .eyebrow:first-child, section > span.eyebrow',
    (els) => els.map((e) => (e.textContent.match(/^(\d\d) \//) || [])[1]).filter(Boolean));
  expect(nums).toEqual(['01', '02', '03', '04', '05', '06', '07', '08']);
});
