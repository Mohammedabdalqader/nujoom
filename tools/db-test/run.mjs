// Stand-in for `supabase db reset && supabase test db` on machines without Docker (D-014).
//
// Starts a throwaway embedded Postgres, loads a minimal Supabase shim (roles, auth, storage),
// applies supabase/migrations and supabase/seed.sql in order, then runs every pgTAP file in
// supabase/tests/database, each in its own connection. Exits non-zero on any failure.
//
// Usage: pnpm db:test [filter]   (filter = substring of test file names to run)
import EmbeddedPostgres from 'embedded-postgres';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../..');
const filter = process.argv[2] ?? '';
// A free port per run: a Postgres worker left behind by an interrupted run (seen on Windows,
// PG 18 io workers) must not block the next run on a fixed port.
const PORT = await freePort();

installPgTap();

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nujoom-db-test-'));
const server = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: 'postgres',
  password: 'postgres',
  port: PORT,
  persistent: false,
  onLog: () => {},
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
});

const connect = async () => {
  const client = new pg.Client({
    host: 'localhost',
    port: PORT,
    user: 'postgres',
    password: 'postgres',
    database: 'app',
  });
  await client.connect();
  return client;
};

let failures = 0;
const run = async (client, label, sql) => {
  try {
    const res = await client.query(sql);
    return Array.isArray(res) ? res : [res];
  } catch (err) {
    failures++;
    const where = err.where ? `\n  where: ${err.where}` : '';
    const detail = err.detail ? ` (${err.detail})` : '';
    console.log(`ERROR in ${label}: ${err.message}${detail}${where}`);
    await client.query('rollback').catch(() => {});
    return null;
  }
};

try {
  await server.initialise();
  await server.start();
  await server.createDatabase('app');

  const setup = await connect();
  await run(setup, 'shim.sql', fs.readFileSync(path.join(here, 'shim.sql'), 'utf8'));
  await setup.end();

  // Reconnect so the database-level search_path set by the shim applies.
  const db = await connect();
  const migDir = path.join(repo, 'supabase', 'migrations');
  for (const f of fs
    .readdirSync(migDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()) {
    const ok = await run(db, f, fs.readFileSync(path.join(migDir, f), 'utf8'));
    console.log(`${ok ? 'applied' : 'FAILED '} ${f}`);
  }
  const seed = path.join(repo, 'supabase', 'seed.sql');
  if (fs.existsSync(seed)) {
    const ok = await run(db, 'seed.sql', fs.readFileSync(seed, 'utf8'));
    console.log(`${ok ? 'seeded ' : 'FAILED '} seed.sql`);
  }
  await db.end();

  const testDir = path.join(repo, 'supabase', 'tests', 'database');
  const files = fs
    .readdirSync(testDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    // 000-setup always runs: it creates the shared test helpers.
    .filter((f) => f.startsWith('000') || f.includes(filter));
  let total = 0;
  for (const f of files) {
    const tc = await connect();
    const results = await run(tc, f, fs.readFileSync(path.join(testDir, f), 'utf8'));
    await tc.end();
    if (!results) continue;
    const lines = results
      .flatMap((r) => (r.rows ?? []).flatMap((row) => Object.values(row)))
      .filter((v) => typeof v === 'string' && /^(ok|not ok|#|1\.\.)/.test(v));
    const bad = lines.filter((l) => l.startsWith('not ok') || l.startsWith('#'));
    const passed = lines.filter((l) => l.startsWith('ok')).length;
    total += passed;
    console.log(`${bad.length ? 'FAIL' : 'pass'} ${f} (${passed} ok)`);
    for (const l of bad) console.log('   ' + l.replace(/\n/g, '\n   '));
    if (bad.length) failures++;
  }
  console.log(`\n${total} assertions`);
} finally {
  await server.stop().catch(() => {});
  fs.rmSync(dataDir, { recursive: true, force: true });
}

console.log(failures ? `${failures} problem(s)` : 'ALL GREEN');
process.exit(failures ? 1 : 0);

/** Copies the vendored pgTAP extension into the embedded Postgres share directory once. */
function installPgTap() {
  const ep = fs.realpathSync(path.join(here, 'node_modules', 'embedded-postgres'));
  const platform = `${process.platform === 'win32' ? 'windows' : process.platform}-${process.arch}`;
  const nativeDir = path.join(ep, '..', '@embedded-postgres', platform, 'native');
  const candidates = [
    path.join(nativeDir, 'share', 'extension'),
    path.join(nativeDir, 'share', 'postgresql', 'extension'),
  ];
  const target = candidates.find((dir) => fs.existsSync(dir));
  if (!target) throw new Error(`No Postgres extension directory under ${nativeDir}`);
  for (const f of ['pgtap.control', 'pgtap--1.3.3.sql']) {
    const dest = path.join(target, f);
    if (!fs.existsSync(dest)) fs.copyFileSync(path.join(here, 'vendor', f), dest);
  }
}

/** An unused local TCP port. */
function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}
