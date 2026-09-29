import { describe, expect, it } from 'vitest';

import {
  amenitiesKey,
  dayRows,
  nextAmenities,
  parseDimension,
  parseFieldLabel,
  type ScheduleEntry,
} from './venue';

describe('amenitiesKey', () => {
  it('tells unknown from checked-none and ignores order', () => {
    expect(amenitiesKey(null)).toBe('unknown');
    expect(amenitiesKey(undefined)).toBe('unknown');
    expect(amenitiesKey([])).toBe('');
    expect(amenitiesKey(['water', 'parking', 'water'])).toBe('parking,water');
  });
});

describe('nextAmenities (D-066)', () => {
  it('saves what the owner ticked, cleaned and sorted', () => {
    expect(nextAmenities(['water', 'parking', 'jacuzzi', 'water'], false, 'unknown')).toEqual([
      'parking',
      'water',
    ]);
  });

  it('keeps an unknown list unknown when nothing is ticked', () => {
    expect(nextAmenities([], false, 'unknown')).toBeNull();
  });

  it('records "none" only when the owner says so, or when unticking a known list', () => {
    expect(nextAmenities([], true, 'unknown')).toEqual([]);
    expect(nextAmenities([], false, 'parking')).toEqual([]);
  });

  it('sends nothing when the list is unchanged', () => {
    expect(nextAmenities(['water', 'parking'], false, 'parking,water')).toBeNull();
    expect(nextAmenities([], true, '')).toBeNull();
  });

  it('lets ticked items win over "none of these"', () => {
    expect(nextAmenities(['toilets'], true, '')).toEqual(['toilets']);
  });
});

describe('parseDimension (D-067)', () => {
  it('reads metres as typed on a phone', () => {
    expect(parseDimension('length_m', '40')).toBe(40);
    expect(parseDimension('width_m', ' 20,5 ')).toBe(20.5);
    expect(parseDimension('length_m', '٤٠')).toBe(40);
    expect(parseDimension('width_m', '٢٠٫٥')).toBe(20.5);
    expect(parseDimension('length_m', '38.46')).toBe(38.5);
  });

  it('leaves an empty box alone and refuses the impossible', () => {
    expect(parseDimension('length_m', '')).toBeNull();
    expect(parseDimension('length_m', '400')).toBe('invalid');
    expect(parseDimension('width_m', '2')).toBe('invalid');
    expect(parseDimension('width_m', '-20')).toBe('invalid');
    expect(parseDimension('width_m', '20m')).toBe('invalid');
  });
});

describe('parseFieldLabel (D-067)', () => {
  it('tidies spaces, keeps empty as unchanged, caps the length', () => {
    expect(parseFieldLabel('  الملعب   الكبير ')).toBe('الملعب الكبير');
    expect(parseFieldLabel('   ')).toBeNull();
    expect(parseFieldLabel('x'.repeat(61))).toBe('invalid');
  });
});

describe('dayRows (D-073)', () => {
  const hours = { tue: [['16:00', '20:00']] as [string, string][] };
  const date = '2026-09-29'; // a Tuesday
  const t = (hhmm: string) => new Date(`${date}T${hhmm}:00+03:00`).toISOString();
  const entry = (
    id: string,
    from: string,
    to: string,
    extra: Partial<ScheduleEntry> = {},
  ): ScheduleEntry => ({
    id,
    pitch_id: 'p',
    kind: 'app',
    status: 'confirmed',
    starts_at: t(from),
    ends_at: t(to),
    ...extra,
  });

  it('merges free slots with bookings and blocks in time order', () => {
    const rows = dayRows(
      hours,
      60,
      date,
      [entry('b', '17:00', '18:00'), entry('k', '18:00', '20:00', { kind: 'block' })],
      new Date(`${date}T00:00:00+03:00`),
    );
    expect(
      rows.map((r) => (r.type === 'free' ? `free ${r.startsAt}` : `${r.entry.kind} ${r.entry.id}`)),
    ).toEqual([`free ${t('16:00')}`, 'app b', 'block k']);
  });

  it('ignores cancelled bookings (their time is free again)', () => {
    const rows = dayRows(
      hours,
      60,
      date,
      [entry('c', '17:00', '18:00', { status: 'cancelled' })],
      new Date(0),
    );
    expect(rows.filter((r) => r.type === 'free')).toHaveLength(4);
  });

  it('marks past free slots and started bookings', () => {
    const rows = dayRows(
      hours,
      60,
      date,
      [entry('b', '16:00', '17:00')],
      new Date(`${date}T17:30:00+03:00`),
    );
    expect(rows[0]).toMatchObject({ type: 'entry', started: true });
    expect(rows.find((r) => r.type === 'free' && r.startsAt === t('17:00'))).toMatchObject({
      past: true,
    });
    expect(rows.find((r) => r.type === 'free' && r.startsAt === t('18:00'))).toMatchObject({
      past: false,
    });
  });

  it('still shows a booking that no longer fits the hours', () => {
    const rows = dayRows(hours, 60, date, [entry('late', '21:00', '22:00')], new Date(0));
    expect(rows.at(-1)).toMatchObject({ type: 'entry' });
  });
});
