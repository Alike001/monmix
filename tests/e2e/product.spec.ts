import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const routes = ['/', '/markets', '/desk', '/activity', '/proof', '/docs'] as const;
const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-375', width: 375, height: 812 },
] as const;

test('every public route and internal navigation target resolves', async ({ request }) => {
  for (const route of routes) {
    const response = await request.get(route);
    expect(response.status(), `${route} returned ${response.status()}`).toBe(200);
  }
});

test('MonMix identity and release metadata render', async ({ page, request }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('MonMix — Your crypto, your mix.');
  await expect(page.getByRole('link', { name: 'MonMix home' })).toBeVisible();
  await expect(page.getByText('Your crypto, your mix.', { exact: true }).first()).toBeVisible();
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', 'MonMix — Your crypto, your mix.');
  expect((await request.get('/icon.svg')).status()).toBe(200);
  expect((await request.get('/manifest.webmanifest')).status()).toBe(200);
  expect((await request.get('/opengraph-image')).status()).toBe(200);
});

test('public routes load without missing same-origin page resources or runtime errors', async ({ page }) => {
  const failures: string[] = [];
  page.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`));
  page.on('requestfailed', (request) => {
    if (['document', 'script', 'stylesheet', 'image', 'font'].includes(request.resourceType())) {
      failures.push(`${request.resourceType()}: ${request.url()} (${request.failure()?.errorText ?? 'failed'})`);
    }
  });
  page.on('response', (response) => {
    const request = response.request();
    if (new URL(response.url()).origin === 'http://127.0.0.1:3100' &&
      ['document', 'script', 'stylesheet', 'image', 'font'].includes(request.resourceType()) && response.status() >= 400) {
      failures.push(`${response.status()}: ${response.url()}`);
    }
  });
  for (const route of routes) {
    await page.goto(route, { waitUntil: 'load' });
    await expect(page.locator('main h1').first()).toBeVisible();
  }
  expect(failures).toEqual([]);
});

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
  await expect(page.getByRole('button', { name: /Connect wallet/ })).toHaveCount(1);
  await expect(page.locator('.portfolio-panel').getByRole('button', { name: /Connect wallet/ })).toHaveCount(0);
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

  test(`mobile activity action can scroll fully above navigation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 768 ? 1024 : 812 });
    await page.goto('/activity');
    const action = page.getByRole('link', { name: 'Open MonMix' });
    await action.scrollIntoViewIfNeeded();
    const nav = await page.locator('nav[aria-label="Primary navigation"]').boundingBox();
    const actionBox = await action.boundingBox();
    expect(nav).not.toBeNull();
    expect(actionBox).not.toBeNull();
    expect(actionBox!.y + actionBox!.height).toBeLessThanOrEqual(nav!.y);
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

test('prepared buy is clearly unsigned and distinct from a completed trade', async ({ page }) => {
  await page.goto('/activity');
  await page.evaluate(() => localStorage.setItem('strategy-desk:transaction-journal:v1', JSON.stringify([{
    id: 'prepared-buy', fingerprint: `0x${'34'.repeat(32)}`, status: 'PREPARED', action: 'BUY_MON',
    account: `0x${'11'.repeat(20)}`, chainId: 143, marketAddress: `0x${'22'.repeat(20)}`,
    baseAmountAtoms: '205000000000000000000', minimumQuoteAtoms: '0', quoteAmountAtoms: '5000000',
    expectedBaseAtoms: '205000000000000000000', minimumBaseAtoms: '203975000000000000000',
    createdAt: '2026-10-13T10:00:00.000Z', updatedAt: '2026-10-13T10:00:00.000Z',
  }])))
  await page.reload();
  await expect(page.getByText('PREPARED', { exact: true })).toBeVisible();
  await expect(page.getByText('Prepared from fresh market data, but no wallet request was made.')).toBeVisible();
  await expect(page.getByText('Not yet verified')).toBeVisible();
  await expect(page.getByRole('link', { name: /View transaction/ })).toHaveCount(0);
});

test('multiple injected wallets require selection and a rejected network switch stays closed', async ({ page }) => {
  const account = '0x1111111111111111111111111111111111111111';
  let balanceReads = 0;
  page.on('request', (request) => { if (request.url().includes('/api/balances')) balanceReads += 1; });
  await page.addInitScript(({ injectedAccount }) => {
    const createProvider = (chainId: string, rejectSwitch: boolean) => {
      const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
      return {
        request: async ({ method }: { method: string }) => {
          if (method === 'eth_requestAccounts' || method === 'eth_accounts') return [injectedAccount];
          if (method === 'eth_chainId') return chainId;
          if (method === 'wallet_switchEthereumChain') {
            if (rejectSwitch) throw Object.assign(new Error('User rejected the request.'), { code: 4001 });
            return null;
          }
          if (method === 'wallet_requestPermissions' || method === 'wallet_getPermissions') return [{ parentCapability: 'eth_accounts' }];
          throw new Error(`Unsupported mock method ${method}`);
        },
        on: (event: string, listener: (...args: unknown[]) => void) => {
          const handlers = listeners.get(event) ?? new Set(); handlers.add(listener); listeners.set(event, handlers);
        },
        removeListener: (event: string, listener: (...args: unknown[]) => void) => listeners.get(event)?.delete(listener),
      };
    };
    const wallets = [
      { info: { uuid: '350670db-19fa-4704-a166-e52e178b59d2', name: 'MetaMask', icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>', rdns: 'io.metamask' }, provider: Object.assign(createProvider('0x1', true), { isMetaMask: true }) },
      { info: { uuid: '8c1db2fa-790f-4a74-9b5b-3f4692f49f42', name: 'Rabby Wallet', icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>', rdns: 'io.rabby' }, provider: Object.assign(createProvider('0x8f', false), { isRabby: true }) },
    ];
    const announce = () => wallets.forEach((detail) => window.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail })));
    window.addEventListener('eip6963:requestProvider', announce);
    window.setTimeout(announce, 0);
  }, { injectedAccount: account });

  await page.goto('/desk');
  await page.getByRole('button', { name: /Connect wallet/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Choose a wallet' });
  await expect(dialog.getByRole('button', { name: /MetaMask.*Connect/ })).toBeVisible();
  await expect(dialog.getByRole('button', { name: /Rabby Wallet.*Connect/ })).toBeVisible();
  await dialog.getByRole('button', { name: /MetaMask.*Connect/ }).click();
  await expect(page.getByRole('dialog', { name: 'Your connected wallet' })).toBeVisible();
  await expect(page.getByRole('dialog').getByText('WRONG NETWORK', { exact: true })).toBeVisible();
  await expect(page.getByText('Ethereum Mainnet', { exact: true })).toBeVisible();
  await expect(page.getByText('Provider chain ID').locator('..').getByText('1', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Switch to Monad Mainnet' }).click();
  await expect(page.getByText(/User rejected/i)).toBeVisible();
  await expect(page.getByRole('dialog').getByText('WRONG NETWORK', { exact: true })).toBeVisible();
  await expect(page.getByText('Switch to Monad mainnet.')).toBeVisible();
  expect(balanceReads).toBe(0);
});

test('a selected provider becomes ready only after its reported chain switches to Monad mainnet', async ({ page }) => {
  const account = '0x1111111111111111111111111111111111111111';
  await page.route('**/api/balances?**', (route) => route.fulfill({ json: { ok: true, mon: '0', usdc: '0' } }));
  await page.addInitScript(({ injectedAccount }) => {
    const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
    let chainId = '0xa4b1';
    const provider = {
      isMetaMask: true,
      request: async ({ method }: { method: string }) => {
        if (method === 'eth_requestAccounts' || method === 'eth_accounts') return [injectedAccount];
        if (method === 'eth_chainId') return chainId;
        if (method === 'wallet_switchEthereumChain') {
          chainId = '0x8f';
          window.setTimeout(() => { for (const listener of listeners.get('chainChanged') ?? []) listener(chainId); }, 0);
          return null;
        }
        if (method === 'wallet_requestPermissions' || method === 'wallet_getPermissions') return [{ parentCapability: 'eth_accounts' }];
        throw new Error(`Unsupported mock method ${method}`);
      },
      on: (event: string, listener: (...args: unknown[]) => void) => {
        const handlers = listeners.get(event) ?? new Set(); handlers.add(listener); listeners.set(event, handlers);
      },
      removeListener: (event: string, listener: (...args: unknown[]) => void) => listeners.get(event)?.delete(listener),
    };
    Object.defineProperty(window, 'ethereum', { configurable: true, value: provider });
  }, { injectedAccount: account });

  await page.goto('/desk');
  await page.getByRole('button', { name: /Connect wallet/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Browser wallet.*Connect/ }).click();
  await expect(page.getByText('Arbitrum One', { exact: true })).toBeVisible();
  await expect(page.getByRole('dialog').getByText('WRONG NETWORK', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Switch to Monad Mainnet' }).click();
  await expect(page.getByRole('dialog').getByText('READY', { exact: true })).toBeVisible();
  await expect(page.getByText('Monad Mainnet', { exact: true })).toBeVisible();
  await expect(page.getByText('Provider chain ID').locator('..').getByText('143', { exact: true })).toBeVisible();
});

test('wallet chooser remains accessible and reachable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/desk');
  await page.getByRole('button', { name: /Connect wallet/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Choose a wallet' });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close wallet dialog' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.locator('button:not(:disabled)').last()).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Close wallet dialog' })).toBeFocused();
  const box = await dialog.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(812);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations, results.violations.map((item) => `${item.id}: ${item.help}`).join('\n')).toEqual([]);
});

test('a verified empty Monad wallet is not described as an on-track allocation', async ({ page }) => {
  const account = '0x1111111111111111111111111111111111111111';
  const market = '0x065C9d28E428A0db40191a54d33d5b7c71a9C394';
  const usdc = '0x754704Bc059F8C67012fEd69BC8A327a5aafb603';
  await page.route('**/api/market', (route) => route.fulfill({ json: { ok: true, snapshot: {
    chainId: 143, marketAddress: market,
    params: { pricePrecision: '100000000', sizePrecision: '10000000000', baseAssetAddress: '0x0000000000000000000000000000000000000000', baseAssetDecimals: '18', quoteAssetAddress: usdc, quoteAssetDecimals: '6', tickSize: '100', minSize: '2000000000000', maxSize: '2000000000000000000', takerFeeBps: '0', makerFeeBps: '0' },
    book: { blockNumber: '123', bids: [{ priceRaw: '2400000', sizeRaw: '1000000000000000' }], asks: [{ priceRaw: '2410000', sizeRaw: '1000000000000000' }] },
    bestBidX18: '24000000000000000', bestAskX18: '24100000000000000', midpointX18: '24050000000000000', observedAtSeconds: '1000', ageSeconds: '1', status: 'LIVE',
  } } }));
  await page.route('**/api/balances?**', (route) => route.fulfill({ json: { ok: true, mon: '0', usdc: '0' } }));
  await page.addInitScript(({ injectedAccount }) => {
    const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
    const provider = {
      request: async ({ method }: { method: string }) => {
        if (method === 'eth_requestAccounts' || method === 'eth_accounts') return [injectedAccount];
        if (method === 'eth_chainId') return '0x8f';
        if (method === 'wallet_requestPermissions' || method === 'wallet_getPermissions') return [{ parentCapability: 'eth_accounts' }];
        throw new Error(`Unsupported mock method ${method}`);
      },
      on: (event: string, listener: (...args: unknown[]) => void) => {
        const handlers = listeners.get(event) ?? new Set(); handlers.add(listener); listeners.set(event, handlers);
      },
      removeListener: (event: string, listener: (...args: unknown[]) => void) => listeners.get(event)?.delete(listener),
    };
    Object.defineProperty(window, 'ethereum', { configurable: true, value: provider });
  }, { injectedAccount: account });

  await page.goto('/desk');
  await page.getByRole('button', { name: /Connect wallet/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Browser wallet.*Connect/ }).click();
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByRole('heading', { name: 'This portfolio is empty.' })).toBeVisible();
  await expect(page.getByText(/No MON or USDC was found/)).toBeVisible();
  await expect(page.getByText('Your allocation is on track.')).toHaveCount(0);
  await expect(page.getByText('Fund wallet to begin')).toBeVisible();
});

test('mocked injected wallet reaches a protected buy preparation without enabling a write', async ({ page }) => {
  const account = '0x7Db99F225Af7A1A21b7b6468Ed28F4bC60FbE937';
  const market = '0x065C9d28E428A0db40191a54d33d5b7c71a9C394';
  const usdc = '0x754704Bc059F8C67012fEd69BC8A327a5aafb603';
  await page.route('**/api/market', (route) => route.fulfill({ json: { ok: true, snapshot: {
    chainId: 143, marketAddress: market,
    params: { pricePrecision: '100000000', sizePrecision: '10000000000', baseAssetAddress: '0x0000000000000000000000000000000000000000', baseAssetDecimals: '18', quoteAssetAddress: usdc, quoteAssetDecimals: '6', tickSize: '100', minSize: '2000000000000', maxSize: '2000000000000000000', takerFeeBps: '0', makerFeeBps: '0' },
    book: { blockNumber: '123', bids: [{ priceRaw: '2400000', sizeRaw: '1000000000000000' }], asks: [{ priceRaw: '2410000', sizeRaw: '1000000000000000' }] },
    bestBidX18: '24000000000000000', bestAskX18: '24100000000000000', midpointX18: '24050000000000000', observedAtSeconds: '1000', ageSeconds: '1', status: 'LIVE',
  } } }));
  await page.route('**/api/balances?**', (route) => route.fulfill({ json: { ok: true, mon: '0', usdc: '1000000000' } }));
  await page.route('**/api/preflight/buy', (route) => route.fulfill({ json: { ok: true, preparation: {
    chainId: 143, account, marketAddress: market, quoteTokenAddress: usdc, approvalSpender: market,
    implementationAddress: '0x5e3446c600524Be453bbCEFD46a9E4C9bE8899a0', implementationCodeHash: `0x${'12'.repeat(32)}`,
    blockNumber: '123', observedAtSeconds: Math.floor(Date.now() / 1000).toString(), expiresAtSeconds: (Math.floor(Date.now() / 1000) + 20).toString(),
    requestedQuoteAtoms: '15000000', quoteAmountAtoms: '15000000', quoteSizeRaw: '1500000000', expectedBaseAtoms: '622000000000000000000', minimumBaseAtoms: '618890000000000000000', declaredMinimumBaseAtoms: '200000000000000000000', slippageBps: '50',
    walletMonBalanceWei: '1000000000000000000', walletQuoteBalanceAtoms: '1000000000', currentAllowanceAtoms: '0', approvalRequired: true, approvalAmountAtoms: '15000000', approvalGasEstimate: '88000', buyGasEstimate: null, gasPriceWei: '102000000000', maximumApprovalGasCostWei: '8976000000000000', maximumBuyGasCostWei: null,
    bestAskX18: '24100000000000000', valuationPriceX18: '24050000000000000', estimatedPriceImpactBps: '0', takerFeeBps: '0', fillOrKill: true, isMargin: false, exactBuySimulationPassed: false, fingerprint: `0x${'56'.repeat(32)}`,
  } } }));
  await page.addInitScript(({ injectedAccount }) => {
    const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
    let activeAccount = injectedAccount;
    const provider = {
      isMetaMask: true,
      request: async ({ method, params }: { method: string; params?: unknown[] }) => {
        if (method === 'eth_requestAccounts' || method === 'eth_accounts') return [activeAccount];
        if (method === 'eth_chainId') return '0x8f';
        if (method === 'wallet_switchEthereumChain') return null;
        if (method === 'wallet_requestPermissions') return [{ parentCapability: 'eth_accounts' }];
        if (method === 'wallet_getPermissions') return [{ parentCapability: 'eth_accounts' }];
        throw new Error(`Mock provider does not implement ${method}: ${JSON.stringify(params ?? [])}`);
      },
      on: (event: string, listener: (...args: unknown[]) => void) => {
        const handlers = listeners.get(event) ?? new Set(); handlers.add(listener); listeners.set(event, handlers);
      },
      removeListener: (event: string, listener: (...args: unknown[]) => void) => listeners.get(event)?.delete(listener),
    };
    Object.assign(window, { __monmixSwitchAccount: (next: string) => {
      activeAccount = next;
      for (const listener of listeners.get('accountsChanged') ?? []) listener([next]);
    } });
    Object.defineProperty(window, 'ethereum', { configurable: true, value: provider });
  }, { injectedAccount: account });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/desk');
  await page.getByRole('button', { name: /Connect wallet/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: /MetaMask.*Connect|Browser wallet.*Connect/ }).click();
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.locator('header').getByText(/0x7Db9…E937/)).toBeVisible();
  await page.getByRole('slider', { name: 'Target MON percentage' }).fill('100');
  await expect(page.getByRole('heading', { name: 'A MON buy is suggested.' })).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Prepare buy' }).click();
  await expect(page.getByText('Exact approval required')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('Pending approval')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mainnet execution disabled' })).toBeDisabled();
  const nextAccount = '0x2222222222222222222222222222222222222222';
  await page.evaluate((next) => (window as unknown as { __monmixSwitchAccount(next: string): void }).__monmixSwitchAccount(next), nextAccount);
  await expect(page.locator('header').getByText(/0x2222…2222/)).toBeVisible();
  await expect(page.getByText('Exact approval required')).toHaveCount(0);
});
