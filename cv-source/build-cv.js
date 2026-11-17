// Renders cv-source/cv.html to David_Mwiti_CV.pdf with Playwright's Chromium. Fails if it spills onto a second page.
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto('file://' + path.join(__dirname, 'cv.html'));
    const out = path.join(__dirname, '..', 'David_Mwiti_CV.pdf');
    const pdf = await page.pdf({ path: out, format: 'A4', printBackground: true, preferCSSPageSize: true });
    const pages = Number((pdf.toString('latin1').match(/\/Count (\d+)/) || [])[1]);
    if (pages !== 1) throw new Error(`CV renders to ${pages} pages; trim content to keep it one page`);
    console.log(`wrote ${out} (1 page)`);
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
