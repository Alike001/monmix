import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: 0,
  workers: 2,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:3100',
    headless: true,
    launchOptions: { executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] },
  },
  webServer: {
    command: 'pnpm --filter @monad-strategy/web start --hostname 127.0.0.1 --port 3100',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
