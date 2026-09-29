import { describe, expect, it } from 'vitest';

import { toGearList } from './gear';

const raw = {
  booking_id: 'b1',
  starts_at: '2026-09-30T15:00:00Z',
  players_per_side: 6,
  is_organizer: true,
  items: [
    { id: 'i1', kind: 'ball', name: null, ready: true, assignee: { name: 'Me', is_me: true } },
    { id: 'i2', kind: 'bibs', name: null, ready: true, assignee: { name: 'Bob', is_me: false } },
    { id: 'i3', kind: 'custom', name: 'شاحن', ready: false, assignee: null },
    { id: 'i4', kind: 'drone', name: null, ready: false, assignee: null },
  ],
};

describe('toGearList (D-094)', () => {
  it("marks the viewer's own items with their id and never exposes anyone else's", () => {
    const g = toGearList(raw, { meId: 'me-1', pitchName: { ar: 'ملعب', en: 'Pitch' } });
    expect(g).toMatchObject({
      bookingId: 'b1',
      size: 6,
      canEdit: true,
      pitchName: { en: 'Pitch' },
    });
    expect(g.items.map((i) => [i.kind, i.assignee?.id ?? null, i.ready])).toEqual([
      ['ball', 'me-1', true],
      ['bibs', 'assignee-i2', true],
      ['custom', null, false],
    ]);
    expect(g.items[2]!.name).toBe('شاحن');
  });

  it('leaves out a kind this app version does not know', () => {
    expect(toGearList(raw, { meId: null, pitchName: null }).items).toHaveLength(3);
  });

  it('is read-only for players and has a default size', () => {
    const g = toGearList({ booking_id: 'b2', items: [] }, { meId: null, pitchName: null });
    expect(g).toMatchObject({ canEdit: false, size: 5, startsAt: null, items: [] });
  });
});
