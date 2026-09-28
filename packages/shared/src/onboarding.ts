import { z } from 'zod';

import { ageOn, dateInAmman, DEFAULT_MIN_AGE, isYouthAge } from './age';
import { westernDigits } from './card-code';

/**
 * Onboarding input rules (spec §6.1). The database (`public.complete_onboarding`) is the
 * authority; these mirror it so forms can explain problems before a round trip.
 */

export const PLAYER_POSITIONS = ['GK', 'DEF', 'MID', 'FWD'] as const;
export const DOMINANT_FEET = ['left', 'right', 'both'] as const;
export const PROFILE_VISIBILITIES = ['public', 'city', 'private'] as const;
export const CONSENT_TYPES = ['terms', 'privacy', 'recording', 'streaming'] as const;

export type PlayerPosition = (typeof PLAYER_POSITIONS)[number];
export type DominantFoot = (typeof DOMINANT_FEET)[number];
export type ProfileVisibility = (typeof PROFILE_VISIBILITIES)[number];
export type ConsentType = (typeof CONSENT_TYPES)[number];

/** Current consent versions, from `config.consent_versions`. */
export type ConsentVersions = { terms: string; privacy: string; recording: string };

/** Each issue maps 1:1 to an `onboarding.issues.*` translation key. */
export type OnboardingIssue =
  | 'displayName'
  | 'dob'
  | 'belowMinAge'
  | 'city'
  | 'neighborhood'
  | 'position'
  | 'handle'
  | 'shirtNumber'
  | 'terms'
  | 'privacy';

export function normalizeDisplayName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

const displayNameSchema = z
  .string()
  .transform(normalizeDisplayName)
  .pipe(z.string().min(2).max(40));

/** Lower-cased handle without a leading @, or null when empty. */
export function normalizeHandle(value: string): string | null {
  const handle = value.trim().replace(/^@/, '').toLowerCase();
  return handle === '' ? null : handle;
}

export function isValidHandle(handle: string): boolean {
  return /^[a-z0-9._]{3,20}$/.test(handle);
}

/** A typed number field (day, month, year, shirt) as Western digits only: "١٥" → "15". */
export function digitsOnly(value: string): string {
  return westernDigits(value).replace(/\D/g, '');
}

/**
 * Builds an ISO date from separate day/month/year fields, rejecting impossible dates such as
 * 31/02. Digits must already be Western (see `digitsOnly`).
 */
export function dobFromParts(day: string, month: string, year: string): string | null {
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (![d, m, y].every(Number.isInteger) || y < 1900 || m < 1 || m > 12 || d < 1) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return null;
  }
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Whether a date of birth belongs to a youth (drives the guardian step and visibility UI). */
export function isYouthDob(dob: string, today: string = dateInAmman(new Date())): boolean {
  return isYouthAge(ageOn(dob, today));
}

export type ProfileStepInput = {
  displayName: string;
  dob: string | null;
  cityId: number | null;
  neighborhoodId: number | null;
  /** Whether the chosen city has neighbourhoods (then one is required). */
  cityHasNeighborhoods: boolean;
  position: PlayerPosition | null;
  handle: string;
  shirtNumber: number | null;
};

/** Validates the profile steps. Returns the issues found (empty when valid). */
export function validateProfileStep(
  input: ProfileStepInput,
  options: { minAge?: number; today?: string } = {},
): OnboardingIssue[] {
  const issues: OnboardingIssue[] = [];
  if (!displayNameSchema.safeParse(input.displayName).success) issues.push('displayName');

  if (!input.dob) {
    issues.push('dob');
  } else {
    const today = options.today ?? dateInAmman(new Date());
    const age = ageOn(input.dob, today);
    if (input.dob > today || age > 110) issues.push('dob');
    else if (age < (options.minAge ?? DEFAULT_MIN_AGE)) issues.push('belowMinAge');
  }

  if (input.cityId == null) issues.push('city');
  else if (input.cityHasNeighborhoods && input.neighborhoodId == null) issues.push('neighborhood');
  if (input.position == null) issues.push('position');

  const handle = normalizeHandle(input.handle);
  if (handle !== null && !isValidHandle(handle)) issues.push('handle');
  if (
    input.shirtNumber !== null &&
    (!Number.isInteger(input.shirtNumber) || input.shirtNumber < 1 || input.shirtNumber > 99)
  ) {
    issues.push('shirtNumber');
  }
  return issues;
}

/** The consent step's answers. Recording is optional and may be left unanswered (C-010). */
export type ConsentAnswers = {
  terms: boolean;
  privacy: boolean;
  /** true = yes, false = no, null = not answered. */
  recording: boolean | null;
};

/** Terms and privacy are the account gate (C-010); recording never blocks. */
export function validateConsentStep(answers: ConsentAnswers): OnboardingIssue[] {
  const issues: OnboardingIssue[] = [];
  if (!answers.terms) issues.push('terms');
  if (!answers.privacy) issues.push('privacy');
  return issues;
}

/**
 * The `p_consents` argument of `complete_onboarding`: versions for what was accepted, `false`
 * for an explicit recording no, and no key when recording was not answered.
 */
export function consentPayload(
  answers: ConsentAnswers,
  versions: ConsentVersions,
): Record<string, string | false> {
  const payload: Record<string, string | false> = {};
  if (answers.terms) payload.terms = versions.terms;
  if (answers.privacy) payload.privacy = versions.privacy;
  if (answers.recording === true) payload.recording = versions.recording;
  if (answers.recording === false) payload.recording = false;
  return payload;
}
