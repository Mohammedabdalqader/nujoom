import { createI18n, getDirection, isLocale, LOCALES, type Locale } from '@nujoom/i18n';
import { notFound } from 'next/navigation';

export { getDirection, LOCALES, type Locale };

/** The route's locale segment, or a 404 for anything that isn't `ar` or `en`. */
export function localeFrom(value: string): Locale {
  if (!isLocale(value)) notFound();
  return value;
}

// One isolated i18next instance per locale; the language never changes on an instance, so
// concurrent requests in different languages can't interfere.
const instances = new Map<Locale, ReturnType<typeof createI18n>>();

export function getT(locale: Locale) {
  let i18n = instances.get(locale);
  if (!i18n) {
    i18n = createI18n(locale);
    instances.set(locale, i18n);
  }
  return i18n.getFixedT(locale);
}

export const otherLocale = (locale: Locale): Locale => (locale === 'ar' ? 'en' : 'ar');
