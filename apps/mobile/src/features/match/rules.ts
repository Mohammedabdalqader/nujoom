import type { MatchDay } from '@/data/types';

/** Why the clip button is not available right now, or null when it is (spec §6.8). */
export function clipBlocker(match: MatchDay): 'notLive' | 'needCheckin' | 'noRecorder' | null {
  if (match.phase !== 'live') return 'notLive';
  if (!match.meCheckedIn) return 'needCheckin';
  if (!match.recordingBy) return 'noRecorder';
  return null;
}

/**
 * Whether the player can vote for `candidateId` (spec §6.10): voting must be open, the voter must
 * have checked in, can vote once, and never for themselves.
 */
export function voteBlocker(
  match: MatchDay,
  meId: string,
  candidateId: string,
): 'notOpen' | 'needCheckin' | 'alreadyVoted' | 'self' | null {
  if (match.phase !== 'voting') return 'notOpen';
  if (!match.meCheckedIn) return 'needCheckin';
  if (match.myVote) return 'alreadyVoted';
  if (candidateId === meId) return 'self';
  return null;
}

/** Minutes left in the booking, rounded up, never negative. */
export function minutesLeft(match: MatchDay, now: number): number {
  return Math.max(0, Math.ceil((Date.parse(match.endsAt) - now) / 60_000));
}

/** Players still to check in before the whole roster is in. */
export function checkinsRemaining(match: MatchDay): number {
  return Math.max(0, match.roster.length - match.checkedInIds.length);
}

/** Vote share for a candidate, only once results are published (never during voting). */
export function voteShare(match: MatchDay, playerId: string): number | null {
  if (!match.results) return null;
  return match.results.find((r) => r.playerId === playerId)?.percent ?? 0;
}
