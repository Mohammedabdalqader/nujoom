import type { Locale } from '@nujoom/i18n';
import {
  compactCount,
  formatCurrency,
  formatDateTime,
  formatNumber,
  formatRelativeTime,
} from '@nujoom/shared';
import { useTranslation } from 'react-i18next';

import type { Bilingual } from '@/data/types';

/** Current locale plus the formatters every screen uses (Amman time, Western digits, D-008). */
export function useLocale() {
  const { i18n, t } = useTranslation();
  const locale: Locale = i18n.language === 'en' ? 'en' : 'ar';
  return {
    t,
    locale,
    rtl: locale === 'ar',
    pick: (value: Bilingual) => value[locale],
    number: (n: number) => formatNumber(n, locale),
    compact: compactCount,
    money: (n: number) => formatCurrency(n, locale),
    /** "2.5 JOD": the design's compact price label, used in both languages. */
    jod: (n: number) => `${formatNumber(n, locale)} JOD`,
    time: (iso: string) => formatDateTime(iso, locale, { hour: 'numeric', minute: '2-digit' }),
    day: (iso: string) => formatDateTime(iso, locale, { weekday: 'long' }),
    date: (iso: string) => formatDateTime(iso, locale, { day: 'numeric', month: 'long' }),
    ago: (iso: string) => formatRelativeTime(iso, locale),
    /** A rating to show, or "—" when the player isn't rated yet (C-007). */
    score: (value: number | null, digits = 1) =>
      value === null ? t('common.noValue') : value.toFixed(digits),
  };
}
