/**
 * Where a signed-in user belongs (contract §3). The database computes the same stage in
 * `public.me()`; this mirror lets the app route before and without a round trip, and tests
 * keep the two in step.
 *
 *   auth → onboarding → consent (terms/privacy outdated) → guardian (youth, none named) → app
 *
 * Recording permission is not a stage: declining it never blocks the app (C-010).
 */

export type JourneyStage = 'auth' | 'onboarding' | 'consent' | 'guardian' | 'app';
export type GuardianState = 'none' | 'pending' | 'confirmed';

export type JourneyFacts = {
  signedIn: boolean;
  onboarded: boolean;
  /** Terms and privacy accepted at their current versions. */
  consentsCurrent: boolean;
  isYouth: boolean;
  guardian: GuardianState;
};

export function stageFor(facts: JourneyFacts): JourneyStage {
  if (!facts.signedIn) return 'auth';
  if (!facts.onboarded) return 'onboarding';
  if (!facts.consentsCurrent) return 'consent';
  if (facts.isYouth && facts.guardian === 'none') return 'guardian';
  return 'app';
}

/** Collapses a youth's guardian links into one state; any confirmed link wins. */
export function guardianStateFrom(statuses: readonly string[]): GuardianState {
  if (statuses.includes('confirmed')) return 'confirmed';
  if (statuses.includes('pending')) return 'pending';
  return 'none';
}

const STAGES: readonly JourneyStage[] = ['auth', 'onboarding', 'consent', 'guardian', 'app'];

/** Reads the stage `me()` returned; anything unexpected fails closed to onboarding. */
export function parseStage(value: unknown): JourneyStage {
  return STAGES.includes(value as JourneyStage) && value !== 'auth'
    ? (value as JourneyStage)
    : 'onboarding';
}
