import type { KittyPlayer } from '@/data/types';

/**
 * The pitch kitty ("القطية"). Amounts are whole fils (1 JOD = 1000 fils) so shares never drift
 * by floating-point error. Stars never pay for anything (D-006.1): payments are cash or CliQ.
 */

export const FILS_PER_JOD = 1000;

const ARABIC_DIGITS = /[٠-٩۰-۹]/g;

/** "35", "35.5", "٣٥٫٥" or "35,5" → fils, or null for anything else (negative, text, >3 decimals). */
export function parseAmount(input: string): number | null {
  const western = input
    .trim()
    .replace(ARABIC_DIGITS, (d) => {
      const code = d.charCodeAt(0);
      return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
    })
    .replace(/[٫,]/g, '.');
  if (!/^\d{1,5}(\.\d{0,3})?$/.test(western)) return western === '' ? 0 : null;
  return Math.round(Number(western) * FILS_PER_JOD);
}

export function filsToJod(fils: number): number {
  return fils / FILS_PER_JOD;
}

/** Each player's share, rounded up to the next 10 fils (0.01 JOD) so the kitty is never short. */
export function shareOf(totalFils: number, players: number): number {
  if (players <= 0 || totalFils <= 0) return 0;
  return Math.ceil(totalFils / players / 10) * 10;
}

export function kittySummary(totalFils: number, players: readonly KittyPlayer[]) {
  const share = shareOf(totalFils, players.length);
  const paid = players.filter((p) => p.paid !== null).length;
  const collected = paid * share;
  return {
    share,
    paid,
    collected,
    remaining: Math.max(0, totalFils - collected),
    percent: totalFils > 0 ? Math.min(100, Math.round((collected / totalFils) * 100)) : 0,
  };
}

/** Tap the box: unpaid → paid by CliQ (the prototype's default), paid → unpaid. */
export function togglePaid(players: readonly KittyPlayer[], id: string): KittyPlayer[] {
  return players.map((p) => (p.id === id ? { ...p, paid: p.paid ? null : 'cliq' } : p));
}

export function setMethod(
  players: readonly KittyPlayer[],
  id: string,
  method: 'cash' | 'cliq',
): KittyPlayer[] {
  return players.map((p) => (p.id === id ? { ...p, paid: method } : p));
}
