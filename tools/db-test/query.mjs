// Read-only query against the linked Supabase project, for checking remote state.
// Usage (credentials come from the Supabase CLI's temporary login role):
//   eval "$(supabase db dump --linked --dry-run | grep '^export PG')" && node tools/db-test/query.mjs "select 1"
import pg from 'pg';

const sql = process.argv[2];
if (!sql) throw new Error('Pass a SQL query');

const client = new pg.Client({ ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query('set role postgres');
  await client.query('begin read only');
  const res = await client.query(sql);
  console.log(JSON.stringify(res.rows, null, 1));
} finally {
  await client.query('rollback').catch(() => {});
  await client.end();
}
