import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const routes = ['/', '/markets', '/desk', '/activity', '/proof', '/docs'] as const;
const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-375', width: 375, height: 812 },
] as const;

for (const viewport of viewports) {
  test.describe(viewport.name, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const route of routes) {
      test(`${route} is responsive and has no automated WCAG A/AA violations`, async ({ page }) => {
        await page.goto(route, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('main h1').first()).toBeVisible();
        const dimensions = await page.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          content: document.documentElement.scrollWidth,
        }));
        expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa'])
          .analyze();
        expect(results.violations, results.violations.map((item) => `${item.id}: ${item.help}`).join('\n')).toEqual([]);
      });
    }
  });
}

test('disconnected desk refuses portfolio evaluation and exposes no enabled trade control', async ({ page }) => {
  await page.goto('/desk');
  await expect(page.getByText('Connect your wallet to see your plan.')).toBeVisible();
  await expect(page.getByText('BLOCK')).toBeVisible();
  await expect(page.getByRole('button', { name: /confirm in wallet/i })).toHaveCount(0);
});

test('activity does not invent a trade when the browser journal is empty', async ({ page }) => {
  await page.goto('/activity');
  await expect(page.getByText('Your verified actions will appear here.')).toBeVisible();
  await expect(page.getByText(/browser only/)).toBeVisible();
});

test('allocation presets remain editable and save only to this browser', async ({ page }) => {
  await page.goto('/desk');
  await page.getByRole('radio', { name: /MON forward/ }).click();
  await expect(page.getByText('70% MON', { exact: true })).toBeVisible();
  const slider = page.getByRole('slider', { name: 'Target MON percentage' });
  await slider.fill('61');
  await expect(page.getByRole('radio', { name: /Custom/ })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: 'Save strategy' }).click();
  await expect(page.getByText('Saved in this browser.')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('strategy-desk:preferences:v2'))).toContain('"target":"61"');
});

for (const width of [375, 390, 768]) {
  test(`mobile navigation never covers the final page content at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 768 ? 1024 : 812 });
    await page.goto('/desk');
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const nav = await page.locator('nav[aria-label="Primary navigation"]').boundingBox();
    const footer = await page.locator('footer').boundingBox();
    expect(nav).not.toBeNull();
    expect(footer).not.toBeNull();
    expect(footer!.y + footer!.height).toBeLessThanOrEqual(nav!.y + 1);
    await expect(page.getByText('Method & limits')).toBeVisible();
  });
}

test('activity presents ordinary-language outcome and keeps raw evidence collapsed', async ({ page }) => {
  await page.goto('/activity');
  await page.evaluate(() => localStorage.setItem('strategy-desk:transaction-journal:v1', JSON.stringify([{
    id: 'test-record', fingerprint: `0x${'12'.repeat(32)}`, status: 'CONFIRMED',
    account: `0x${'11'.repeat(20)}`, chainId: 143, marketAddress: `0x${'22'.repeat(20)}`,
    baseAmountAtoms: '200000000000000000000', expectedQuoteAtoms: '4800000', minimumQuoteAtoms: '4776000',
    receivedQuoteAtoms: '4790000', beforeMonAtoms: '1000000000000000000000', afterMonAtoms: '799900000000000000000',
    createdAt: '2026-10-13T10:00:00.000Z', updatedAt: '2026-10-13T10:01:00.000Z',
    hash: `0x${'ab'.repeat(32)}`, blockNumber: '123', filledSizeRaw: '2000000000000',
  }])))
  await page.reload();
  await expect(page.getByRole('heading', { name: /Sell 200\.0+ MON/ })).toBeVisible();
  await expect(page.getByText(/4\.790+ USDC/)).toBeVisible();
  await expect(page.getByText('Technical evidence')).toBeVisible();
  await expect(page.getByText('Monad mainnet · 143')).toBeHidden();
});
