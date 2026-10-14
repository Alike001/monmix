import { spawn, spawnSync } from 'node:child_process';

const ACKNOWLEDGEMENT = 'I_APPROVE_LOCAL_MAINNET_EXECUTION';

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function refuse(message) {
  console.error(`Local execution session refused: ${message}`);
  process.exit(1);
}

if (process.env.CI || process.env.VERCEL || process.env.VERCEL_ENV) {
  refuse('this launcher cannot run in CI or Vercel.');
}
if (!process.argv.includes(`--acknowledge=${ACKNOWLEDGEMENT}`)) {
  refuse(`pass --acknowledge=${ACKNOWLEDGEMENT} after the owner approves the exact session.`);
}

const approvedCommit = argument('--commit');
if (!approvedCommit || !/^[0-9a-f]{40}$/.test(approvedCommit)) refuse('--commit must be the full approved Git commit SHA.');
const head = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' });
if (head.status !== 0 || head.stdout.trim() !== approvedCommit) refuse('HEAD does not match the owner-approved commit.');
const status = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' });
if (status.status !== 0 || status.stdout.trim() !== '') refuse('the working tree must be clean before building an execution-enabled session.');

const port = argument('--port') ?? '3000';
if (!/^\d{4,5}$/.test(port) || Number(port) > 65535) refuse('--port must be a valid unprivileged TCP port.');

console.log(`Approved commit: ${approvedCommit}`);
console.log(`Local origin: http://127.0.0.1:${port}`);
console.log('Execution flag: enabled only in the child build/server environment. No environment file will be created or changed.');
console.log('Kuru has no onchain deadline. Reject any wallet request that is not confirmed immediately after fresh revalidation.');

if (process.argv.includes('--check')) {
  console.log('Check only: no build or server was started.');
  process.exit(0);
}

const childEnvironment = { ...process.env, NEXT_PUBLIC_ENABLE_MAINNET_EXECUTION: 'true' };
const build = spawnSync('pnpm', ['build'], { env: childEnvironment, stdio: 'inherit' });
if (build.status !== 0) refuse('the execution-enabled local build failed.');

const server = spawn('pnpm', ['--filter', '@monad-strategy/web', 'start', '--hostname', '127.0.0.1', '--port', port], {
  env: childEnvironment,
  stdio: 'inherit',
});
server.on('exit', (code, signal) => {
  if (signal) console.log(`Local execution server stopped by ${signal}.`);
  process.exit(code ?? 0);
});
