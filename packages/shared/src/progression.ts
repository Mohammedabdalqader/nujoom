import type { AppConfig } from './config';

/**
 * Player progression helpers: stars tiers (spec §6.2), last-five form summary and the monthly
 * trend shown on the profile. Stars are reward points only; they never convert to money (D-006.1).
 */

export type StarsTier = 'bronze' | 'silver' | 'gold' | 'legend';

/** Tier by total stars ever earned (spending never lowers it). */
export function starsTier(totalEarned: number, stars: AppConfig['stars']): StarsTier {
  if (totalEarned >= stars.tier_legend) return 'legend';
  if (totalEarned >= stars.tier_gold) return 'gold';
  if (totalEarned >= stars.tier_silver) return 'silver';
  return 'bronze';
}

/** Stars still needed for the next tier, or null at the top tier. */
export function starsToNextTier(totalEarned: number, stars: AppConfig['stars']): number | null {
  const next = [stars.tier_silver, stars.tier_gold, stars.tier_legend].find((t) => t > totalEarned);
  return next === undefined ? null : next - totalEarned;
}

export type FormResult = { result: 'W' | 'D' | 'L' };

export function formSummary(results: readonly FormResult[]): { W: number; D: number; L: number } {
  const out = { W: 0, D: 0, L: 0 };
  for (const r of results) out[r.result] += 1;
  return out;
}

export type MonthProgress = {
  month: string;
  xp: number;
  goals: number;
  assists: number;
  matches: number;
};

/**
 * Goals-per-match change of the last three months against the three before, as a whole
 * percentage (e.g. +45). Null when either period has no matches.
 */
export function goalTrend(months: readonly MonthProgress[]): number | null {
  if (months.length < 6) return null;
  const rate = (slice: readonly MonthProgress[]) => {
    const matches = slice.reduce((n, m) => n + m.matches, 0);
    return matches ? slice.reduce((n, m) => n + m.goals, 0) / matches : null;
  };
  const before = rate(months.slice(-6, -3));
  const after = rate(months.slice(-3));
  if (before === null || after === null || before === 0) return null;
  return Math.round(((after - before) / before) * 100);
}

/** The month with the most goals (latest wins a tie), or null when there is no data. */
export function bestScoringMonth<T extends MonthProgress>(months: readonly T[]): T | null {
  let best: T | null = null;
  for (const m of months) if (!best || m.goals >= best.goals) best = m;
  return best;
}

/** Goals per match over all months, to two decimals. */
export function goalsPerMatch(months: readonly MonthProgress[]): number {
  const matches = months.reduce((n, m) => n + m.matches, 0);
  if (!matches) return 0;
  return Math.round((months.reduce((n, m) => n + m.goals, 0) / matches) * 100) / 100;
}
