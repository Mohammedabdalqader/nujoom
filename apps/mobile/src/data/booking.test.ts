import { describe, expect, it } from 'vitest';

import {
  isRetryable,
  newRequestId,
  toBookingDetails,
  toDaySlots,
  toReceipt,
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
    expect(d.players).toEqual([{ name: 'Ana', team: null, bib: null, isOrganizer: true }]);
    expect(d.contactPhone).toBeNull();
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
