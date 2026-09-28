// Reviewed catalog batches → the database import (D2, D-052; format:
// agentic_system/contracts/catalog-import.md). Pure planning plus an import loop that takes the
// RPC function as a parameter, so both are unit-tested without a database.
import { validateIntake } from '../catalog/validate.mjs';

const ACCESS = new Set(['public_rental', 'public_free']);
const CONFIDENCE = new Set(['unchecked', 'approximate', 'map_checked', 'site_checked']);

/** Problems with one pitch's `review` block (empty = complete). */
export function reviewProblems(review) {
  const problems = [];
  if (!review || typeof review !== 'object') return ['review is missing'];
  if (!/^\d{4}-\d{2}-\d{2}/.test(review.reviewedAt ?? ''))
    problems.push('reviewedAt must be a date');
  if (typeof review.reviewer !== 'string' || !review.reviewer.trim())
    problems.push('reviewer is required');
  if (review.accessConfirmed !== true) problems.push('current public access is not confirmed');
  if (!ACCESS.has(review.access)) problems.push('access must be public_rental or public_free');
  if (review.identityConfirmed !== true) problems.push('the field identity is not confirmed');
  const confidence = review.locationConfidence ?? 'unchecked';
  if (!CONFIDENCE.has(confidence)) problems.push('locationConfidence is not a known value');
  if (confidence !== 'unchecked') {
    const inJordan =
      typeof review.lat === 'number' &&
      typeof review.lng === 'number' &&
      review.lat >= 29 &&
      review.lat <= 33.5 &&
      review.lng >= 34.8 &&
      review.lng <= 39.5;
    if (!inJordan) problems.push('a checked location needs entrance lat/lng inside Jordan');
  }
  return problems;
}

/**
 * What a batch would import. Codex's intake rules run on the batch without review blocks (the
 * intake validator doesn't know them); then each pitch is ready, awaiting review, or invalid.
 */
export function planBatch(batch) {
  const withoutReviews = structuredClone(batch);
  for (const pitch of withoutReviews?.pitches ?? []) {
    if (pitch && typeof pitch === 'object') delete pitch.review;
  }
  const errors = validateIntake(withoutReviews);
  const ready = [];
  const awaiting = [];
  const invalid = [];
  if (!errors.length) {
    for (const pitch of batch.pitches) {
      if (pitch.review === undefined) {
        awaiting.push(pitch.id);
        continue;
      }
      const problems = reviewProblems(pitch.review);
      if (problems.length) invalid.push({ id: pitch.id, problems });
      else ready.push(pitch);
    }
  }
  return { errors, ready, awaiting, invalid };
}

/**
 * Imports the ready pitches in one run. `rpc(name, args)` resolves to the function's result or
 * throws. Returns the per-record results and the run's counts.
 */
export async function runImport(rpc, batch, { source, licence }) {
  const plan = planBatch(batch);
  if (plan.errors.length)
    throw new Error(`the batch is not valid intake: ${plan.errors.join('; ')}`);
  const run = await rpc('import_start_run', { p_source: source, p_batch: batch.batchId });
  const results = [];
  for (const pitch of plan.ready) {
    const record = { ...pitch, checkedAt: pitch.checkedAt ?? batch.checkedAt };
    const result = await rpc('import_catalog_record', {
      p_run: run,
      p_licence: licence,
      p_record: record,
    });
    results.push({ id: pitch.id, ...result });
  }
  const counts = await rpc('import_finish_run', { p_run: run, p_full_snapshot: false });
  return { run, results, counts, awaiting: plan.awaiting, invalid: plan.invalid };
}
