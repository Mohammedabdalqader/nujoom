import { autoBalance } from '@nujoom/shared';

import type { KitColor, SquadPlayer } from '@/data/types';

/** Where a player stands in the splitter: one of the two kits, or the bench. */
export type Side = KitColor | 'bench';

export type SplitPlayer = SquadPlayer & { side: Side; form: number };

/** Form given to a walk-in with no profile: the roster average, so a guest never tilts the split. */
export function guestForm(players: readonly { form: number | null }[]): number {
  const known = players.map((p) => p.form).filter((f): f is number => f !== null);
  if (!known.length) return 7;
  return Math.round((known.reduce((a, b) => a + b, 0) / known.length) * 10) / 10;
}

/** The starting line-up: rated players keep their form, and the rest get the guest form, alternating kits. */
export function initialSplit(squad: readonly SquadPlayer[]): SplitPlayer[] {
  const fallback = guestForm(squad);
  return squad.map((p, i) => ({
    ...p,
    form: p.form ?? fallback,
    side: i % 2 === 0 ? 'blue' : 'orange',
  }));
}

export function teamAverage(players: readonly SplitPlayer[], side: KitColor): number {
  const team = players.filter((p) => p.side === side);
  if (!team.length) return 0;
  return Math.round((team.reduce((a, p) => a + p.form, 0) / team.length) * 10) / 10;
}

/** "موزون تماماً" when the averages are within this gap. */
export const BALANCED_GAP = 0.2;

export function averageGap(players: readonly SplitPlayer[]): number {
  return (
    Math.round(Math.abs(teamAverage(players, 'blue') - teamAverage(players, 'orange')) * 10) / 10
  );
}

/** "تقسيم ذكي متوازن": the booking's snake draft by form (spec §6.4 auto-balance); the bench stays out. */
export function smartSplit(players: readonly SplitPlayer[]): SplitPlayer[] {
  const active = players.filter((p) => p.side !== 'bench');
  const teams = new Map(
    autoBalance(active.map((p) => ({ userId: p.id, rating: p.form }))).map((a) => [
      a.user_id,
      a.team,
    ]),
  );
  return players.map((p) =>
    p.side === 'bench' ? p : { ...p, side: teams.get(p.id) === 'A' ? 'blue' : 'orange' },
  );
}

/** "قرعة عشوائية كاملة": a fair shuffle (Fisher–Yates), first half blue. */
export function randomSplit(
  players: readonly SplitPlayer[],
  random: () => number = Math.random,
): SplitPlayer[] {
  const ids = players.filter((p) => p.side !== 'bench').map((p) => p.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
  }
  const blue = new Set(ids.slice(0, Math.ceil(ids.length / 2)));
  return players.map((p) =>
    p.side === 'bench' ? p : { ...p, side: blue.has(p.id) ? 'blue' : 'orange' },
  );
}

/** Moves a player to the other kit; a benched player comes on for blue. */
export function switchSide(players: readonly SplitPlayer[], id: string): SplitPlayer[] {
  return players.map((p) =>
    p.id !== id ? p : { ...p, side: p.side === 'blue' ? 'orange' : 'blue' },
  );
}

export function toggleBench(players: readonly SplitPlayer[], id: string): SplitPlayer[] {
  return players.map((p) =>
    p.id !== id ? p : { ...p, side: p.side === 'bench' ? smallerSide(players) : 'bench' },
  );
}

/** The kit with fewer players (blue on a tie), where a new or returning player goes. */
export function smallerSide(players: readonly SplitPlayer[]): KitColor {
  const count = (side: KitColor) => players.filter((p) => p.side === side).length;
  return count('blue') <= count('orange') ? 'blue' : 'orange';
}

export function tossCoin(random: () => number = Math.random): KitColor {
  return random() < 0.5 ? 'blue' : 'orange';
}
