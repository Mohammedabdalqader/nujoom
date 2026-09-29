import {
  DAY_KEYS,
  formatDateTime,
  halfHourTimes,
  type DayKey,
  type OpeningHours,
} from '@nujoom/shared';

import type { Locale } from '@/lib/i18n';

// A known week (Sunday 27 Sept 2026 … Saturday 3 Oct) to name the days in the viewer's language.
const DATE_OF: Record<DayKey, string> = {
  sun: '2026-09-27',
  mon: '2026-09-28',
  tue: '2026-09-29',
  wed: '2026-09-30',
  thu: '2026-10-01',
  fri: '2026-10-02',
  sat: '2026-10-03',
};
const STARTS = halfHourTimes('start');
const ENDS = halfHourTimes('end');

/**
 * The weekly opening hours inside the owner's save form (D-064): per day, open or closed, one
 * period and an optional second one (a break, e.g. Friday prayers). Plain form fields, read by the
 * confirmField action; times are Amman wall-clock and shown on the 12-hour clock (D-008).
 */
export function HoursFieldset({
  locale,
  hours,
  strings: s,
}: {
  locale: Locale;
  hours: OpeningHours | null;
  strings: { title: string; hint: string; open: string; second: string; midnight: string };
}) {
  const label = (hhmm: string) =>
    hhmm === '24:00'
      ? s.midnight
      : formatDateTime(`2026-09-27T${hhmm}:00+03:00`, locale, { timeStyle: 'short' });
  const select =
    'rounded-lg border border-border bg-surface-container-low px-2 py-1.5 text-sm text-on-surface';
  const options = (list: string[], empty: boolean) => (
    <>
      {empty ? <option value="">—</option> : null}
      {list.map((v) => (
        <option key={v} value={v}>
          {label(v)}
        </option>
      ))}
    </>
  );
  return (
    <fieldset className="flex flex-col gap-2 sm:col-span-2">
      <legend className="mb-1 text-sm font-bold">{s.title}</legend>
      <p className="text-xs text-on-surface-variant">{s.hint}</p>
      {DAY_KEYS.map((day) => {
        const ranges = hours?.[day] ?? [];
        const [first, second] = ranges;
        const name = formatDateTime(`${DATE_OF[day]}T12:00:00+03:00`, locale, { weekday: 'long' });
        return (
          <div
            key={day}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border/50 py-2 text-sm"
          >
            <label className="flex w-28 items-center gap-2">
              <input
                type="checkbox"
                name={`open_${day}`}
                defaultChecked={ranges.length > 0}
                aria-label={`${s.open}: ${name}`}
              />
              {name}
            </label>
            {/* Each period wraps as one unit on narrow screens. */}
            <span className="inline-flex items-center gap-1">
              <select
                name={`s1_${day}`}
                defaultValue={first?.[0] ?? '16:00'}
                className={select}
                aria-label={name}
              >
                {options(STARTS, false)}
              </select>
              <span aria-hidden>–</span>
              <select
                name={`e1_${day}`}
                defaultValue={first?.[1] ?? '24:00'}
                className={select}
                aria-label={name}
              >
                {options(ENDS, false)}
              </select>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="text-xs text-on-surface-variant">{s.second}</span>
              <select
                name={`s2_${day}`}
                defaultValue={second?.[0] ?? ''}
                className={select}
                aria-label={`${name}, ${s.second}`}
              >
                {options(STARTS, true)}
              </select>
              <span aria-hidden>–</span>
              <select
                name={`e2_${day}`}
                defaultValue={second?.[1] ?? ''}
                className={select}
                aria-label={`${name}, ${s.second}`}
              >
                {options(ENDS, true)}
              </select>
            </span>
          </div>
        );
      })}
    </fieldset>
  );
}
