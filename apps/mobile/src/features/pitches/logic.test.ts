import { describe, expect, it } from 'vitest';

import type { Pitch } from '@/data/types';

import { cardSlots, daySlots, filterPitches, mapPins, pitchBadge } from './logic';

const EVERY_DAY = Object.fromEntries(
  ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((d) => [d, [['18:00', '22:30']]]),
) as Pitch['openingHours'];

function pitch(overrides: Partial<Pitch>): Pitch {
  return {
    id: 'p',
    name: { ar: 'ملعب', en: 'Pitch' },
    area: { ar: 'حي', en: 'Hara' },
    areaSlug: 'a',
    city: { ar: 'عمان', en: 'Amman' },
    photoUrl: null,
    pricePerHour: 15,
    priceNote: null,
    rating: null,
    ratingCount: 0,
    size: 5,
    indoor: false,
    surface: 'artificial',
    level: 'listed',
    amenities: [],
    slotMinutes: 90,
    openingHours: EVERY_DAY,
    busy: [],
    location: null,
    favorite: false,
    openSpot: null,
    ...overrides,
  };
}

describe('filterPitches', () => {
  const pitches = [
    pitch({ id: 'a', areaSlug: 'x', size: 5, rating: 4.2 }),
    pitch({ id: 'b', areaSlug: 'y', size: 7, rating: 4.9 }),
    pitch({ id: 'c', areaSlug: 'x', size: 5, indoor: true, favorite: true, rating: 3 }),
  ];

  it('filters by area and format', () => {
    expect(filterPitches(pitches, { area: 'x', format: 'all' }).map((p) => p.id)).toEqual([
      'c',
      'a',
    ]);
    expect(filterPitches(pitches, { area: 'all', format: '7' }).map((p) => p.id)).toEqual(['b']);
    expect(filterPitches(pitches, { area: 'all', format: 'indoor' }).map((p) => p.id)).toEqual([
      'c',
    ]);
  });

  it('puts favourites first, then the best rated', () => {
    expect(filterPitches(pitches, { area: 'all', format: 'all' }).map((p) => p.id)).toEqual([
      'c',
      'b',
      'a',
    ]);
  });
});

describe('slots', () => {
  const date = '2026-09-28';
  const busy = [{ starts_at: '2026-09-28T15:00:00Z', ends_at: '2026-09-28T16:30:00Z' }]; // 18:00–19:30 Amman

  it('marks booked and past slots', () => {
    const states = daySlots(pitch({ busy }), date, new Date('2026-09-28T14:00:00Z')).map((s) => [
      s.label,
      s.state,
    ]);
    expect(states).toEqual([
      ['18:00', 'busy'],
      ['19:30', 'free'],
      ['21:00', 'free'],
    ]);
    const later = daySlots(pitch({ busy }), date, new Date('2026-09-28T17:00:00Z'));
    expect(later.map((s) => s.state)).toEqual(['past', 'past', 'free']);
  });

  it('shows upcoming slots on cards, with or without booked ones', () => {
    const now = new Date('2026-09-28T14:00:00Z');
    expect(cardSlots(pitch({ busy }), date, { limit: 4, includeBusy: true, now }).length).toBe(3);
    expect(
      cardSlots(pitch({ busy }), date, { limit: 4, includeBusy: false, now }).map((s) => s.label),
    ).toEqual(['19:30', '21:00']);
  });
});

describe('pitchBadge', () => {
  it('prefers the recording level, then an elite rating', () => {
    expect(pitchBadge(pitch({ level: 'verified' }))).toBe('verified');
    expect(pitchBadge(pitch({ level: 'dock', rating: 5, ratingCount: 99 }))).toBe('dock');
    expect(pitchBadge(pitch({ rating: 4.9, ratingCount: 89 }))).toBe('elite');
    expect(pitchBadge(pitch({ rating: 4.9, ratingCount: 3 }))).toBeNull();
  });
});

describe('mapPins', () => {
  it('keeps real relative positions (east is right, north is up)', () => {
    const pins = mapPins([
      pitch({ id: 'west', location: { lat: 31.95, lng: 35.8 } }),
      pitch({ id: 'east', location: { lat: 31.99, lng: 36.0 } }),
      pitch({ id: 'none', location: null }),
    ]);
    expect(pins).toHaveLength(2);
    const west = pins.find((p) => p.pitch.id === 'west')!;
    const east = pins.find((p) => p.pitch.id === 'east')!;
    expect(west.x).toBeLessThan(east.x);
    expect(east.y).toBeLessThan(west.y);
    for (const p of pins) {
      expect(p.x).toBeGreaterThanOrEqual(0.12);
      expect(p.x).toBeLessThanOrEqual(0.88);
    }
  });
});
