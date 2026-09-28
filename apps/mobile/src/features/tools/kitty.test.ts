import { describe, expect, it } from 'vitest';

import type { KittyPlayer } from '@/data/types';

import { kittySummary, parseAmount, setMethod, shareOf, togglePaid } from './kitty';

const players = (paid: number, total: number): KittyPlayer[] =>
  Array.from({ length: total }, (_, i) => ({
    id: `p${i}`,
    name: `p${i}`,
    paid: i < paid ? 'cash' : null,
  }));

describe('pitch kitty', () => {
  it('parses amounts typed on Arabic or English keyboards', () => {
    expect(parseAmount('35')).toBe(35_000);
    expect(parseAmount('35.5')).toBe(35_500);
    expect(parseAmount('٣٥٫٥')).toBe(35_500);
    expect(parseAmount('2,25')).toBe(2_250);
    expect(parseAmount('')).toBe(0);
    expect(parseAmount('-3')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount('1.2345')).toBeNull();
  });

  it('rounds each share up to the next 0.01 JOD', () => {
    // The prototype's 40 JOD over 14 players: 2.857… → 2.86.
    expect(shareOf(40_000, 14)).toBe(2_860);
    expect(shareOf(30_000, 10)).toBe(3_000);
    expect(shareOf(40_000, 0)).toBe(0);
  });

  it('tracks what is collected and what is left', () => {
    expect(kittySummary(40_000, players(8, 14))).toEqual({
      share: 2_860,
      paid: 8,
      collected: 22_880,
      remaining: 17_120,
      percent: 57,
    });
    // Rounding up can over-collect slightly; nothing is ever "negative remaining".
    expect(kittySummary(40_000, players(14, 14))).toMatchObject({ remaining: 0, percent: 100 });
  });

  it('marks payments as cash or CliQ only', () => {
    const list = players(1, 2);
    expect(togglePaid(list, 'p1')[1]?.paid).toBe('cliq');
    expect(togglePaid(list, 'p0')[0]?.paid).toBeNull();
    expect(setMethod(list, 'p1', 'cash')[1]?.paid).toBe('cash');
  });
});
