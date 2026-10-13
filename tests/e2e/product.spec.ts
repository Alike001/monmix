import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const routes = ['/', '/markets', '/desk', '/activity', '/proof', '/docs'] as const;
const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
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
  await expect(page.getByText('Connect to evaluate your holdings.')).toBeVisible();
  await expect(page.getByText('DISCONNECTED')).toBeVisible();
  await expect(page.getByRole('button', { name: /confirm in wallet/i })).toHaveCount(0);
});

test('activity does not invent a trade when the browser journal is empty', async ({ page }) => {
  await page.goto('/activity');
  await expect(page.getByText('No wallet actions from this application')).toBeVisible();
  await expect(page.getByText(/Nothing here is inferred/)).toBeVisible();
});
