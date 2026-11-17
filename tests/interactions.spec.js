// Every interactive control on the homepage and case pages, driven by mouse and keyboard.
const { test, expect } = require('@playwright/test');

test.describe('homepage lab', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/'); });

  test('run pipeline completes all 5 stages', async ({ page }) => {
    await page.click('#run-pipeline');
    await expect(page.locator('#run-pipeline')).toBeDisabled();
    await expect(page.locator('#pipeline-status')).toHaveText(/complete · 5\/5/, { timeout: 15000 });
    await expect(page.locator('#run-pipeline')).toBeEnabled();
    await expect(page.locator('#trace-log > div')).toHaveCount(5);
  });

  test('clicking a stage mid-run stops the run and re-enables Run', async ({ page }) => {
    await page.click('#run-pipeline');
    await page.locator('#stage-row .stage').nth(3).click();
    await expect(page.locator('#run-pipeline')).toBeEnabled();
    await expect(page.locator('#stage-counter')).toHaveText('STAGE 4 / 5');
    await expect(page.locator('#handoff-out')).not.toHaveText('Awaiting a stage');
  });

  test('reset returns to idle', async ({ page }) => {
    await page.locator('#stage-row .stage').first().click();
    await page.click('#reset-pipeline');
    await expect(page.locator('#pipeline-status')).toContainText('idle');
  });

  test('failure modes change the verdict', async ({ page }) => {
    for (const [mode, verdict] of [['stale', 'REVIEW'], ['missing', 'ABSTAIN'], ['healthy', 'PASS']]) {
      await page.click(`[data-mode="${mode}"]`);
      await expect(page.locator('#quality-value')).toHaveText(verdict);
    }
  });

  test('stages are keyboard operable', async ({ page }) => {
    await page.locator('#stage-row .stage').nth(1).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#stage-counter')).toHaveText('STAGE 2 / 5');
  });
});

test.describe('toolkit tanks', () => {
  test('clicking a tank fills it and explains it', async ({ page }) => {
    await page.goto('/');
    const tank = page.locator('.tank').nth(2);
    await tank.click();
    await expect(tank).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#tank-title')).not.toHaveText('SELECT A MODULE');
    await expect(page.locator('#tank-pills span').first()).toBeVisible();
    await expect.poll(() => tank.locator('.tank-fill').evaluate((el) => el.style.height)).not.toBe('0%');
  });
});

test.describe('engineering notebook', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/'); });

  test('has 16 concepts', async ({ page }) => {
    await expect(page.locator('.notebook-entry')).toHaveCount(16);
  });

  test('search filters and shows empty state', async ({ page }) => {
    await page.fill('#notebook-search', 'docker');
    await expect(page.locator('.notebook-entry')).toHaveCount(1);
    await page.fill('#notebook-search', 'zzzz-nothing');
    await expect(page.locator('.notebook-empty')).toBeVisible();
  });

  test('category filter', async ({ page }) => {
    await page.click('[data-category="Voice"]');
    await expect(page.locator('.notebook-entry')).toHaveCount(2);
  });

  test('keyboard selection keeps focus on the entry', async ({ page }) => {
    const entry = page.locator('[data-concept="rag"]');
    await entry.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#notebook-detail h3')).toContainText('Retrieval-augmented generation');
    await expect(page.locator('[data-concept="rag"]')).toBeFocused();
    await page.locator('[data-category="Agents"]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-category="Agents"]')).toBeFocused();
  });

  test('related concept and case-study links work', async ({ page }) => {
    await page.click('[data-concept="rag"]');
    await page.click('[data-related="reranking"]');
    await expect(page.locator('#notebook-detail h3')).toContainText('Reranking');
    await expect(page.locator('#notebook-detail')).toBeFocused();
    await expect(page.locator('.notebook-case')).toHaveAttribute('href', /^\/(projects\/[a-z0-9-]+\/|#lab)$/);
  });

  test('surprise me picks a different concept', async ({ page }) => {
    const before = await page.locator('#notebook-detail h3').textContent();
    await page.click('#notebook-random');
    await expect(page.locator('#notebook-detail h3')).not.toHaveText(before);
  });

  test('terminal term opens the notebook by keyboard', async ({ page }) => {
    await page.locator('.terminal-line').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#notebook-detail')).toBeFocused();
  });
});

const CASES = ['credit-memo', 'nl2sql', 'anchor', 'enterprise-agents', 'production-ml'];
for (const slug of CASES) {
  test(`${slug}: workflow runs, stages inspect, handoff updates`, async ({ page }) => {
    await page.goto(`/projects/${slug}/`);
    await expect(page.locator('.story-intro')).toBeVisible();
    await page.click('#project-run');
    await expect(page.locator('#project-state')).toHaveText('complete · 5/5', { timeout: 15000 });
    await page.locator('#project-stages .stage').nth(2).click();
    await expect(page.locator('#step-count')).toHaveText('STAGE 3 / 5');
    await expect(page.locator('#handoff-in')).not.toHaveText('Question / source material');
    await expect(page.locator('#artifact-in')).not.toBeEmpty();
    await expect(page.locator('#artifact-out')).not.toBeEmpty();
    await expect(page.locator('.artifact-note')).toContainText('synthetic');
    await page.click('#project-reset');
    await expect(page.locator('#project-state')).toHaveText('idle · 0/5');
  });
}

test('anchor speech explorer switches patterns', async ({ page }) => {
  await page.goto('/projects/anchor/');
  const s2s = page.locator('[data-speech="s2s"]');
  await s2s.click();
  await expect(s2s).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#speech-title')).toHaveText('Speech-to-speech');
  await expect(page.locator('#speech-diagram')).toHaveAttribute('aria-label', /Speech-to-speech/);
  await expect(page.getByRole('link', { name: 'Explore Anchor! ↗' })).toHaveAttribute('href', 'https://studyanchor.org/');
});

test('skip link moves focus to content', async ({ page, browserName }) => {
  await page.goto('/');
  // Safari only tabs to links with Option held (default macOS setting).
  await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main$/);
});
