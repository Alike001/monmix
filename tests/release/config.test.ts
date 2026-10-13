import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

function json(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
}

test('Vercel uses the repository-root workspace and guarded release build', () => {
  const config = json('vercel.json');
  assert.equal(config.framework, 'nextjs');
  assert.equal(config.installCommand, 'pnpm install --frozen-lockfile');
  assert.equal(config.buildCommand, 'pnpm build:release');
  assert.equal(config.outputDirectory, 'apps/web/.next');
});

test('toolchain versions are pinned for reproducible installs', () => {
  const manifest = json('package.json');
  assert.equal(manifest.name, 'monmix');
  assert.equal(manifest.packageManager, 'pnpm@10.34.5');
  assert.deepEqual(manifest.engines, { node: '22.x' });
  assert.equal(readFileSync('.node-version', 'utf8').trim(), '22.16.0');
  assert.equal(readFileSync('.nvmrc', 'utf8').trim(), '22.16.0');
});

test('public identity and metadata are release-complete', () => {
  const layout = readFileSync('apps/web/app/layout.tsx', 'utf8');
  const manifest = readFileSync('apps/web/app/manifest.ts', 'utf8');
  const readme = readFileSync('README.md', 'utf8');
  assert.match(layout, /MonMix — Your crypto, your mix\./);
  assert.match(layout, /openGraph:/);
  assert.match(layout, /twitter:/);
  assert.match(manifest, /short_name: 'MonMix'/);
  assert.match(readme, /github\.com\/Alike001\/monmix/);
});

test('CI and example environments explicitly disable execution', () => {
  const workflow = readFileSync('.github/workflows/verify.yml', 'utf8');
  const example = readFileSync('.env.example', 'utf8');
  assert.match(workflow, /NEXT_PUBLIC_ENABLE_MAINNET_EXECUTION: ["']false["']/);
  assert.match(workflow, /pnpm build:release/);
  assert.match(example, /^NEXT_PUBLIC_ENABLE_MAINNET_EXECUTION=false$/m);
});

test('guarded release build refuses an execution-enabled bundle', () => {
  const rejected = spawnSync(process.execPath, ['scripts/assert-execution-disabled.mjs'], {
    env: { ...process.env, NEXT_PUBLIC_ENABLE_MAINNET_EXECUTION: 'true' },
    encoding: 'utf8',
  });
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /Release build refused/);

  const accepted = spawnSync(process.execPath, ['scripts/assert-execution-disabled.mjs'], {
    env: { ...process.env, NEXT_PUBLIC_ENABLE_MAINNET_EXECUTION: 'false' },
    encoding: 'utf8',
  });
  assert.equal(accepted.status, 0);
  assert.match(accepted.stdout, /explicitly false/);
});

test('tracked release excludes local environments, Vercel metadata and key-based signers', () => {
  const listed = spawnSync('git', ['ls-files'], { encoding: 'utf8' });
  assert.equal(listed.status, 0);
  const files = listed.stdout.trim().split('\n');
  assert.equal(files.some((file) => file === '.env' || file === '.env.local' || file.startsWith('.vercel/')), false);

  const sourceFiles = files.filter((file) =>
    (file.startsWith('apps/') || file.startsWith('packages/')) &&
    (file.endsWith('.ts') || file.endsWith('.tsx')) &&
    !file.includes('/tests/') && !file.endsWith('.test.ts'),
  );
  const prohibited = /privateKeyToAccount|mnemonicToAccount|createWalletClient|eth_sendTransaction/;
  for (const file of sourceFiles) assert.doesNotMatch(readFileSync(file, 'utf8'), prohibited, file);
});
