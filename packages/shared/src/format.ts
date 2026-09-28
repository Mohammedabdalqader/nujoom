import { intlLocale, type Locale } from '@nujoom/i18n';

import { CURRENCY, TIMEZONE } from './constants';

/** Prices in JOD. Whole dinars show no decimals; fils show up to 3 decimals. */
export function formatCurrency(amount: number, locale: Locale): string {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: 'currency',
    currency: CURRENCY,
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(amount);
}

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(intlLocale(locale)).format(value);
}

/** Formats an instant in Amman time regardless of the device timezone. */
export function formatDateTime(
  instant: Date | string,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' },
): string {
  const date = typeof instant === 'string' ? new Date(instant) : instant;
  // 12-hour clock as the design shows it (D-008): "10:00 م" / "10:00 pm".
  return new Intl.DateTimeFormat(intlLocale(locale), {
    hourCycle: 'h12',
    ...options,
    timeZone: TIMEZONE,
  }).format(date);
}

/**
 * Wraps user-provided text (names) in a first-strong isolate (U+2068 … U+2069), so a Latin
 * name inside Arabic UI, or the reverse, keeps its own order and does not flip the alignment of
 * the surrounding line. React Native has no <bdi>; the web uses <bdi> instead.
 */
export function bidiIsolate(text: string): string {
  return `\u2068${text}\u2069`;
}
