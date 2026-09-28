import i18next, { type i18n as I18nInstance, type InitOptions } from 'i18next';

import ar from './locales/ar.json';
import en from './locales/en.json';

export const LOCALES = ['ar', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

/** Arabic is the default and fallback locale (spec §1). */
export const DEFAULT_LOCALE: Locale = 'ar';

export type Direction = 'rtl' | 'ltr';

export const resources = {
  ar: { translation: ar },
  en: { translation: en },
} as const;

export type TranslationResources = typeof en;

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export function getDirection(locale: Locale): Direction {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

/**
 * Picks the best supported locale from a list of preferred language tags
 * (e.g. from Accept-Language or the device settings). Falls back to Arabic.
 */
export function resolveLocale(preferred: readonly (string | null | undefined)[]): Locale {
  for (const tag of preferred) {
    const base = tag?.toLowerCase().split(/[-_]/)[0];
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}

/**
 * BCP 47 tag for Intl formatting. Arabic uses Western digits (0-9), which is what
 * Jordanian apps and receipts use; plain `ar` would render Arabic-Indic digits.
 */
export function intlLocale(locale: Locale): string {
  return locale === 'ar' ? 'ar-JO-u-nu-latn' : 'en-GB';
}

export const baseInitOptions = {
  resources,
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: [...LOCALES],
  interpolation: { escapeValue: false },
  returnNull: false,
} satisfies InitOptions;

/**
 * Creates an isolated, synchronously initialised i18next instance. Isolated
 * instances keep concurrent server requests in different languages apart.
 */
export function createI18n(locale: Locale, extra: InitOptions = {}): I18nInstance {
  const instance = i18next.createInstance();
  void instance.init({ ...baseInitOptions, ...extra, lng: locale, initAsync: false });
  return instance;
}

export { ar, en };
