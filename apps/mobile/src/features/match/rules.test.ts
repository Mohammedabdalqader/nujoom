import { describe, expect, it } from 'vitest';

import { previewMatchDay } from '@/data/preview';
import type { MatchDay } from '@/data/types';

import { checkinsRemaining, clipBlocker, minutesLeft, voteBlocker, voteShare } from './rules';

const base: MatchDay = previewMatchDay;
const with_ = (patch: Partial<MatchDay>): MatchDay => ({ ...base, ...patch });

describe('clipBlocker', () => {
  it('needs a live match, a check-in and a recording phone', () => {
    expect(clipBlocker(with_({ phase: 'upcoming' }))).toBe('notLive');
    expect(clipBlocker(with_({ meCheckedIn: false }))).toBe('needCheckin');
    expect(clipBlocker(with_({ meCheckedIn: true, recordingBy: null }))).toBe('noRecorder');
    expect(clipBlocker(with_({ meCheckedIn: true }))).toBeNull();
  });
});

describe('voteBlocker', () => {
  const open = with_({ phase: 'voting', meCheckedIn: true, myVote: null });

  it('allows one vote for someone else while voting is open', () => {
    expect(voteBlocker(open, 'me', 'p1')).toBeNull();
  });

  it('refuses outside the window, without check-in, twice, or for yourself', () => {
    expect(voteBlocker(with_({ phase: 'live', meCheckedIn: true }), 'me', 'p1')).toBe('notOpen');
    expect(voteBlocker({ ...open, meCheckedIn: false }, 'me', 'p1')).toBe('needCheckin');
    expect(voteBlocker({ ...open, myVote: 'p2' }, 'me', 'p1')).toBe('alreadyVoted');
    expect(voteBlocker(open, 'me', 'me')).toBe('self');
  });
});

describe('counts', () => {
  it('counts minutes left and missing check-ins', () => {
    const match = with_({ endsAt: '2026-09-28T20:00:00Z' });
    expect(minutesLeft(match, Date.parse('2026-09-28T19:47:30Z'))).toBe(13);
    expect(minutesLeft(match, Date.parse('2026-09-28T21:00:00Z'))).toBe(0);
    expect(checkinsRemaining(base)).toBe(2);
  });
});

describe('voteShare', () => {
  it('stays hidden until results are published', () => {
    expect(voteShare(base, 'p1')).toBeNull();
    const closed = with_({ phase: 'closed', results: [{ playerId: 'p1', percent: 58 }] });
    expect(voteShare(closed, 'p1')).toBe(58);
    expect(voteShare(closed, 'p9')).toBe(0);
  });
});
