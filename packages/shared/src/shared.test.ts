import { ar, en } from '@nujoom/i18n';
import { describe, expect, it } from 'vitest';

import { ageGroupFor, ageOn, currentAge, dateInAmman, isYouthAge, needsGuardian } from './age';
import { APP_NAME } from './constants';
import { bidiIsolate, formatCurrency, formatDateTime } from './format';

describe('APP_NAME', () => {
  it('matches the translated app name', () => {
    expect(APP_NAME.ar).toBe(ar.app.name);
    expect(APP_NAME.en).toBe(en.app.name);
  });
});

describe('age', () => {
  it('counts whole years and handles birthdays', () => {
    expect(ageOn('2010-05-20', '2026-05-19')).toBe(15);
    expect(ageOn('2010-05-20', '2026-05-20')).toBe(16);
    expect(ageOn('2008-12-31', '2026-12-31')).toBe(18);
  });

  it('treats 29 February birthdays as 1 March in non-leap years', () => {
    expect(ageOn('2008-02-29', '2026-02-28')).toBe(17);
    expect(ageOn('2008-02-29', '2026-03-01')).toBe(18);
  });

  it('rejects malformed dates', () => {
    expect(() => ageOn('20/05/2010', '2026-01-01')).toThrow();
  });

  it('uses the Amman calendar date', () => {
    // 22:30 UTC on 31 Dec is already 1 Jan in Amman (UTC+3).
    expect(dateInAmman(new Date('2025-12-31T22:30:00Z'))).toBe('2026-01-01');
    expect(currentAge('2008-01-01', new Date('2025-12-31T22:30:00Z'))).toBe(18);
  });

  it('maps ages to groups at the boundaries', () => {
    expect(ageGroupFor(11)).toBe('U12');
    expect(ageGroupFor(13)).toBe('U14');
    expect(ageGroupFor(14)).toBe('U16');
    expect(ageGroupFor(17)).toBe('U18');
    expect(ageGroupFor(18)).toBe('ADULT');
    expect(isYouthAge(17)).toBe(true);
    expect(isYouthAge(18)).toBe(false);
  });

  it('needs a guardian until the 18th birthday in Amman', () => {
    expect(needsGuardian('2008-09-29', new Date('2026-09-28T12:00:00Z'))).toBe(true);
    expect(needsGuardian('2008-09-28', new Date('2026-09-28T12:00:00Z'))).toBe(false);
  });
});

describe('format', () => {
  it('formats JOD with Western digits in both languages', () => {
    expect(formatCurrency(25, 'en')).toMatch(/JOD\s?25$/);
    expect(formatCurrency(25, 'ar')).toMatch(/25/);
    expect(formatCurrency(7.5, 'en')).toContain('7.5');
    expect(formatCurrency(25, 'ar')).not.toMatch(/[٠-٩]/);
  });

  it('formats times in Amman time on the 12-hour clock', () => {
    const opts = { hour: 'numeric', minute: '2-digit' } as const;
    expect(formatDateTime('2026-06-01T19:00:00Z', 'en', opts)).toMatch(/^10:00\s?pm$/i);
    const arText = formatDateTime('2026-06-01T19:00:00Z', 'ar', opts);
    expect(arText).toContain('10:00');
    expect(arText).toContain('م');
  });
});

describe('bidiIsolate', () => {
  it('wraps text in a first-strong isolate', () => {
    expect(bidiIsolate('Sami خالد')).toBe('⁨Sami خالد⁩');
  });
});
