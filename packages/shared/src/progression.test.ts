import { describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG } from './config';
import {
  bestScoringMonth,
  formSummary,
  goalsPerMatch,
  goalTrend,
  starsTier,
  starsToNextTier,
} from './progression';

const stars = DEFAULT_CONFIG.stars;

describe('stars tiers', () => {
  it('climbs by total earned', () => {
    expect(starsTier(0, stars)).toBe('bronze');
    expect(starsTier(299, stars)).toBe('bronze');
    expect(starsTier(300, stars)).toBe('silver');
    expect(starsTier(1320, stars)).toBe('gold');
    expect(starsTier(3000, stars)).toBe('legend');
  });

  it('counts what is left to the next tier', () => {
    expect(starsToNextTier(1320, stars)).toBe(1680);
    expect(starsToNextTier(5000, stars)).toBeNull();
  });
});

describe('form and trends', () => {
  const months = [
    { month: '2026-04', xp: 1150, goals: 7, assists: 3, matches: 6 },
    { month: '2026-05', xp: 1480, goals: 9, assists: 4, matches: 8 },
    { month: '2026-06', xp: 1820, goals: 12, assists: 5, matches: 9 },
    { month: '2026-07', xp: 2150, goals: 14, assists: 4, matches: 10 },
    { month: '2026-08', xp: 2490, goals: 11, assists: 3, matches: 7 },
    { month: '2026-09', xp: 2840, goals: 14, assists: 5, matches: 8 },
  ];

  it('summarises the last five results', () => {
    expect(
      formSummary([{ result: 'W' }, { result: 'W' }, { result: 'D' }, { result: 'L' }]),
    ).toEqual({
      W: 2,
      D: 1,
      L: 1,
    });
  });

  it('compares goals per match across three-month halves', () => {
    // before: 28 goals / 23 matches ≈ 1.217; after: 39 / 25 = 1.56 → +28 %
    expect(goalTrend(months)).toBe(28);
    expect(goalTrend(months.slice(0, 5))).toBeNull();
  });

  it('finds the best month and the scoring rate', () => {
    expect(bestScoringMonth(months)?.month).toBe('2026-09');
    expect(goalsPerMatch(months)).toBe(1.4);
    expect(goalsPerMatch([])).toBe(0);
  });
});
