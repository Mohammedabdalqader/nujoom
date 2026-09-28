import { dateInAmman, formatDateTime, formatRelativeTime } from '@nujoom/shared';
import type { TFunction } from 'i18next';

import type { Locale } from '@nujoom/i18n';

/**
 * "الليلة • 8:30 م (خلال ساعتين)": the day word (tonight/today/tomorrow/weekday), the Amman time
 * and a relative hint, as the design writes upcoming kick-offs.
 */
export function describeKickoff(
  iso: string,
  locale: Locale,
  t: TFunction,
  now = new Date(),
): string {
  const start = new Date(iso);
  const today = dateInAmman(now);
  const tomorrow = dateInAmman(new Date(now.getTime() + 86_400_000));
  const day = dateInAmman(start);
  const hourInAmman = Number(
    formatDateTime(start, 'en', { hour: 'numeric', hourCycle: 'h23' }).replace(/\D/g, ''),
  );
  const dayWord =
    day === today
      ? t(hourInAmman >= 17 ? 'home.missing.tonight' : 'home.missing.today')
      : day === tomorrow
        ? t('home.missing.tomorrow')
        : formatDateTime(start, locale, { weekday: 'long' });
  return t('home.missing.when', {
    day: dayWord,
    time: formatDateTime(start, locale, { hour: 'numeric', minute: '2-digit' }),
    relative: formatRelativeTime(start, locale, now),
  });
}
