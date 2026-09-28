import { TIMEZONE } from './constants';

/**
 * Age rules. Mirrored in SQL by `private.age_on` / `private.age_group_for`
 * (supabase/migrations) — keep both in sync and covered by tests.
 */

export const AGE_GROUPS = ['U12', 'U14', 'U16', 'U18', 'ADULT'] as const;
export type AgeGroup = (typeof AGE_GROUPS)[number];

export const ADULT_AGE = 18;

/** Default minimum age to register; the live value is `config.min_age` (see DECISIONS D-009). */
export const DEFAULT_MIN_AGE = 13;

/** Calendar date (YYYY-MM-DD) of an instant in the Amman timezone. */
export function dateInAmman(instant: Date): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

function parseIsoDate(value: string): [number, number, number] {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`Invalid ISO date: ${value}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/**
 * Whole years between a date of birth and a reference date, both YYYY-MM-DD.
 * Someone born on 29 February turns a year older on 1 March in non-leap years.
 */
export function ageOn(dob: string, on: string): number {
  const [by, bm, bd] = parseIsoDate(dob);
  const [y, m, d] = parseIsoDate(on);
  let age = y - by;
  if (m < bm || (m === bm && d < bd)) age -= 1;
  return age;
}

/** Age today in Amman. */
export function currentAge(dob: string, now: Date = new Date()): number {
  return ageOn(dob, dateInAmman(now));
}

/**
 * Age group by current age: U12 = under 12, U14 = 12–13, U16 = 14–15,
 * U18 = 16–17, ADULT = 18+ (DECISIONS D-009).
 */
export function ageGroupFor(age: number): AgeGroup {
  if (age < 12) return 'U12';
  if (age < 14) return 'U14';
  if (age < 16) return 'U16';
  if (age < ADULT_AGE) return 'U18';
  return 'ADULT';
}

export function isYouthAge(age: number): boolean {
  return age < ADULT_AGE;
}

/**
 * Whether a date of birth needs guardian approval today (Amman calendar). On the 18th birthday
 * itself the player is an adult; the day before, a youth. Mirrors the server's age rules.
 */
export function needsGuardian(dob: string, now: Date = new Date()): boolean {
  return isYouthAge(currentAge(dob, now));
}
