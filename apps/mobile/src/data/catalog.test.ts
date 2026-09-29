import { describe, expect, it } from 'vitest';

import {
  catalogListState,
  toCatalogDetail,
  toCatalogListing,
  toCityCounts,
  toSearchParams,
} from './catalog';

// Shapes as public.search_pitches / public.catalog_pitch return them (supabase/tests 070, 080).
const verified = {
  pitch_id: 'a',
  facility_id: 'f',
  facility_name: { ar: 'ملاعب النجمة', en: null },
  label: { ar: 'ملعب 1', en: 'Pitch 1' },
  city: { ar: 'الزرقاء', en: 'Zarqa' },
  neighborhood: null,
  badge: 'verified',
  players_per_side: 5,
  futsal: null,
  surface: 'artificial_turf',
  indoor: false,
  lights: true,
  amenities: ['parking'],
  location: { lat: 32.07, lng: 36.09, confidence: 'map_checked' },
  distance_km: 1.2,
  access: 'public_rental',
  sources: ['field_team', 'operator'],
  last_reviewed_at: '2026-09-28T20:00:00+00:00',
  photo: null,
  operations: { price_per_hour: 25.0, price_note: null, slot_minutes: 60, bookable: true },
};

const unknown = {
  pitch_id: 'b',
  facility_id: 'g',
  facility_name: { ar: 'ملعب الحارة', en: null },
  label: null,
  city: { ar: 'عمان', en: 'Amman' },
  neighborhood: null,
  badge: 'not_verified',
  players_per_side: null,
  futsal: null,
  surface: null,
  indoor: null,
  lights: null,
  amenities: null,
  location: null,
  distance_km: null,
  access: 'public_free',
  sources: [],
  last_reviewed_at: null,
  photo: null,
  operations: null,
};

describe('toCatalogListing', () => {
  it('maps a verified, bookable field', () => {
    const l = toCatalogListing(verified);
    expect(l.badge).toBe('verified');
    expect(l.operations).toEqual({
      pricePerHour: 25,
      priceNote: null,
      slotMinutes: 60,
      bookable: true,
    });
    expect(l.location).toEqual({ lat: 32.07, lng: 36.09, confidence: 'map_checked' });
    expect(l.amenities).toEqual(['parking']);
  });

  it('keeps unknown facts unknown: no defaults', () => {
    const l = toCatalogListing(unknown);
    expect([
      l.playersPerSide,
      l.surface,
      l.indoor,
      l.lights,
      l.amenities,
      l.location,
      l.label,
    ]).toEqual([null, null, null, null, null, null, null]);
  });

  it('keeps "checked, none" apart from unknown', () => {
    expect(toCatalogListing({ ...unknown, amenities: [] }).amenities).toEqual([]);
  });

  it('never shows operations for a not-verified field, even if some arrive', () => {
    expect(toCatalogListing({ ...unknown, operations: verified.operations }).operations).toBeNull();
  });

  it('maps an approved photo with its credit; the link is signed later', () => {
    expect(
      toCatalogListing({ ...verified, photo: { path: 'f/a.jpg', attribution: 'CC BY 4.0' } }).photo,
    ).toEqual({ path: 'f/a.jpg', url: null, attribution: 'CC BY 4.0' });
    expect(toCatalogListing({ ...verified, photo: 'f/a.jpg' }).photo).toBeNull();
  });

  it('keeps a paused verified field unbookable', () => {
    const paused = { ...verified, operations: { ...verified.operations, bookable: false } };
    expect(toCatalogListing(paused).operations?.bookable).toBe(false);
  });

  it('fails closed on malformed operations', () => {
    const bad = {
      ...verified,
      operations: { price_per_hour: 'x', slot_minutes: 45, bookable: true },
    };
    expect(toCatalogListing(bad).operations).toBeNull();
  });
});

describe('toCatalogDetail', () => {
  it('adds siblings with their own badges, dimensions and attribution', () => {
    const d = toCatalogDetail({
      ...verified,
      siblings: [{ pitch_id: 'c', label: { ar: 'ملعب 2', en: null }, badge: 'not_verified' }],
      dimensions: { length_m: 40, width_m: null },
      address: null,
      attribution: '© OpenStreetMap contributors',
      can_report: true,
    });
    expect(d.siblings).toEqual([
      { pitchId: 'c', label: { ar: 'ملعب 2', en: null }, badge: 'not_verified' },
    ]);
    expect(d.dimensions).toEqual({ lengthM: 40, widthM: null });
    expect(d.attribution).toBe('© OpenStreetMap contributors');
    expect(d.canReport).toBe(true);
  });
});

describe('toSearchParams', () => {
  it('sends only the filters that were set, in the RPC names', () => {
    expect(
      toSearchParams({ q: '  ريم ', badge: 'not_verified', playersPerSide: [5], cursor: 20 }),
    ).toEqual({
      q: 'ريم',
      badge: 'not_verified',
      players_per_side: [5],
      cursor: 20,
    });
    expect(toSearchParams({ q: '   ', playersPerSide: [] })).toEqual({});
  });
});

describe('catalog UX support (D-075)', () => {
  it('lists every approved photo on the detail, dropping malformed entries', () => {
    const d = toCatalogDetail({
      ...verified,
      siblings: [],
      photos: [
        { path: 'f/field-a.jpg', attribution: null },
        { path: 'f/venue.jpg', attribution: 'Photo: A. Photographer, CC BY 4.0' },
        { nope: true },
      ],
    });
    expect(d.photos).toEqual([
      { path: 'f/field-a.jpg', url: null, attribution: null },
      { path: 'f/venue.jpg', url: null, attribution: 'Photo: A. Photographer, CC BY 4.0' },
    ]);
  });

  it('reads city counts, defaulting to zero', () => {
    expect(toCityCounts({ listed: 2, verified: 1, bookable: 0 })).toEqual({
      listed: 2,
      verified: 1,
      bookable: 0,
    });
    expect(toCityCounts(null)).toEqual({ listed: 0, verified: 0, bookable: 0 });
  });
});

describe('catalogListState (D-076)', () => {
  const counts = { listed: 3, verified: 0, bookable: 0 };
  it('shows results whenever there are any', () => {
    expect(catalogListState(counts, 2, 'all')).toBe('results');
  });
  it('says when nothing is reviewed in the city yet', () => {
    expect(catalogListState({ listed: 0, verified: 0, bookable: 0 }, 0, 'all')).toBe(
      'none_in_city',
    );
    expect(catalogListState(undefined, 0, 'verified')).toBe('none_in_city');
  });
  it('says when the city has entries but none verified', () => {
    expect(catalogListState(counts, 0, 'verified')).toBe('none_verified');
  });
  it('otherwise blames the filters, not the city', () => {
    expect(catalogListState(counts, 0, 'not_verified')).toBe('no_match');
    expect(catalogListState({ listed: 3, verified: 2, bookable: 1 }, 0, 'verified')).toBe(
      'no_match',
    );
  });
});
