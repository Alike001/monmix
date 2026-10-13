import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const baseUrl = process.env.SCREENSHOT_BASE_URL ?? 'http://127.0.0.1:3100';
const outputDirectory = new URL('../docs/screenshots/', import.meta.url);
const routes = [
  ['home', '/'],
  ['market', '/markets'],
  ['strategy', '/desk'],
  ['activity', '/activity'],
  ['proof', '/proof'],
  ['docs', '/docs'],
];
const viewports = [
  ['desktop', { width: 1440, height: 1000 }],
  ['mobile', { width: 390, height: 844 }],
];

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });

try {
  for (const [viewportName, viewport] of viewports) {
    const page = await browser.newPage({ deviceScaleFactor: 1, viewport });
    for (const [routeName, pathname] of routes) {
      await page.goto(`${baseUrl}${pathname}`, { waitUntil: 'networkidle' });
      await page.screenshot({ fullPage: true, path: new URL(`${routeName}-${viewportName}.png`, outputDirectory).pathname });
    }
    await page.close();
  }
} finally {
  await browser.close();
}
