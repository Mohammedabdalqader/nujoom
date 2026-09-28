// Imports a reviewed catalog batch into the linked Supabase project (D2, D-052).
//
//   pnpm --filter @nujoom/tools-catalog-import load <batch.json> [--dry-run]
//        [--source nujoom_research] [--licence research-notes]
//
// Only pitches with a completed `review` block are sent (agentic_system/contracts/catalog-import.md);
// the database creates unpublished candidates and refuses anything else. An admin publishes later.
// Developer machines only: it uses the service role through the Supabase CLI login.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { adminClient } from '../tester-code/lib.mjs';

import { planBatch, runImport } from './lib.mjs';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const file = args.find(
  (a, i) => !a.startsWith('--') && !['--source', '--licence'].includes(args[i - 1]),
);
if (!file) {
  console.error('Usage: import <batch.json> [--dry-run] [--source <name>] [--licence <label>]');
  process.exit(2);
}
const batch = JSON.parse(readFileSync(resolve(process.cwd(), file), 'utf8'));
const source = flag('--source', 'nujoom_research');
const licence = flag('--licence', 'research-notes');

const plan = planBatch(batch);
if (plan.errors.length) {
  console.error('Not valid intake:\n  ' + plan.errors.join('\n  '));
  process.exit(1);
}
console.log(
  `Batch ${batch.batchId}: ${plan.ready.length} reviewed, ${plan.awaiting.length} awaiting review, ${plan.invalid.length} with review problems`,
);
for (const id of plan.awaiting) console.log(`  skip  ${id} (awaiting review)`);
for (const { id, problems } of plan.invalid) console.log(`  fix   ${id}: ${problems.join('; ')}`);

if (args.includes('--dry-run') || plan.ready.length === 0) {
  console.log(plan.ready.length ? '\nDry run: nothing sent.' : '\nNothing to import.');
  process.exit(plan.invalid.length ? 1 : 0);
}

const admin = adminClient();
const rpc = async (name, params) => {
  const { data, error } = await admin.rpc(name, params);
  if (error) throw new Error(`${name}: ${error.message}`);
  return data;
};
const out = await runImport(rpc, batch, { source, licence });
for (const r of out.results) {
  console.log(`  ${r.status.padEnd(9)} ${r.id}${r.reason ? ` (${r.reason})` : ''}`);
}
console.log(`\nRun ${out.run}: ${JSON.stringify(out.counts)}`);
console.log('Imported records are unpublished candidates; an admin reviews and publishes them.');
process.exit(out.results.some((r) => r.status === 'rejected') || plan.invalid.length ? 1 : 0);
