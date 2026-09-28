import { describe, expect, it } from 'vitest';

import {
  ar,
  createI18n,
  en,
  getDirection,
  intlLocale,
  isLocale,
  LOCALES,
  resolveLocale,
} from './index';

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out[path] = value;
    else Object.assign(out, flatten(value, path));
  }
  return out;
}

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;
const arFlat = flatten(ar);
const enFlat = flatten(en);

/** Keys with plural suffixes collapsed to their base key. */
function baseKeys(flat: Record<string, string>): Set<string> {
  return new Set(Object.keys(flat).map((key) => key.replace(PLURAL_SUFFIX, '')));
}

/** The distinct variables a string interpolates (a language may repeat one, e.g. "5 ضد 5"). */
function placeholders(value: string): string[] {
  return [...new Set([...value.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1] ?? ''))].sort();
}

describe('translation files', () => {
  it('Arabic and English define the same keys', () => {
    expect([...baseKeys(arFlat)].sort()).toEqual([...baseKeys(enFlat)].sort());
  });

  it('has no empty strings', () => {
    for (const [key, value] of Object.entries({ ...arFlat, ...enFlat })) {
      expect(value.trim(), key).not.toBe('');
    }
  });

  it('Arabic plurals define all six CLDR forms', () => {
    const pluralBases = new Set(
      Object.keys(arFlat)
        .filter((key) => PLURAL_SUFFIX.test(key))
        .map((key) => key.replace(PLURAL_SUFFIX, '')),
    );
    for (const base of pluralBases) {
      for (const form of ['zero', 'one', 'two', 'few', 'many', 'other']) {
        expect(arFlat, `${base}_${form}`).toHaveProperty([`${base}_${form}`]);
      }
    }
  });

  it('uses the same interpolation variables in both languages', () => {
    for (const [key, enValue] of Object.entries(enFlat)) {
      if (PLURAL_SUFFIX.test(key)) continue;
      const arValue = arFlat[key];
      expect(arValue, key).toBeDefined();
      expect(placeholders(arValue ?? ''), key).toEqual(placeholders(enValue));
    }
  });
});

describe('locale helpers', () => {
  it('Arabic is RTL and English is LTR', () => {
    expect(getDirection('ar')).toBe('rtl');
    expect(getDirection('en')).toBe('ltr');
  });

  it('validates locales', () => {
    expect(LOCALES).toEqual(['ar', 'en']);
    expect(isLocale('ar')).toBe(true);
    expect(isLocale('fr')).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });

  it('resolves preferred tags and falls back to Arabic', () => {
    expect(resolveLocale(['en-US', 'ar'])).toBe('en');
    expect(resolveLocale(['ar_JO'])).toBe('ar');
    expect(resolveLocale(['fr-FR', null])).toBe('ar');
    expect(resolveLocale([])).toBe('ar');
  });

  it('formats numbers with Western digits in Arabic', () => {
    expect(new Intl.NumberFormat(intlLocale('ar')).format(1234)).toMatch(/1.?234/);
  });
});

describe('createI18n', () => {
  it('translates and pluralises Arabic', () => {
    const i18n = createI18n('ar');
    expect(i18n.t('common.beta')).toBe('تجريبي');
    expect(i18n.t('common.players', { count: 0 })).toBe('لا يوجد لاعبون');
    expect(i18n.t('common.players', { count: 2 })).toBe('لاعبان');
    expect(i18n.t('common.players', { count: 5 })).toBe('5 لاعبين');
    expect(i18n.t('common.players', { count: 11 })).toBe('11 لاعباً');
    expect(i18n.t('common.players', { count: 100 })).toBe('100 لاعب');
  });

  it('keeps instances isolated', () => {
    const arabic = createI18n('ar');
    const english = createI18n('en');
    expect(arabic.t('app.name')).toBe('نجوم الحارة');
    expect(english.t('app.name')).toBe('Nujoom al-Hara');
    expect(english.t('common.players', { count: 1 })).toBe('1 player');
  });
});
