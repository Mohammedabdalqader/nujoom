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

/** View and like counters as the design shows them in both languages: 842, 1.8k, 12k, 1.2m. */
export function compactCount(value: number): string {
  const abs = Math.abs(value);
  const fmt = (n: number, suffix: string) =>
    `${n >= 10 ? Math.round(n) : Math.round(n * 10) / 10}${suffix}`;
  if (abs >= 1_000_000) return fmt(value / 1_000_000, 'm');
  if (abs >= 1_000) return fmt(value / 1_000, 'k');
  return String(Math.round(value));
}

/** Countdown to kick-off as HH:MM:SS (never negative). */
export function formatCountdown(msLeft: number): string {
  const total = Math.max(0, Math.floor(msLeft / 1000));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}

/** Match clock as MM:SS from elapsed milliseconds (minutes keep counting past 59). */
export function formatMatchClock(msElapsed: number): string {
  const total = Math.max(0, Math.floor(msElapsed / 1000));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

/** "منذ ساعتين" / "2 hours ago" style relative time, using Intl's plural rules. */
export function formatRelativeTime(
  instant: Date | string,
  locale: Locale,
  now = new Date(),
): string {
  const date = typeof instant === 'string' ? new Date(instant) : instant;
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(intlLocale(locale), { numeric: 'auto' });
  const abs = Math.abs(seconds);
  if (abs < 60) return rtf.format(seconds, 'second');
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), 'minute');
  if (abs < 86_400) return rtf.format(Math.round(seconds / 3600), 'hour');
  if (abs < 7 * 86_400) return rtf.format(Math.round(seconds / 86_400), 'day');
  return rtf.format(Math.round(seconds / (7 * 86_400)), 'week');
}

/**
 * Initials as the design writes them: the first letter of the first two words, joined with a
 * dot in Arabic ("عمر المالكي" → "ع.م") and without in English ("Omar Malki" → "OM").
 */
export function initials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0)
    // Skip the Arabic article so "عمر الدوسري" becomes "ع.د" rather than "ع.ا".
    .map((w) => (w.startsWith('ال') && w.length > 2 ? w.slice(2) : w));
  const letters = words.slice(0, 2).map((w) => Array.from(w)[0] ?? '');
  const arabic = /[؀-ۿ]/.test(name);
  return arabic ? letters.join('.') : letters.join('').toUpperCase();
}
