import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { validateIntake } from './validate.mjs';

const batch = JSON.parse(
  readFileSync(new URL('../../catalog/intake/amman-2026-09-28.json', import.meta.url), 'utf8'),
);

test('the sourced Amman intake is structurally valid but remains research-only', () => {
  assert.deepEqual(validateIntake(batch), []);
  assert.equal(
    batch.pitches.every((pitch) => pitch.publication === 'unpublished'),
    true,
  );
});

test('duplicate physical identities are refused', () => {
  const changed = structuredClone(batch);
  changed.pitches[1].id = changed.pitches[0].id;
  assert.match(validateIntake(changed).join('\n'), /unique/);
});

test('intake cannot claim verification, operations or a price', () => {
  const changed = structuredClone(batch);
  changed.pitches[0].participation = 'verified';
  changed.pitches[0].operations = { schedule_active: true };
  changed.pitches[0].price = 20;
  const errors = validateIntake(changed).join('\n');
  assert.match(errors, /not_verified/);
  assert.match(errors, /booking operations/);
  assert.match(errors, /price is not an intake field/);
});

test('a known design attribute needs source evidence', () => {
  const changed = structuredClone(batch);
  changed.pitches[0].surface = 'artificial_turf';
  assert.match(validateIntake(changed).join('\n'), /surface evidence/);
});

test('unconfirmed photo leads cannot become image assets', () => {
  const changed = structuredClone(batch);
  changed.pitches[0].photoLeads[0].assetPath = 'public/pitches/claimed.jpg';
  assert.match(validateIntake(changed).join('\n'), /assetPath is not an intake field/);
});

test('a direct image path cannot bypass photo leads', () => {
  const changed = structuredClone(batch);
  changed.pitches[0].photo = { assetPath: 'public/pitches/claimed.jpg' };
  assert.match(validateIntake(changed).join('\n'), /photo is not an intake field/);
});

test('unexpected nested fields cannot bypass research-only controls', () => {
  const changed = structuredClone(batch);
  changed.pitches[0].location.imageUrl = 'https://example.com/field.jpg';
  changed.pitches[0].evidence[0].published = true;
  const errors = validateIntake(changed).join('\n');
  assert.match(errors, /location.imageUrl is not an intake field/);
  assert.match(errors, /evidence\[0\].published is not an intake field/);
});

test('multi-field venues stay unresolved until each physical field is identified', () => {
  assert.equal(batch.facilityLeads.length, 2);
  const changed = structuredClone(batch);
  changed.facilityLeads[0].reportedFootballFields = 1;
  assert.match(validateIntake(changed).join('\n'), /multi-field count/);
});
