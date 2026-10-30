// npm run backend:local [-- --no-start] [-- --source ../job-hotfix/backend]
// Copies ../job/backend (read-only; or --source, e.g. the combined backend PR branch in ../job-hotfix) to
// .reference-backend, adds our local-only files and patches, writes its .env
// from .env.local, installs, migrates the Neon dev database (D13), seeds, and starts the server on :3000.
// ../job itself is never changed. See docs/SETUP.md "Local backend".
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildBackendEnv,
  decideDatabaseSafety,
  parseEnv,
  serializeEnv,
  shouldCopy,
} from './backend-local/env.ts';
import { applyEdits, PATCHES } from './backend-local/patches.ts';
import { stagingSource } from './backend-local/staging.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Same --source rule as staging:sync (outside this repo; default ../job/backend).
const source = stagingSource(process.argv.slice(2), root);
const target = path.join(root, '.reference-backend');
const overlay = path.join(root, 'scripts', 'backend-local', 'overlay');
const lockHashFile = path.join(target, 'node_modules', '.app-lock-hash');
const start = !process.argv.includes('--no-start');

const log = (msg: string) => console.log(`[backend-local] ${msg}`);

function fail(msg: string): never {
  console.error(`[backend-local] ${msg}`);
  process.exit(1);
}

function run(cmd: string, args: string[], env: NodeJS.ProcessEnv, capture = false): string {
  const res = spawnSync(cmd, args, {
    cwd: target,
    env,
    shell: process.platform === 'win32', // npm/npx are .cmd files on Windows
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    encoding: 'utf8',
  });
  if (res.status !== 0) fail(`${cmd} ${args.join(' ')} failed (exit ${res.status ?? res.signal}).`);
  return capture ? res.stdout : '';
}

// 1. Config: .env.local → backend env, refusing anything that isn't the Neon dev database.
const envLocalPath = path.join(root, '.env.local');
if (!existsSync(envLocalPath))
  fail('.env.local is missing. Copy .env.local.example and fill it in (docs/SETUP.md).');
if (!existsSync(path.join(source, 'package.json')))
  fail(`Reference backend not found at ${source} (clone ../job first).`);
let backendEnv: Record<string, string>;
try {
  backendEnv = buildBackendEnv(parseEnv(readFileSync(envLocalPath, 'utf8')));
} catch (e) {
  fail(e instanceof Error ? e.message : String(e));
}
const childEnv: NodeJS.ProcessEnv = { ...process.env, ...backendEnv };

// 2. Fresh copy (keeps node_modules so installs are fast), then our files and patches.
log(`copying ${source}`);
if (existsSync(target)) {
  for (const entry of readdirSync(target)) {
    if (entry !== 'node_modules') rmSync(path.join(target, entry), { recursive: true, force: true });
  }
}
cpSync(source, target, { recursive: true, filter: (src) => shouldCopy(path.relative(source, src)) });
cpSync(overlay, target, { recursive: true });
for (const patch of PATCHES) {
  const file = path.join(target, patch.file);
  try {
    writeFileSync(file, applyEdits(readFileSync(file, 'utf8'), patch.edits, patch.file));
  } catch (e) {
    fail(e instanceof Error ? e.message : String(e));
  }
  log(`patched ${patch.file}: ${patch.why}`);
}
writeFileSync(path.join(target, '.env'), serializeEnv(backendEnv));

// 3. Install only when the lockfile changed.
const lockHash = createHash('sha256')
  .update(readFileSync(path.join(target, 'package-lock.json')))
  .digest('hex');
if (!existsSync(lockHashFile) || readFileSync(lockHashFile, 'utf8') !== lockHash) {
  log('npm ci (lockfile changed or first run)');
  run('npm', ['ci', '--no-audit', '--no-fund'], childEnv);
  writeFileSync(lockHashFile, lockHash);
}
run('npx', ['prisma', 'generate'], childEnv);

// 4. Last safety check before writing anything to the database.
const factsLine = run('npx', ['tsx', 'app-scripts/dbFacts.ts'], childEnv, true)
  .split(/\r?\n/)
  .find((l) => l.startsWith('DBFACTS '));
if (!factsLine) fail('Could not read database facts.');
try {
  decideDatabaseSafety(JSON.parse(factsLine.slice('DBFACTS '.length)));
} catch (e) {
  fail(e instanceof Error ? e.message : String(e));
}

// 5. Migrate and seed (both idempotent).
log('prisma migrate deploy');
run('npx', ['prisma', 'migrate', 'deploy'], childEnv);
// The job repo's migrations lag schema.prisma (Hospital logo columns, GovJob, InternationalJob have no migration;
// docs/reference/API.md "Notes for the app"). db push adds the rest; without --accept-data-loss it refuses drops.
log('prisma db push (schema parts that have no migration)');
run('npx', ['prisma', 'db', 'push', '--skip-generate'], childEnv);
log('seeding');
run('npx', ['tsx', 'src/seed.ts'], childEnv);
run('npx', ['tsx', 'app-scripts/seedApp.ts'], childEnv);

// 6. Start the server.
if (!start) {
  log('ready (--no-start). Start with: npm run backend:local');
  process.exit(0);
}
log(`starting on http://localhost:${backendEnv.PORT} (Ctrl+C to stop)`);
const server = spawn('npx', ['tsx', 'src/index.ts'], {
  cwd: target,
  env: childEnv,
  shell: process.platform === 'win32',
  stdio: 'inherit',
});
server.on('exit', (code) => process.exit(code ?? 0));
for (const sig of ['SIGINT', 'SIGTERM'] as const) process.on(sig, () => server.kill(sig));
