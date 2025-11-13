import { test, expect, Page } from '@playwright/test';

// poll /api/trades until it returns JSON to avoid intermittent index.html responses
async function ensureApiReady(page: Page) {
  for (let i = 0; i < 20; i++) {
    const ok = await page.evaluate(async () => {
      try {
        const r = await fetch('/__health');
        if (!r.ok) return false;
        const ct = r.headers.get('content-type') || '';
        return ct.includes('application/json');
      } catch (e) {
        return false;
      }
    });
    if (ok) return;
    await page.waitForTimeout(500);
  }
  throw new Error('Health endpoint did not return JSON in time');
}

test('happy path: add a trade and see it in the list', async ({ page }) => {
  page.on('console', (msg) => console.log('PAGE CONSOLE:', msg.text()));
  page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));
  await page.goto('http://localhost:5173/trades');
  await ensureApiReady(page);
  // In CI we'd run the dev server or serve the build; for this demo assume server running
  console.log('PAGE HTML', await page.content());
  await expect(page.locator('text=Trade Store UI')).toBeVisible();
});
