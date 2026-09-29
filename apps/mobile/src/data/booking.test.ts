import { describe, expect, it } from 'vitest';

import {
  inviteUrl,
  isRetryable,
  newRequestId,
  nextBooking,
  teamInitials,
  tokenFromLink,
  toBookingDetails,
  toDaySlots,
  toInviteLink,
  toInvitePreview,
  toMatchDetails,
  toReceipt,
  toUpcomingMatch,
  withRetry,
} from './booking';

const receipt = {
  id: 'b1',
  kind: 'app',
  status: 'confirmed',
  starts_at: '2026-09-30T15:00:00+00:00',
  ends_at: '2026-09-30T16:00:00+00:00',
  venue: { ar: 'ملاعب الشمس', en: null },
  field: null,
  city: { ar: 'الزرقاء', en: 'Zarqa' },
  pitch_id: 'p1',
  facility_id: 'f1',
  players_per_side: 5,
  slot_minutes: 60,
  price_per_hour: '20.00',
  total: 20,
  currency: 'JOD',
  payment: 'cash_at_pitch',
  recorded: true,
  team_a_name: null,
  team_b_name: null,
  is_organizer: true,
  cancelled_at: null,
  cancel_reason: null,
};

describe('booking mapping', () => {
  it('reads a receipt: the booked price, cash at the pitch', () => {
    expect(toReceipt(receipt)).toMatchObject({
      id: 'b1',
      status: 'confirmed',
      venue: { ar: 'ملاعب الشمس', en: null },
      field: null,
      pricePerHour: 20,
      total: 20,
      payment: 'cash_at_pitch',
      isOrganizer: true,
    });
  });

  it('reads details with players, and no phone unless the server sent one', () => {
    const d = toBookingDetails({
      ...receipt,
      players: [{ name: 'Ana', team: null, bib: null, is_organizer: true }],
    });
    expect(d.players).toEqual([
      { name: 'Ana', team: null, bib: null, isOrganizer: true, isMe: false, playerRef: null },
    ]);
    expect(d.contactPhone).toBeNull();
    expect(d).toMatchObject({ capacity: null, openSpots: null });
  });

  it('reads a day of slots, treating anything unexpected as not bookable', () => {
    const day = toDaySlots({
      date: '2026-09-30',
      slot_minutes: 90,
      price_per_hour: 30,
      slots: [
        { starts_at: 'a', ends_at: 'b', state: 'free' },
        { starts_at: 'c', ends_at: 'd', state: 'busy' },
        { starts_at: 'e', ends_at: 'f', state: 'weird' },
      ],
    });
    expect(day.slots.map((s) => s.state)).toEqual(['free', 'busy', 'past']);
    expect(day.slotMinutes).toBe(90);
  });
});

describe('retries (contract §6)', () => {
  const offline = new TypeError('Failed to fetch');
  const answered = Object.assign(new Error('slot_taken'), { code: 'P0001' });
  const noWait = { wait: async () => {} };

  it('only retries requests that never got an answer', () => {
    expect(isRetryable(offline)).toBe(true);
    expect(isRetryable(new Error('Network request failed'))).toBe(true);
    expect(isRetryable(answered)).toBe(false);
    expect(isRetryable(new Error('slot_taken'))).toBe(false);
    expect(isRetryable(null)).toBe(false);
  });

  it('retries a lost request and returns the answer', async () => {
    let calls = 0;
    const result = await withRetry(async () => {
      calls++;
      if (calls < 3) throw offline;
      return 'receipt';
    }, noWait);
    expect([result, calls]).toEqual(['receipt', 3]);
  });

  it('never retries a server answer', async () => {
    let calls = 0;
    await expect(
      withRetry(async () => {
        calls++;
        throw answered;
      }, noWait),
    ).rejects.toBe(answered);
    expect(calls).toBe(1);
  });

  it('gives up after the last try', async () => {
    let calls = 0;
    await expect(
      withRetry(async () => {
        calls++;
        throw offline;
      }, noWait),
    ).rejects.toBe(offline);
    expect(calls).toBe(3);
  });
});

describe('newRequestId', () => {
  it('makes a UUID v4 the database accepts, and a different one each time', () => {
    const id = newRequestId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(newRequestId()).not.toBe(id);
  });

  it('keeps the version and variant bits whatever the random source says', () => {
    expect(newRequestId(() => 0.99)).toMatch(/^f{8}-f{4}-4f{3}-bf{3}-f{12}$/);
    expect(newRequestId(() => 0)).toMatch(/^0{8}-0{4}-40{3}-80{3}-0{12}$/);
  });
});

describe('the next match on Home', () => {
  const names = { a: 'الفريق الأزرق', b: 'الفريق البرتقالي' };
  const at = (id: string, starts: string, ends: string, status = 'confirmed') =>
    toReceipt({ ...receipt, id, starts_at: starts, ends_at: ends, status });
  const now = new Date('2026-09-30T15:30:00Z').getTime();

  it('picks the earliest confirmed booking that has not ended', () => {
    const list = [
      at('later', '2026-10-01T15:00:00Z', '2026-10-01T16:00:00Z'),
      at('over', '2026-09-30T13:00:00Z', '2026-09-30T14:00:00Z'),
      at('cancelled', '2026-09-30T17:00:00Z', '2026-09-30T18:00:00Z', 'cancelled'),
      at('playing', '2026-09-30T15:00:00Z', '2026-09-30T16:00:00Z'),
    ];
    expect(nextBooking(list, now)?.id).toBe('playing');
    expect(nextBooking(list.slice(0, 3), now)?.id).toBe('later');
    expect(nextBooking([list[1]!, list[2]!], now)).toBeNull();
  });

  it('shows a booking with default team names, never ranked and with no link to share yet', () => {
    const m = toUpcomingMatch(
      toReceipt({ ...receipt, field: { ar: 'ملعب ٢', en: 'Pitch 2' }, team_b_name: 'النسور' }),
      names,
    );
    expect(m.pitchName).toEqual({ ar: 'ملاعب الشمس · ملعب ٢', en: 'ملاعب الشمس · Pitch 2' });
    expect(m.teams.map((t) => [t.name, t.initials, t.kit])).toEqual([
      ['الفريق الأزرق', 'ف.أ', 'blue'],
      ['النسور', 'ن', 'orange'],
    ]);
    expect(m.teams[0].hara).toEqual({ ar: 'الزرقاء', en: 'Zarqa' });
    expect(m).toMatchObject({ ranked: false, shareUrl: null, pitchPhotoUrl: null });
  });

  it('makes initials from up to two words', () => {
    expect(teamInitials('Blue team')).toBe('B.T');
    expect(teamInitials('ال')).toBe('ا');
    expect(teamInitials('')).toBe('');
  });

  it('splits players into line-ups by bib and keeps the rest apart', () => {
    const d = toMatchDetails(
      toBookingDetails({
        ...receipt,
        recorded: false,
        players: [
          { name: 'Organizer', team: null, bib: null, is_organizer: true },
          { name: 'B7', team: 'b', bib: 7, is_organizer: false },
          { name: 'A9', team: 'a', bib: 9, is_organizer: false },
          { name: 'A2', team: 'a', bib: 2, is_organizer: false },
        ],
      }),
      names,
    );
    expect(d.lineups[0].map((p) => p.name)).toEqual(['A2', 'A9']);
    expect(d.lineups[1].map((p) => p.name)).toEqual(['B7']);
    expect(d.unassigned.map((p) => p.name)).toEqual(['Organizer']);
    expect(d).toMatchObject({
      size: 5,
      recorded: false,
      recordingBy: null,
      organizer: true,
      cancelled: false,
      total: 20,
    });
    expect(d.lineups[0][0]).not.toHaveProperty('team');
  });

  it('marks a cancelled booking and a viewer who is not the organizer', () => {
    const d = toMatchDetails(
      toBookingDetails({
        ...receipt,
        status: 'cancelled',
        is_organizer: false,
        cancelled_at: '2026-09-30T10:00:00Z',
        cancel_reason: 'venue_closed',
        players: [],
      }),
      names,
    );
    expect(d).toMatchObject({ cancelled: true, organizer: false });
  });
});

describe('invites and joining (D-083)', () => {
  const token = 'Ab3_-'.repeat(8) + 'xyz';

  it('reads the organizer handle, "me" and room left from details', () => {
    const d = toBookingDetails({
      ...receipt,
      capacity: 12,
      open_spots: 10,
      players: [
        { name: 'Ana', team: null, bib: null, is_organizer: true, is_me: true, player_ref: 'r1' },
        { name: 'Bob', team: 'a', bib: 4, is_organizer: false, is_me: false, player_ref: 'r2' },
      ],
    });
    expect(d.players.map((p) => [p.name, p.isMe, p.playerRef])).toEqual([
      ['Ana', true, 'r1'],
      ['Bob', false, 'r2'],
    ]);
    expect(d).toMatchObject({ capacity: 12, openSpots: 10 });
  });

  it('reads a link and a preview', () => {
    expect(toInviteLink({ token, created_at: '2026-09-29T10:00:00Z' })).toEqual({
      token,
      createdAt: '2026-09-29T10:00:00Z',
    });
    const open = toInvitePreview({
      ...receipt,
      capacity: 12,
      open_spots: 11,
      invited_by: 'Ana',
      can_join: true,
      reason: null,
    });
    expect(open).toMatchObject({ canJoin: true, reason: null, invitedBy: 'Ana', openSpots: 11 });
    expect(open.total).toBe(20);
    const removed = toInvitePreview({ ...receipt, can_join: false, reason: 'removed' });
    expect(removed).toMatchObject({ canJoin: false, reason: 'removed', invitedBy: null });
  });

  it('never lets an unknown answer look joinable', () => {
    expect(toInvitePreview({ ...receipt, can_join: true, reason: 'something_new' })).toMatchObject({
      canJoin: false,
      reason: 'full',
    });
    expect(toInvitePreview({ ...receipt, can_join: false, reason: 'something_new' })).toMatchObject(
      {
        canJoin: false,
      },
    );
  });

  it('builds a share link only from a real site address', () => {
    expect(inviteUrl('https://nujoom.example/', token)).toBe(`https://nujoom.example/j/${token}`);
    expect(inviteUrl('http://localhost:3000', token)).toBe(`http://localhost:3000/j/${token}`);
    expect(inviteUrl(null, token)).toBeNull();
    expect(inviteUrl('', token)).toBeNull();
    expect(inviteUrl('http://nujoom.example', token)).toBeNull();
    expect(inviteUrl('https://nujoom.example', 'short')).toBeNull();
  });

  it('finds the token in a link, a path or on its own', () => {
    expect(tokenFromLink(`https://nujoom.example/j/${token}`)).toBe(token);
    expect(tokenFromLink(`https://nujoom.example/ar/j/${token}?utm=wa`)).toBe(token);
    expect(tokenFromLink(`/j/${token}`)).toBe(token);
    expect(tokenFromLink(` ${token} `)).toBe(token);
    expect(tokenFromLink('https://nujoom.example/j/short')).toBeNull();
    expect(tokenFromLink(`https://nujoom.example/x/${token}`)).toBeNull();
  });
});
