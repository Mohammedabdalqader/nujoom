import type { CatalogDetail, CatalogFilters, CatalogListing, CatalogPage } from '@/data/catalog';

/**
 * Demo catalog (contract §7): FICTITIOUS venues, labelled "(تجريبي) / (demo)", one per state the
 * catalog screens must handle. Never real venue names, prices or photos.
 *   1a verified and bookable · 1b verified but paused · 1c not verified in the same facility
 *   2  not verified, almost everything unknown, location not confirmed
 *   3  not verified, approximate location, large grass field
 */
const najma = { ar: 'ملاعب النجمة (تجريبي)', en: 'Najma Pitches (demo)' };
const amman = { ar: 'عمان', en: 'Amman' };
const hussein = { ar: 'جبل الحسين', en: 'Jabal Al-Hussein' };

const base = {
  futsal: null,
  distanceKm: null,
  photo: null,
  lastReviewedAt: '2026-09-20T09:00:00+03:00',
} satisfies Partial<CatalogListing>;

export const demoCatalog: CatalogListing[] = [
  {
    ...base,
    pitchId: 'demo-1a',
    facilityId: 'demo-f1',
    facilityName: najma,
    label: { ar: 'ملعب 1', en: 'Pitch 1' },
    city: amman,
    neighborhood: hussein,
    badge: 'verified',
    playersPerSide: 5,
    surface: 'artificial_turf',
    indoor: false,
    lights: true,
    amenities: ['parking', 'water'],
    location: { lat: 31.9667, lng: 35.9161, confidence: 'site_checked' },
    access: 'public_rental',
    sources: ['field_team', 'operator'],
    operations: { pricePerHour: 25, priceNote: null, slotMinutes: 60, bookable: true },
  },
  {
    ...base,
    pitchId: 'demo-1b',
    facilityId: 'demo-f1',
    facilityName: najma,
    label: { ar: 'ملعب 2', en: 'Pitch 2' },
    city: amman,
    neighborhood: hussein,
    badge: 'verified',
    playersPerSide: 7,
    surface: 'artificial_turf',
    indoor: false,
    lights: true,
    amenities: [],
    location: { lat: 31.9667, lng: 35.9161, confidence: 'site_checked' },
    access: 'public_rental',
    sources: ['field_team', 'operator'],
    operations: { pricePerHour: 30, priceNote: null, slotMinutes: 90, bookable: false },
  },
  {
    ...base,
    pitchId: 'demo-1c',
    facilityId: 'demo-f1',
    facilityName: najma,
    label: { ar: 'ملعب 3', en: 'Pitch 3' },
    city: amman,
    neighborhood: hussein,
    badge: 'not_verified',
    playersPerSide: 5,
    surface: 'artificial_turf',
    indoor: null,
    lights: null,
    amenities: null,
    location: { lat: 31.9667, lng: 35.9161, confidence: 'site_checked' },
    access: 'public_rental',
    sources: ['field_team'],
    operations: null,
  },
  {
    ...base,
    pitchId: 'demo-2',
    facilityId: 'demo-f2',
    facilityName: { ar: 'ملعب الحارة الشرقية (تجريبي)', en: null },
    label: null,
    city: { ar: 'الزرقاء', en: 'Zarqa' },
    neighborhood: null,
    badge: 'not_verified',
    playersPerSide: null,
    surface: null,
    indoor: null,
    lights: null,
    amenities: null,
    location: null,
    access: 'public_free',
    sources: ['osm'],
    lastReviewedAt: null,
    operations: null,
  },
  {
    ...base,
    pitchId: 'demo-3',
    facilityId: 'demo-f3',
    facilityName: { ar: 'ملعب المدينة (تجريبي)', en: 'City Ground (demo)' },
    label: null,
    city: { ar: 'إربد', en: 'Irbid' },
    neighborhood: null,
    badge: 'not_verified',
    playersPerSide: 11,
    surface: 'natural_grass',
    indoor: false,
    lights: null,
    amenities: null,
    location: { lat: 32.5556, lng: 35.85, confidence: 'approximate' },
    access: 'public_rental',
    sources: ['osm', 'reviewer'],
    operations: null,
  },
];

const fold = (s: string) =>
  s
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي');

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/** The same filters as public.search_pitches, applied to the fixtures. */
export function searchDemoCatalog(filters: CatalogFilters): CatalogPage {
  const q = filters.q ? fold(filters.q.trim()) : '';
  const matches = demoCatalog
    .map((l) => ({
      ...l,
      distanceKm:
        filters.near && l.location
          ? Math.round(distanceKm(filters.near, l.location) * 10) / 10
          : null,
    }))
    .filter(
      (l) =>
        (!filters.badge || filters.badge === 'all' || l.badge === filters.badge) &&
        (!filters.playersPerSide?.length ||
          (l.playersPerSide !== null && filters.playersPerSide.includes(l.playersPerSide))) &&
        (!filters.surface?.length || (l.surface !== null && filters.surface.includes(l.surface))) &&
        (filters.indoor === undefined || l.indoor === filters.indoor) &&
        (filters.lights === undefined || l.lights === filters.lights) &&
        (!q ||
          [l.facilityName.ar, l.facilityName.en, l.label?.ar, l.label?.en, l.neighborhood?.ar]
            .filter((s): s is string => !!s)
            .some((s) => fold(s).includes(q))) &&
        (!filters.near || (l.distanceKm !== null && l.distanceKm <= (filters.near.km ?? 10))),
    )
    .sort(
      (a, b) =>
        (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity) ||
        Number(b.badge === 'verified') - Number(a.badge === 'verified'),
    );
  const limit = Math.min(Math.max(filters.limit ?? 20, 1), 50);
  const from = filters.cursor ?? 0;
  return {
    items: matches.slice(from, from + limit),
    nextCursor: matches.length > from + limit ? from + limit : null,
  };
}

export function demoCatalogPitch(id: string): CatalogDetail | null {
  const l = demoCatalog.find((x) => x.pitchId === id);
  if (!l) return null;
  return {
    ...l,
    siblings: demoCatalog
      .filter((x) => x.facilityId === l.facilityId && x.pitchId !== id)
      .map((x) => ({
        pitchId: x.pitchId,
        label: x.label ?? { ar: null, en: null },
        badge: x.badge,
      })),
    dimensions: l.pitchId === 'demo-1a' ? { lengthM: 40, widthM: 20 } : null,
    address: null,
    attribution: l.sources.includes('osm') ? '© OpenStreetMap contributors' : null,
    canReport: true,
    photos: l.photo ? [l.photo] : [],
  };
}

/** Demo favourites, newest first, kept for the session (same rules as the server, D-086). */
const demoFavorites: string[] = [];

export function demoFavoritePitches(): CatalogListing[] {
  return demoFavorites
    .map((id) => demoCatalog.find((x) => x.pitchId === id))
    .filter((x): x is CatalogListing => x !== undefined);
}

export function setDemoFavorite(pitchId: string, favorite: boolean): boolean {
  const at = demoFavorites.indexOf(pitchId);
  if (!favorite) {
    if (at >= 0) demoFavorites.splice(at, 1);
    return false;
  }
  const listing = demoCatalog.find((x) => x.pitchId === pitchId);
  if (!listing || listing.badge !== 'verified') throw new Error('pitch_unavailable');
  if (at < 0) demoFavorites.unshift(pitchId);
  return true;
}

/** The demo catalog is one sample city: its counts, whatever city is asked for. */
export function demoCityCounts() {
  return {
    listed: demoCatalog.length,
    verified: demoCatalog.filter((l) => l.badge === 'verified').length,
    bookable: demoCatalog.filter((l) => l.operations?.bookable).length,
  };
}
