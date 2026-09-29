import { describe, expect, it } from 'vitest';

import {
  autoBalance,
  dayKeyOf,
  generateSlots,
  isValidOpeningHours,
  maxPlayers,
  nextDates,
  slotState,
  teamRatingGap,
  endsAfter,
  halfHourTimes,
  hoursOn,
  joinTokenFromPath,
} from './booking';

describe('opening hours', () => {
  it('validates the stored shape', () => {
    expect(isValidOpeningHours({ sun: [['16:00', '24:00']] })).toBe(true);
    expect(isValidOpeningHours({ sun: [['18:00', '16:00']] })).toBe(false);
    expect(isValidOpeningHours({ funday: [['10:00', '12:00']] })).toBe(false);
    expect(isValidOpeningHours({ sun: [['24:00', '24:00']] })).toBe(false);
    expect(isValidOpeningHours([])).toBe(false);
  });

  it('matches the database: split days in order, no overlaps (D-063)', () => {
    expect(
      isValidOpeningHours({
        fri: [
          ['10:00', '13:00'],
          ['15:00', '23:30'],
        ],
        sat: [],
      }),
    ).toBe(true);
    expect(
      isValidOpeningHours({
        sun: [
          ['10:00', '13:00'],
          ['13:00', '14:00'],
        ],
      }),
    ).toBe(true);
    expect(
      isValidOpeningHours({
        sun: [
          ['10:00', '13:00'],
          ['12:00', '14:00'],
        ],
      }),
    ).toBe(false);
    expect(
      isValidOpeningHours({
        sun: [
          ['15:00', '18:00'],
          ['10:00', '12:00'],
        ],
      }),
    ).toBe(false);
    expect(isValidOpeningHours({ sun: [['9:00', '12:00']] })).toBe(false);
    expect(isValidOpeningHours({ sun: [['10:00']] })).toBe(false);
    expect(isValidOpeningHours({ sun: '10:00-12:00' })).toBe(false);
  });

  it('finds the weekday of a date', () => {
    expect(dayKeyOf('2026-09-27')).toBe('sun');
    expect(dayKeyOf('2026-10-02')).toBe('fri');
  });
});

describe('generateSlots', () => {
  const hours = {
    sun: [['16:00', '24:00']] as [string, string][],
    fri: [['14:30', '23:30']] as [string, string][],
  };

  it('builds hourly slots in Amman time up to midnight', () => {
    const slots = generateSlots(hours, 60, '2026-09-27');
    expect(slots).toHaveLength(8);
    expect(slots[0]).toEqual({
      startsAt: '2026-09-27T13:00:00.000Z',
      endsAt: '2026-09-27T14:00:00.000Z',
      label: '16:00',
    });
    expect(slots.at(-1)?.label).toBe('23:00');
    expect(slots.at(-1)?.endsAt).toBe('2026-09-27T21:00:00.000Z');
  });

  it('aligns 90-minute slots to the opening time and drops partial slots', () => {
    const slots = generateSlots(hours, 90, '2026-10-02');
    expect(slots.map((s) => s.label)).toEqual([
      '14:30',
      '16:00',
      '17:30',
      '19:00',
      '20:30',
      '22:00',
    ]);
  });

  it('returns nothing on closed days', () => {
    expect(generateSlots(hours, 60, '2026-09-28')).toEqual([]);
  });
});

describe('slotState', () => {
  const slot = {
    startsAt: '2026-09-27T15:00:00.000Z',
    endsAt: '2026-09-27T16:00:00.000Z',
    label: '18:00',
  };
  const before = new Date('2026-09-27T10:00:00Z');

  it('marks free, busy and past slots', () => {
    expect(slotState(slot, [], before)).toBe('free');
    expect(
      slotState(
        slot,
        [{ starts_at: '2026-09-27T15:00:00Z', ends_at: '2026-09-27T16:00:00Z' }],
        before,
      ),
    ).toBe('busy');
    expect(
      slotState(
        slot,
        [{ starts_at: '2026-09-27T14:30:00Z', ends_at: '2026-09-27T15:30:00Z' }],
        before,
      ),
    ).toBe('busy');
    expect(
      slotState(
        slot,
        [{ starts_at: '2026-09-27T16:00:00Z', ends_at: '2026-09-27T17:00:00Z' }],
        before,
      ),
    ).toBe('free');
    expect(slotState(slot, [], new Date('2026-09-27T15:30:00Z'))).toBe('past');
  });
});

describe('dates and capacity', () => {
  it('lists the next days across month ends', () => {
    expect(nextDates('2026-09-29', 4)).toEqual([
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
    ]);
  });

  it('allows two substitutes per side', () => {
    expect(maxPlayers(5)).toBe(12);
    expect(maxPlayers(7)).toBe(16);
  });
});

describe('autoBalance', () => {
  it('snake-drafts by rating and numbers bibs per team', () => {
    const players = [
      { userId: 'a', rating: 1200 },
      { userId: 'b', rating: 1150 },
      { userId: 'c', rating: 1100 },
      { userId: 'd', rating: 1050 },
      { userId: 'e', rating: 1000 },
      { userId: 'f', rating: 950 },
    ];
    const result = autoBalance(players);
    expect(result).toEqual([
      { user_id: 'a', team: 'A', bib: 1 },
      { user_id: 'b', team: 'B', bib: 1 },
      { user_id: 'c', team: 'B', bib: 2 },
      { user_id: 'd', team: 'A', bib: 2 },
      { user_id: 'e', team: 'A', bib: 3 },
      { user_id: 'f', team: 'B', bib: 3 },
    ]);
    const ratings = Object.fromEntries(players.map((p) => [p.userId, p.rating]));
    expect(teamRatingGap(result, ratings)).toBe(50);
  });

  it('keeps team sizes within one and is deterministic without ratings', () => {
    const players = ['p1', 'p2', 'p3', 'p4', 'p5'].map((userId) => ({ userId }));
    const result = autoBalance(players);
    const sizes = { A: 0, B: 0 };
    result.forEach((a) => (sizes[a.team] += 1));
    expect(Math.abs(sizes.A - sizes.B)).toBeLessThanOrEqual(1);
    expect(autoBalance(players)).toEqual(result);
    expect(result[0]).toEqual({ user_id: 'p1', team: 'A', bib: 1 });
  });
});

describe('halfHourTimes', () => {
  it('lists 24-hour start times from 00:00 to 23:30', () => {
    const starts = halfHourTimes('start');
    expect(starts).toHaveLength(48);
    expect(starts[0]).toBe('00:00');
    expect(starts.at(-1)).toBe('23:30');
    expect(starts).toContain('16:00');
  });

  it('lists end times from 00:30 up to midnight as 24:00', () => {
    const ends = halfHourTimes('end');
    expect(ends).toHaveLength(48);
    expect(ends[0]).toBe('00:30');
    expect(ends.at(-1)).toBe('24:00');
  });
});

describe('endsAfter', () => {
  it('requires the end to be later than the start', () => {
    expect(endsAfter('16:00', '24:00')).toBe(true);
    expect(endsAfter('16:00', '16:00')).toBe(false);
    expect(endsAfter('18:00', '17:30')).toBe(false);
  });
});

describe('hoursOn', () => {
  const hours = {
    sun: [['16:00', '24:00']],
    fri: [
      ['10:00', '13:00'],
      ['15:00', '23:00'],
    ],
  } as const;

  it('returns every opening interval for the weekday of the date', () => {
    expect(hoursOn(hours as never, '2026-09-27')).toEqual([['16:00', '24:00']]); // Sunday
    // Friday is split: the 13:00–15:00 closure must stay visible.
    expect(hoursOn(hours as never, '2026-10-02')).toEqual([
      ['10:00', '13:00'],
      ['15:00', '23:00'],
    ]);
  });

  it('returns null on a closed day', () => {
    expect(hoursOn(hours as never, '2026-09-28')).toBeNull(); // Monday
  });
});

describe('joinTokenFromPath', () => {
  const token = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

  it('reads the token from app and web invite paths', () => {
    expect(joinTokenFromPath(`nujoom://join/${token}`)).toBe(token);
    expect(joinTokenFromPath(`/join/${token}`)).toBe(token);
    expect(joinTokenFromPath(`https://example.com/ar/j/${token}?x=1`)).toBe(token);
  });

  it('ignores other paths and malformed tokens', () => {
    expect(joinTokenFromPath('/pitches')).toBeNull();
    expect(joinTokenFromPath('/join/short')).toBeNull();
    expect(joinTokenFromPath(`/join/${token}/../x`)).toBe(token);
    expect(joinTokenFromPath('/join/has spaces in it here')).toBeNull();
    expect(joinTokenFromPath(`/rejoin/${token}`)).toBeNull();
  });
});
