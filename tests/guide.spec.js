// PATCH UI. The python static server has no /api, so routes are mocked here; server logic is covered by server/worker.test.mjs.
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

const LIVE = {
  mode: 'live', provider: 'groq', reply: 'Up to 95 minutes down to under five.',
  cards: [{ id: 'credit-memo', title: '95 minutes → under five', status: 'Shipped · PaySoko', url: '/projects/credit-memo/', summary: 's' }],
  actions: [{ id: 'open_credit', label: 'Open the credit memo case', href: '/projects/credit-memo/' }],
  followups: ['What did numerical QA check?'],
};

// The Worker streams NDJSON: deltas, then a 'done' event carrying the final reply.
const ndjson = (data) => ({ status: 200, contentType: 'application/x-ndjson',
  body: `${JSON.stringify({ type: 'delta', text: data.reply.slice(0, 5) })}\n${JSON.stringify({ type: 'done', ...data })}\n` });

async function mockApi(page, chat = LIVE, configured = true) {
  await page.route('**/api/guide/status', (r) => r.fulfill({ json: { configured, providers: ['groq'], tracing: false } }));
  await page.route('**/api/guide/chat', (r) => (typeof chat === 'number' ? r.fulfill({ status: chat, json: { error: 'Too many messages.' } }) : r.fulfill(ndjson(chat))));
}

test('open, ask, see card + allowlisted action, keyboard close', async ({ page }) => {
  await mockApi(page);
  await page.goto('/');
  await page.getByRole('button', { name: /ask PATCH/ }).click();
  const dialog = page.getByRole('dialog', { name: 'PATCH' });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.patch-status')).toHaveText('● live');
  await page.keyboard.type('How did the credit memo improve speed?');
  await page.keyboard.press('Enter');
  await expect(dialog.getByText('Up to 95 minutes down to under five.')).toBeVisible();
  await expect(dialog.getByText('LIVE MODEL', { exact: true })).toBeVisible();
  await expect(dialog.locator('a.patch-card')).toHaveAttribute('href', '/projects/credit-memo/');
  await expect(dialog.getByRole('button', { name: 'What did numerical QA check?' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: /ask PATCH/ })).toBeFocused();
});

test('conversation persists across navigation within the session', async ({ page }) => {
  await mockApi(page);
  await page.goto('/');
  await page.getByRole('button', { name: /ask PATCH/ }).click();
  await page.getByLabel('Your question').fill('credit memo?');
  await page.getByRole('button', { name: 'send' }).click();
  await page.getByRole('button', { name: 'Open the credit memo case' }).click();
  await expect(page).toHaveURL(/\/projects\/credit-memo\/$/);
  await page.getByRole('button', { name: /ask PATCH/ }).click();
  await expect(page.getByText('credit memo?')).toBeVisible();
});

test('server errors and offline status are labelled, never shown as a live answer', async ({ page }) => {
  await mockApi(page, 429, false);
  await page.goto('/');
  await page.getByRole('button', { name: /ask PATCH/ }).click();
  await expect(page.locator('.patch-status')).toHaveText('◌ preview');
  await page.getByLabel('Your question').fill('hello there friend, tell me things');
  await page.keyboard.press('Enter');
  await expect(page.getByText('PREVIEW · NOT A LIVE MODEL').last()).toBeVisible();
  await expect(page.getByText(/Too many messages/)).toBeVisible();
});

test('model text is rendered as text, not HTML', async ({ page }) => {
  await mockApi(page, { ...LIVE, reply: '<img src=x onerror="window.pwned=1">', cards: [], actions: [] });
  await page.goto('/');
  await page.getByRole('button', { name: /ask PATCH/ }).click();
  await page.getByLabel('Your question').fill('x');
  await page.keyboard.press('Enter');
  await expect(page.getByText('<img src=x', { exact: false })).toBeVisible();
  expect(await page.evaluate(() => window.pwned)).toBeUndefined();
});

test('opt-in trace defaults off and is sent only when ticked', async ({ page }) => {
  const bodies = [];
  await mockApi(page);
  await page.route('**/api/guide/chat', (r) => { bodies.push(r.request().postDataJSON()); r.fulfill(ndjson(LIVE)); });
  await page.goto('/');
  await page.getByRole('button', { name: /ask PATCH/ }).click();
  const box = page.getByRole('checkbox', { name: /opt-in trace/ });
  await expect(box).not.toBeChecked();
  await page.getByLabel('Your question').fill('one');
  await page.keyboard.press('Enter');
  await expect(page.getByText('LIVE MODEL', { exact: true })).toBeVisible();
  await box.check();
  await page.getByLabel('Your question').fill('two');
  await page.keyboard.press('Enter');
  await expect(page.getByText('LIVE MODEL', { exact: true })).toHaveCount(2);
  expect(bodies.map((b) => b.trace)).toEqual([false, true]);
});

for (const width of [390, 320]) {
  test(`panel fits and has no a11y violations at ${width}px`, async ({ page }) => {
    await mockApi(page);
    await page.setViewportSize({ width, height: 760 });
    await page.goto('/projects/anchor/');
    await page.getByRole('button', { name: /ask PATCH/ }).click();
    const box = await page.locator('#patch-panel').boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    const { violations } = await new AxeBuilder({ page }).include('#patch-panel').analyze();
    expect(violations.map((v) => v.id)).toEqual([]);
  });
}

test('follow-ups carry the conversation; "new chat" forgets it', async ({ page }) => {
  const sent = [];
  await mockApi(page);
  await page.route('**/api/guide/chat', (r) => { sent.push(r.request().postDataJSON()); r.fulfill(ndjson({ ...LIVE, reply: `reply ${sent.length}` })); });
  await page.goto('/');
  await page.getByRole('button', { name: /ask PATCH/ }).click();
  await page.getByLabel('Your question').fill("I'm hiring for an ML role");
  await page.keyboard.press('Enter');
  await expect(page.getByText('reply 1')).toBeVisible();
  await page.getByLabel('Your question').fill('what did I say?');
  await page.keyboard.press('Enter');
  await expect(page.getByText('reply 2')).toBeVisible();
  expect(sent[1].history).toEqual([{ role: 'user', content: "I'm hiring for an ML role" }, { role: 'assistant', content: 'reply 1' }]);
  await page.getByRole('button', { name: 'new chat' }).click();
  await expect(page.getByText("I'm hiring for an ML role")).toHaveCount(0);
});

test('"Ask David directly" pre-fills the email with the visitor\'s questions', async ({ page }) => {
  await mockApi(page, { ...LIVE, cards: [], actions: [{ id: 'email_david', label: 'Ask David directly', href: 'mailto:david.mwiti.muthiru@gmail.com' }] });
  await page.goto('/');
  await page.getByRole('button', { name: /ask PATCH/ }).click();
  await page.getByLabel('Your question').fill('Is David open to contract work?');
  await page.keyboard.press('Enter');
  const href = await page.getByRole('link', { name: /Ask David directly/ }).getAttribute('href');
  expect(href).toMatch(/^mailto:david\.mwiti\.muthiru@gmail\.com\?/);
  expect(decodeURIComponent(href)).toContain('- Is David open to contract work?');
});
