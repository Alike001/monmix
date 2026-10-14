import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const EXECUTION_VARIABLE = 'NEXT_PUBLIC_ENABLE_MAINNET_EXECUTION';
export const NEXT_PRODUCTION_ENV_FILES = ['.env.production.local', '.env.local', '.env.production', '.env'];

function isLiteralFalse(value) {
  return /^(?:false|'false'|"false")(?:\s+#.*)?$/.test(value.trim());
}

export function unsafeExecutionDefinitions(contents) {
  const definitions = [];
  for (const [index, line] of contents.split(/\r?\n/).entries()) {
    const match = line.match(/^\s*(?:export\s+)?NEXT_PUBLIC_ENABLE_MAINNET_EXECUTION\s*=\s*(.*?)\s*$/);
    if (match && !isLiteralFalse(match[1] ?? '')) definitions.push(index + 1);
  }
  return definitions;
}

export function assertReleaseExecutionDisabled({ environment = process.env, appDirectory }) {
  const value = environment[EXECUTION_VARIABLE];
  if (value !== undefined && value !== 'false') {
    throw new Error(`Release build refused: ${EXECUTION_VARIABLE} must be false or unset in the process environment.`);
  }

  for (const filename of NEXT_PRODUCTION_ENV_FILES) {
    const path = join(appDirectory, filename);
    if (!existsSync(path)) continue;
    const unsafeLines = unsafeExecutionDefinitions(readFileSync(path, 'utf8'));
    if (unsafeLines.length > 0) {
      throw new Error(`Release build refused: ${path} defines ${EXECUTION_VARIABLE} unsafely on line${unsafeLines.length === 1 ? '' : 's'} ${unsafeLines.join(', ')}. Remove it or set it to literal false.`);
    }
  }

  return value === 'false' ? 'explicitly false' : 'unset (disabled by code)';
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  try {
    const state = assertReleaseExecutionDisabled({ environment: process.env, appDirectory: join(repositoryRoot, 'apps/web') });
    console.log(`Release execution gate: ${state}. Checked process.env and all Next.js production env files.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Release build refused by the execution safety gate.');
    process.exit(1);
  }
}
