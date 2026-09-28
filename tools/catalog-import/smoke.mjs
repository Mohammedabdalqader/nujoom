// Live smoke test of the catalog import (D-052) against the linked project, under its own
// source name (`smoke_test`), removing everything it created at the end.
//
//   pnpm --filter @nujoom/tools-catalog-import smoke
import { readFileSync } from 'node:fs';

import { adminClient } from '../tester-code/lib.mjs';

import { runImport } from './lib.mjs';

const results = [];
const check = (name, ok, detail = '') => {
  results.push(ok);
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok || !detail ? '' : ` — ${detail}`}`);
};

const admin = adminClient();
const rpc = async (name, params) => {
  const { data, error } = await admin.rpc(name, params);
  if (error) throw new Error(`${name}: ${error.message}`);
  return data;
};

const intake = JSON.parse(
  readFileSync(new URL('../../catalog/intake/amman-2026-09-28.json', import.meta.url), 'utf8'),
);
const stamp = Date.now().toString(36);
const batch = structuredClone(intake);
batch.batchId = `smoke-${stamp}`;
batch.facilityLeads = [];
batch.pitches = [
  {
    ...intake.pitches[1],
    id: `smoke-${stamp}`,
    facilityNameAr: 'ملعب اختبار الاستيراد',
    facilityNameEn: 'Import smoke test',
    review: {
      reviewedAt: '2026-10-01',
      reviewer: 'smoke-test',
      accessConfirmed: true,
      access: 'public_rental',
      identityConfirmed: true,
      locationConfidence: 'approximate',
      lat: 31.95,
      lng: 35.93,
    },
  },
  { ...intake.pitches[0], id: `smoke-unreviewed-${stamp}` },
];
const opts = { source: 'smoke_test', licence: 'research-notes' };

try {
  const first = await runImport(rpc, batch, opts);
  check(
    'a reviewed record is imported',
    first.results[0]?.status === 'created',
    JSON.stringify(first.results),
  );
  check('an unreviewed one is left out', first.awaiting.length === 1 && first.results.length === 1);
  const second = await runImport(rpc, batch, opts);
  check(
    're-importing changes nothing',
    second.results[0]?.status === 'unchanged',
    JSON.stringify(second.results),
  );

  const { data: rows } = await admin
    .from('source_records')
    .select('facility_id, pitch_id')
    .eq('source', 'smoke_test');
  check('one source record, one listing', rows?.length === 1 && Boolean(rows[0].pitch_id));
  const { data: facility } = await admin
    .from('facilities')
    .select('listing_state, access, location_confidence')
    .eq('id', rows?.[0]?.facility_id)
    .single();
  check(
    'it waits as an unpublished candidate with the reviewed facts',
    facility?.listing_state === 'candidate' &&
      facility.access === 'public_rental' &&
      facility.location_confidence === 'approximate',
    JSON.stringify(facility),
  );
  const { count } = await admin
    .from('pitch_evidence')
    .select('id', { count: 'exact', head: true })
    .eq('pitch_id', rows?.[0]?.pitch_id);
  check('its cited facts are evidence', (count ?? 0) === batch.pitches[0].evidence.length);
} catch (error) {
  check('smoke run finished', false, error.message);
} finally {
  const { data: rows } = await admin
    .from('source_records')
    .select('facility_id')
    .eq('source', 'smoke_test');
  const facilities = (rows ?? []).map((r) => r.facility_id).filter(Boolean);
  // Venue first: its fields and their (append-only) evidence go with it. Deleting a source record
  // that evidence still points at is refused, by design: source records are kept for audit.
  if (facilities.length) await admin.from('facilities').delete().in('id', facilities);
  await admin.from('source_records').delete().eq('source', 'smoke_test');
  const { error } = await admin.from('import_runs').delete().eq('source', 'smoke_test');
  check('cleanup removed the test records', !error, error?.message);
}

const failed = results.filter((ok) => !ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
