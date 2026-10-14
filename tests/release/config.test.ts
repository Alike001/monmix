import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { assertReleaseExecutionDisabled, NEXT_PRODUCTION_ENV_FILES } from '../../scripts/assert-execution-disabled.mjs';

function json(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
}

test('Vercel app-root configuration uses the workspace and guarded release build', () => {
  assert.equal(existsSync('vercel.json'), false);
  const config = json('apps/web/vercel.json');
  assert.equal(config.framework, 'nextjs');
  assert.equal(config.installCommand, 'pnpm install --frozen-lockfile');
  assert.equal(config.buildCommand, 'cd ../.. && pnpm build:release');
  assert.equal(config.outputDirectory, '.next');
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

test('guarded release build inspects every Next.js production environment file', () => {
  for (const filename of NEXT_PRODUCTION_ENV_FILES) {
    const temporaryRoot = mkdtempSync(join(tmpdir(), 'monmix-release-guard-'));
    try {
      const appDirectory = join(temporaryRoot, 'apps', 'web');
      mkdirSync(appDirectory, { recursive: true });
      writeFileSync(join(appDirectory, filename), 'NEXT_PUBLIC_ENABLE_MAINNET_EXECUTION=true\n');
      assert.throws(
        () => assertReleaseExecutionDisabled({ environment: {}, appDirectory }),
        new RegExp(`${filename.replaceAll('.', '\\.')}.+unsafely`),
      );
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  }
});

test('release guard accepts only a literal disabled value in Next.js environment files', () => {
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'monmix-release-guard-'));
  try {
    const appDirectory = join(temporaryRoot, 'apps', 'web');
    mkdirSync(appDirectory, { recursive: true });
    writeFileSync(join(appDirectory, '.env.production.local'), 'NEXT_PUBLIC_ENABLE_MAINNET_EXECUTION=false\n');
    writeFileSync(join(appDirectory, '.env.local'), "NEXT_PUBLIC_ENABLE_MAINNET_EXECUTION='false' # local safety\n");
    assert.equal(assertReleaseExecutionDisabled({ environment: {}, appDirectory }), 'unset (disabled by code)');

    writeFileSync(join(appDirectory, '.env'), 'NEXT_PUBLIC_ENABLE_MAINNET_EXECUTION=$ENABLE_EXECUTION\n');
    assert.throws(() => assertReleaseExecutionDisabled({ environment: {}, appDirectory }), /defines NEXT_PUBLIC_ENABLE_MAINNET_EXECUTION unsafely/);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test('local execution launcher is loopback-only and refuses hosted environments', () => {
  const source = readFileSync('scripts/start-local-execution.mjs', 'utf8');
  assert.match(source, /127\.0\.0\.1/);
  assert.match(source, /NEXT_PUBLIC_ENABLE_MAINNET_EXECUTION: 'true'/);
  assert.doesNotMatch(source, /writeFile|appendFile|\.env\.local/);

  const refused = spawnSync(process.execPath, [
    'scripts/start-local-execution.mjs',
    '--acknowledge=I_APPROVE_LOCAL_MAINNET_EXECUTION',
    '--commit', '0000000000000000000000000000000000000000',
    '--check',
  ], { env: { ...process.env, CI: 'true' }, encoding: 'utf8' });
  assert.notEqual(refused.status, 0);
  assert.match(refused.stderr, /cannot run in CI or Vercel/);
});

test('tracked release excludes local environments, Vercel metadata and key-based signers', () => {
  const listed = spawnSync('git', ['ls-files'], { encoding: 'utf8' });
  assert.equal(listed.status, 0);
  const files = listed.stdout.trim().split('\n');
  assert.equal(files.some((file) => (/(^|\/)\.env(?:\..+)?$/.test(file) && file !== '.env.example') || file.startsWith('.vercel/')), false);

  const sourceFiles = files.filter((file) =>
    (file.startsWith('apps/') || file.startsWith('packages/')) &&
    (file.endsWith('.ts') || file.endsWith('.tsx')) &&
    !file.includes('/tests/') && !file.endsWith('.test.ts'),
  );
  const prohibited = /privateKeyToAccount|mnemonicToAccount|createWalletClient|eth_sendTransaction/;
  for (const file of sourceFiles) assert.doesNotMatch(readFileSync(file, 'utf8'), prohibited, file);
});
