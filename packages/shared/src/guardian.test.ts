import { describe, expect, it } from 'vitest';

import { guardianInviteState, type GuardianLinkFacts } from './guardian';

const NOW = Date.parse('2026-09-28T12:00:00Z');
const link = (patch: Partial<GuardianLinkFacts>): GuardianLinkFacts => ({
  status: 'pending',
  sentAt: null,
  expiresAt: null,
  ...patch,
});

describe('guardianInviteState', () => {
  it('is none without links', () => {
    expect(guardianInviteState([], NOW)).toEqual({ state: 'none', link: null });
  });

  it('never claims sent before the email went out', () => {
    expect(guardianInviteState([link({})], NOW).state).toBe('notSent');
    // A token was issued but the email failed: still not sent.
    expect(guardianInviteState([link({ expiresAt: '2026-10-05T12:00:00Z' })], NOW).state).toBe(
      'notSent',
    );
  });

  it('is sent once delivery was recorded', () => {
    const sent = link({ sentAt: '2026-09-28T11:00:00Z', expiresAt: '2026-10-05T11:00:00Z' });
    expect(guardianInviteState([sent], NOW)).toEqual({ state: 'sent', link: sent });
  });

  it('is expired when the link ran out, sent or not', () => {
    const old = link({ sentAt: '2026-09-20T11:00:00Z', expiresAt: '2026-09-27T11:00:00Z' });
    expect(guardianInviteState([old], NOW).state).toBe('expired');
    expect(guardianInviteState([link({ expiresAt: '2026-09-28T12:00:00Z' })], NOW).state).toBe(
      'expired',
    );
  });

  it('lets a confirmed guardian win over a pending one', () => {
    const confirmed = link({ status: 'confirmed' });
    expect(guardianInviteState([link({}), confirmed], NOW)).toEqual({
      state: 'confirmed',
      link: confirmed,
    });
  });
});
