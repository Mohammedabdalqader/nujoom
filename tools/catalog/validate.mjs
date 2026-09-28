import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const evidencedAttributes = new Map([
  ['playersPerSide', 'players_per_side'],
  ['surface', 'surface'],
  ['indoor', 'indoor'],
  ['lights', 'lights'],
]);
const pitchKeys = new Set([
  'id',
  'publication',
  'participation',
  'operations',
  'facilityNameAr',
  'facilityNameEn',
  'fieldLabelAr',
  'fieldLabelEn',
  'city',
  'areaAr',
  'playersPerSide',
  'surface',
  'indoor',
  'lights',
  'access',
  'location',
  'evidence',
  'photoLeads',
]);
const photoLeadKeys = new Set(['sourceUrl', 'exactFieldConfirmed', 'reusePermission', 'note']);
const batchKeys = new Set([
  'schemaVersion',
  'batchId',
  'purpose',
  'checkedAt',
  'pitches',
  'facilityLeads',
]);
const locationKeys = new Set(['confidence', 'addressAr', 'lat', 'lng']);
const evidenceKeys = new Set(['fact', 'sourceUrl', 'summary']);
const facilityLeadKeys = new Set([
  'id',
  'facilityNameAr',
  'reportedFootballFields',
  'reasonNotSplit',
  'sourceUrl',
]);

function nonblank(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function checkKeys(value, allowed, at, errors) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) errors.push(`${at}.${key} is not an intake field`);
  }
}

function isHttps(value) {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateIntake(batch) {
  const errors = [];
  if (batch && typeof batch === 'object' && !Array.isArray(batch)) {
    checkKeys(batch, batchKeys, 'batch', errors);
  }
  if (batch?.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (batch?.purpose !== 'research_only') errors.push('purpose must be research_only');
  if (!nonblank(batch?.batchId)) errors.push('batchId must be nonempty');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(batch?.checkedAt ?? '')) {
    errors.push('checkedAt must be YYYY-MM-DD');
  }
  if (!Array.isArray(batch?.pitches)) errors.push('pitches must be an array');
  if (!Array.isArray(batch?.facilityLeads)) errors.push('facilityLeads must be an array');
  if (errors.length) return errors;

  const ids = new Set();
  for (const [index, pitch] of batch.pitches.entries()) {
    const at = `pitches[${index}]`;
    if (!pitch || typeof pitch !== 'object') {
      errors.push(`${at} must be an object`);
      continue;
    }
    checkKeys(pitch, pitchKeys, at, errors);
    if (!nonblank(pitch.id) || ids.has(pitch.id)) {
      errors.push(`${at}.id must be unique and nonempty`);
    }
    ids.add(pitch.id);
    if (pitch.publication !== 'unpublished' || pitch.participation !== 'not_verified') {
      errors.push(`${at} must stay unpublished and not_verified in intake`);
    }
    if (pitch.operations !== null) {
      errors.push(`${at} cannot contain booking operations`);
    }
    if (!nonblank(pitch.facilityNameAr) || !nonblank(pitch.city)) {
      errors.push(`${at} needs a facility name and city`);
    }
    if (!Array.isArray(pitch.evidence)) {
      errors.push(`${at}.evidence must be an array`);
      continue;
    }
    const facts = new Set();
    for (const [eIndex, item] of pitch.evidence.entries()) {
      if (!item || typeof item !== 'object') {
        errors.push(`${at}.evidence[${eIndex}] must be an object`);
        continue;
      }
      checkKeys(item, evidenceKeys, `${at}.evidence[${eIndex}]`, errors);
      if (!nonblank(item.fact) || !nonblank(item.summary) || !isHttps(item.sourceUrl)) {
        errors.push(`${at}.evidence[${eIndex}] needs a fact, summary and HTTPS source`);
      }
      facts.add(item.fact);
    }
    for (const required of ['field_existence', 'public_access']) {
      if (!facts.has(required)) errors.push(`${at} lacks ${required} evidence`);
    }
    for (const [attribute, fact] of evidencedAttributes) {
      if (pitch[attribute] !== null && pitch[attribute] !== undefined && !facts.has(fact)) {
        errors.push(`${at}.${attribute} needs ${fact} evidence`);
      }
    }
    if (!pitch.location || typeof pitch.location !== 'object') {
      errors.push(`${at}.location must be an object`);
    } else {
      checkKeys(pitch.location, locationKeys, `${at}.location`, errors);
    }
    if (
      pitch.location?.confidence !== 'unchecked' ||
      pitch.location?.lat !== null ||
      pitch.location?.lng !== null
    ) {
      errors.push(`${at} cannot assert checked coordinates in research intake`);
    }
    if (pitch.location?.addressAr && !facts.has('address')) {
      errors.push(`${at}.location.addressAr needs address evidence`);
    }
    if (!Array.isArray(pitch.photoLeads)) {
      errors.push(`${at}.photoLeads must be an array`);
    } else {
      for (const [pIndex, lead] of pitch.photoLeads.entries()) {
        if (!lead || typeof lead !== 'object') {
          errors.push(`${at}.photoLeads[${pIndex}] must be an object`);
          continue;
        }
        checkKeys(lead, photoLeadKeys, `${at}.photoLeads[${pIndex}]`, errors);
        if (
          !isHttps(lead.sourceUrl) ||
          lead.exactFieldConfirmed !== false ||
          lead.reusePermission !== 'unknown'
        ) {
          errors.push(`${at}.photoLeads[${pIndex}] must remain an unconfirmed HTTPS lead`);
        }
      }
    }
  }

  for (const [index, lead] of batch.facilityLeads.entries()) {
    const at = `facilityLeads[${index}]`;
    if (!lead || typeof lead !== 'object') {
      errors.push(`${at} must be an object`);
      continue;
    }
    checkKeys(lead, facilityLeadKeys, at, errors);
    if (!nonblank(lead.id) || ids.has(lead.id)) {
      errors.push(`${at}.id must be unique and nonempty`);
    }
    ids.add(lead.id);
    if (
      !nonblank(lead.facilityNameAr) ||
      !Number.isInteger(lead.reportedFootballFields) ||
      lead.reportedFootballFields < 2 ||
      !nonblank(lead.reasonNotSplit) ||
      !isHttps(lead.sourceUrl)
    ) {
      errors.push(`${at} needs a name, multi-field count, split reason and HTTPS source`);
    }
  }
  return errors;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const path = process.argv[2];
  if (!path) {
    console.error('Usage: node tools/catalog/validate.mjs <intake.json>');
    process.exitCode = 2;
  } else {
    try {
      const batch = JSON.parse(readFileSync(path, 'utf8'));
      const errors = validateIntake(batch);
      if (errors.length) {
        console.error(errors.join('\n'));
        process.exitCode = 1;
      } else {
        console.log(
          `${batch.pitches.length} pitch candidates, ${batch.facilityLeads.length} unresolved facility leads; research only.`,
        );
      }
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
  }
}
