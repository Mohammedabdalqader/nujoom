import { describe, expect, it } from 'vitest';

import type { SquadPlayer } from '@/data/types';

import {
  averageGap,
  guestForm,
  initialSplit,
  randomSplit,
  smallerSide,
  smartSplit,
  switchSide,
  teamAverage,
  toggleBench,
  tossCoin,
} from './squad';

const player = (id: string, form: number | null): SquadPlayer => ({
  id,
  name: id,
  avatarUrl: null,
  position: null,
  form,
});

// The prototype's roster: 8.6 down to 7.7.
const squad = [8.6, 8.5, 8.2, 8.4, 8.1, 8.3, 8.0, 7.9, 7.8, 7.7].map((f, i) => player(`p${i}`, f));

describe('squad splitter', () => {
  it('gives guests the roster average', () => {
    expect(guestForm([{ form: 8 }, { form: 7 }, { form: null }])).toBe(7.5);
    expect(guestForm([{ form: null }])).toBe(7);
    const split = initialSplit([player('a', 8), player('guest', null)]);
    expect(split.map((p) => [p.form, p.side])).toEqual([
      [8, 'blue'],
      [8, 'orange'],
    ]);
  });

  it('balances by form with the snake draft', () => {
    const split = smartSplit(initialSplit(squad));
    expect(split.filter((p) => p.side === 'blue')).toHaveLength(5);
    expect(split.filter((p) => p.side === 'orange')).toHaveLength(5);
    expect(averageGap(split)).toBeLessThanOrEqual(0.1);
  });

  it('keeps the bench out of every split', () => {
    const benched = toggleBench(initialSplit(squad), 'p0');
    expect(smartSplit(benched).find((p) => p.id === 'p0')?.side).toBe('bench');
    expect(randomSplit(benched, () => 0.3).find((p) => p.id === 'p0')?.side).toBe('bench');
  });

  it('shuffles into halves', () => {
    const split = randomSplit(initialSplit(squad.slice(0, 5)), () => 0.99);
    expect(split.filter((p) => p.side === 'blue')).toHaveLength(3);
    expect(split.filter((p) => p.side === 'orange')).toHaveLength(2);
  });

  it('switches kits and brings the bench back on the smaller side', () => {
    const start = initialSplit(squad.slice(0, 3)); // blue, orange, blue
    expect(switchSide(start, 'p1').find((p) => p.id === 'p1')?.side).toBe('blue');
    const benched = toggleBench(start, 'p0'); // blue 1, orange 1
    expect(smallerSide(benched)).toBe('blue');
    expect(toggleBench(benched, 'p0').find((p) => p.id === 'p0')?.side).toBe('blue');
  });

  it('averages each team to one decimal', () => {
    const split = initialSplit([player('a', 8.6), player('b', 8.5), player('c', 8.1)]);
    expect(teamAverage(split, 'blue')).toBe(8.4);
    expect(teamAverage(split, 'orange')).toBe(8.5);
    expect(teamAverage([], 'blue')).toBe(0);
  });

  it('tosses the coin', () => {
    expect(tossCoin(() => 0.2)).toBe('blue');
    expect(tossCoin(() => 0.7)).toBe('orange');
  });
});
