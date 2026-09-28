import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { planBatch, reviewProblems, runImport } from './lib.mjs';

const intake = JSON.parse(
  readFileSync(new URL('../../catalog/intake/amman-2026-09-28.json', import.meta.url), 'utf8'),
);
const review = {
  reviewedAt: '2026-10-01',
  reviewer: 'field-team',
  accessConfirmed: true,
  access: 'public_rental',
  identityConfirmed: true,
  locationConfidence: 'map_checked',
  lat: 31.98,
  lng: 35.88,
};
const reviewed = () => {
  const batch = structuredClone(intake);
  batch.pitches[0].review = { ...review };
  return batch;
};

test('the research intake as it stands imports nothing: every pitch awaits review', () => {
  const plan = planBatch(intake);
  assert.deepEqual(plan.errors, []);
  assert.equal(plan.ready.length, 0);
  assert.equal(plan.awaiting.length, intake.pitches.length);
});

test('a pitch with a completed review is ready; the intake rules still apply', () => {
  const plan = planBatch(reviewed());
  assert.deepEqual(plan.errors, []);
  assert.deepEqual(
    plan.ready.map((p) => p.id),
    [intake.pitches[0].id],
  );
  const claiming = reviewed();
  claiming.pitches[0].participation = 'verified';
  assert.notDeepEqual(planBatch(claiming).errors, []);
});

test('incomplete reviews are reported, not imported', () => {
  assert.deepEqual(reviewProblems({ ...review, accessConfirmed: false }), [
    'current public access is not confirmed',
  ]);
  assert.ok(reviewProblems({ ...review, access: 'school_only' }).length);
  assert.ok(reviewProblems({ ...review, lat: 51.5, lng: -0.1 }).length);
  assert.deepEqual(
    reviewProblems({ ...review, locationConfidence: 'unchecked', lat: null, lng: null }),
    [],
  );
  const batch = reviewed();
  batch.pitches[0].review.identityConfirmed = false;
  const plan = planBatch(batch);
  assert.equal(plan.ready.length, 0);
  assert.equal(plan.invalid[0].id, intake.pitches[0].id);
});

test('runImport opens a run, sends only reviewed records with the batch date, and closes it', async () => {
  const calls = [];
  const rpc = async (name, args) => {
    calls.push([name, args]);
    if (name === 'import_start_run') return 'run-1';
    if (name === 'import_catalog_record') return { status: 'created', pitch_id: 'p1' };
    return { seen: 1, new: 1, needs_review: 0, gone: 0 };
  };
  const out = await runImport(rpc, reviewed(), {
    source: 'nujoom_research',
    licence: 'research-notes',
  });
  assert.deepEqual(
    calls.map(([n]) => n),
    ['import_start_run', 'import_catalog_record', 'import_finish_run'],
  );
  assert.equal(calls[1][1].p_record.checkedAt, intake.checkedAt);
  assert.equal(calls[1][1].p_record.review.access, 'public_rental');
  assert.equal(calls[2][1].p_full_snapshot, false);
  assert.deepEqual(out.results, [{ id: intake.pitches[0].id, status: 'created', pitch_id: 'p1' }]);
  assert.equal(out.awaiting.length, intake.pitches.length - 1);
});
