import fs from 'node:fs';

import { describe, expect, it } from 'vitest';

import { normalizeEmail } from './email';
import { ERROR_KEYS, errorKey } from './errors';
import { guardianStateFrom, parseStage, stageFor, type JourneyFacts } from './journey';
import {
  consentPayload,
  dobFromParts,
  isYouthDob,
  normalizeDisplayName,
  normalizeHandle,
  validateConsentStep,
  validateProfileStep,
  type ProfileStepInput,
} from './onboarding';
import { safeAppResumePath, safeRedirectPath } from './redirect';
import { canViewProfile, youthVisibility } from './visibility';

const today = '2026-09-28';

describe('journey', () => {
  const adult: JourneyFacts = {
    signedIn: true,
    onboarded: true,
    consentsCurrent: true,
    isYouth: false,
    guardian: 'none',
  };

  it('walks auth → onboarding → consent → guardian → app', () => {
    expect(stageFor({ ...adult, signedIn: false })).toBe('auth');
    expect(stageFor({ ...adult, onboarded: false })).toBe('onboarding');
    expect(stageFor({ ...adult, consentsCurrent: false })).toBe('consent');
    expect(stageFor({ ...adult, isYouth: true })).toBe('guardian');
    expect(stageFor({ ...adult, isYouth: true, guardian: 'pending' })).toBe('app');
    expect(stageFor(adult)).toBe('app');
  });

  it('collapses guardian links and fails closed on unknown stages', () => {
    expect(guardianStateFrom(['revoked', 'pending'])).toBe('pending');
    expect(guardianStateFrom(['pending', 'confirmed'])).toBe('confirmed');
    expect(guardianStateFrom([])).toBe('none');
    expect(parseStage('guardian')).toBe('guardian');
    expect(parseStage('admin')).toBe('onboarding');
    expect(parseStage('auth')).toBe('onboarding');
  });

  it('mirrors the stage public.me() computes', () => {
    const sql = fs.readFileSync(
      new URL('../../../supabase/migrations/20260928000500_identity.sql', import.meta.url),
      'utf8',
    );
    // The SQL checks the same conditions in the same order.
    const order = ["'onboarding'", "then 'consent'", "then 'guardian'", "else 'app'"].map((s) =>
      sql.indexOf(s),
    );
    expect(order.every((i) => i > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
});

describe('onboarding', () => {
  const valid: ProfileStepInput = {
    displayName: 'Ahmad',
    dob: '2000-01-01',
    cityId: 1,
    neighborhoodId: 3,
    cityHasNeighborhoods: true,
    position: 'FWD',
    handle: '',
    shirtNumber: null,
  };

  it('accepts a complete profile', () => {
    expect(validateProfileStep(valid, { today })).toEqual([]);
  });

  it('reports each problem', () => {
    expect(
      validateProfileStep(
        { ...valid, displayName: ' A ', dob: null, cityId: null, position: null },
        { today },
      ),
    ).toEqual(['displayName', 'dob', 'city', 'position']);
    expect(validateProfileStep({ ...valid, dob: '2015-01-01' }, { today })).toEqual([
      'belowMinAge',
    ]);
    expect(validateProfileStep({ ...valid, dob: '2027-01-01' }, { today })).toEqual(['dob']);
    expect(validateProfileStep({ ...valid, neighborhoodId: null }, { today })).toEqual([
      'neighborhood',
    ]);
    expect(
      validateProfileStep(
        { ...valid, neighborhoodId: null, cityHasNeighborhoods: false },
        { today },
      ),
    ).toEqual([]);
    expect(validateProfileStep({ ...valid, handle: 'Bad Handle!' }, { today })).toEqual(['handle']);
    expect(validateProfileStep({ ...valid, shirtNumber: 100 }, { today })).toEqual(['shirtNumber']);
  });

  it('normalizes names, handles and dates', () => {
    expect(normalizeDisplayName('  Ahmad   Malki ')).toBe('Ahmad Malki');
    expect(normalizeHandle(' @Malki.87 ')).toBe('malki.87');
    expect(normalizeHandle('  ')).toBeNull();
    expect(dobFromParts('29', '2', '2008')).toBe('2008-02-29');
    expect(dobFromParts('29', '2', '2009')).toBeNull();
    expect(dobFromParts('31', '4', '2000')).toBeNull();
    expect(isYouthDob('2011-09-28', today)).toBe(true);
    expect(isYouthDob('2008-09-28', today)).toBe(false);
  });

  it('gates the account on terms and privacy only (C-010)', () => {
    expect(validateConsentStep({ terms: true, privacy: true, recording: null })).toEqual([]);
    expect(validateConsentStep({ terms: true, privacy: true, recording: false })).toEqual([]);
    expect(validateConsentStep({ terms: false, privacy: false, recording: true })).toEqual([
      'terms',
      'privacy',
    ]);
  });

  it('builds the complete_onboarding consent payload', () => {
    const v = { terms: 't1', privacy: 'p1', recording: 'r1' };
    expect(consentPayload({ terms: true, privacy: true, recording: true }, v)).toEqual({
      terms: 't1',
      privacy: 'p1',
      recording: 'r1',
    });
    expect(consentPayload({ terms: true, privacy: true, recording: false }, v)).toEqual({
      terms: 't1',
      privacy: 'p1',
      recording: false,
    });
    expect(consentPayload({ terms: true, privacy: true, recording: null }, v)).toEqual({
      terms: 't1',
      privacy: 'p1',
    });
  });
});

describe('errors', () => {
  it('maps SQL codes exactly', () => {
    expect(errorKey({ message: 'handle_taken', code: '23505' })).toBe('errors.profile.handleTaken');
    expect(errorKey({ message: 'consent_required' })).toBe('errors.consent.required');
    // A longer code is not mistaken for a shorter one it contains.
    expect(errorKey({ message: 'recording_consent_required' })).toBe('errors.generic');
  });

  it('maps Supabase Auth failures without revealing accounts', () => {
    expect(errorKey({ code: 'otp_expired', message: 'Token has expired or is invalid' })).toBe(
      'errors.auth.codeInvalid',
    );
    expect(errorKey({ message: 'Token has expired or is invalid' })).toBe(
      'errors.auth.codeInvalid',
    );
    expect(errorKey({ code: 'over_email_send_rate_limit', status: 429 })).toBe(
      'errors.auth.tooManyCodes',
    );
    expect(errorKey({ status: 429, message: 'Too many requests' })).toBe('errors.rateLimited');
    expect(errorKey({ code: 'email_address_not_authorized' })).toBe('errors.auth.emailUnavailable');
  });

  it('recognizes offline and unknown failures', () => {
    expect(errorKey(new TypeError('Network request failed'))).toBe('errors.network');
    expect(errorKey({ name: 'AuthRetryableFetchError', message: '' })).toBe('errors.network');
    expect(errorKey(null)).toBe('errors.generic');
    expect(errorKey('boom')).toBe('errors.generic');
    expect(errorKey({ message: 'toString', code: 'constructor' })).toBe('errors.generic');
  });

  it('has every key in both locales', () => {
    for (const locale of ['ar', 'en']) {
      const strings = JSON.parse(
        fs.readFileSync(new URL(`../../i18n/src/locales/${locale}.json`, import.meta.url), 'utf8'),
      ) as Record<string, unknown>;
      for (const key of ERROR_KEYS) {
        const value = key.split('.').reduce<unknown>((node, part) => {
          return node && typeof node === 'object'
            ? (node as Record<string, unknown>)[part]
            : undefined;
        }, strings);
        expect(typeof value, `${locale}: ${key}`).toBe('string');
      }
    }
  });
});

describe('email, redirects and visibility', () => {
  it('normalizes emails', () => {
    expect(normalizeEmail('  Parent@Example.COM ')).toBe('parent@example.com');
    expect(normalizeEmail('not-an-email')).toBeNull();
  });

  it('keeps redirects on known routes', () => {
    expect(safeRedirectPath('/ar/guardian', 'ar', '/ar')).toBe('/ar/guardian');
    expect(safeRedirectPath('//evil.example', 'ar', '/ar')).toBe('/ar');
    expect(safeRedirectPath('https://evil.example', 'ar', '/ar')).toBe('/ar');
    expect(safeRedirectPath('/en/x', 'ar', '/ar')).toBe('/ar');
    expect(safeAppResumePath('/j/abcdefghijklmnop1234?x=1')).toBe('/j/abcdefghijklmnop1234');
    expect(safeAppResumePath('/settings')).toBeNull();
    expect(safeAppResumePath('https://evil.example/j/abcdefghijklmnop')).toBeNull();
  });

  it('mirrors the database visibility rule', () => {
    const viewer = { viewerId: 'v', viewerCityId: 1, isAdmin: false, guardianOf: [] as string[] };
    const adult = { id: 'a', visibility: 'city' as const, isYouth: false, cityId: 1 };
    expect(canViewProfile(viewer, adult)).toBe(true);
    expect(canViewProfile({ ...viewer, viewerCityId: 2 }, adult)).toBe(false);
    expect(canViewProfile(viewer, { ...adult, isYouth: true })).toBe(false);
    expect(canViewProfile({ ...viewer, guardianOf: ['a'] }, { ...adult, isYouth: true })).toBe(
      true,
    );
    expect(canViewProfile({ ...viewer, viewerId: null }, adult)).toBe(false);
    expect(youthVisibility([])).toBe('private');
    expect(youthVisibility(['public', 'city'])).toBe('city');
  });
});
