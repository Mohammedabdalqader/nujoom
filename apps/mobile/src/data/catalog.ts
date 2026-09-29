import type { Bilingual } from '@/data/types';

/**
 * The prepared pitch catalog as the app sees it (contract agentic_system/contracts/pitch-catalog.md
 * §5, D-045). One listing is one physical field with its own badge; the same record feeds the list
 * and the map. Every design fact may be unknown (`null`), and nothing here is ever filled in with
 * a default. The prototype's `Pitch` type stays the bookable shape used by the booking sheet.
 */

export type CatalogBadge = 'verified' | 'not_verified';
export type CatalogSurface = 'artificial_turf' | 'natural_grass' | 'hard_court' | 'sand' | 'other';
export type CatalogAmenity =
  'changing_rooms' | 'parking' | 'water' | 'seating' | 'toilets' | 'cafe';
export type LocationConfidence = 'approximate' | 'map_checked' | 'site_checked';
/** A name that may exist in one language only. */
export type Localized = { ar: string | null; en: string | null };

export type CatalogPhoto = { path: string; url: string | null; attribution: string | null };

export type CatalogOperations = {
  pricePerHour: number;
  priceNote: Localized | null;
  slotMinutes: 60 | 90;
  /** false: verified but paused → "Bookings unavailable right now", no slots, no Book. */
  bookable: boolean;
};

export type CatalogListing = {
  pitchId: string;
  facilityId: string;
  facilityName: Localized;
  /** The field's own label ("ملعب 2"); null when the facility has one field. */
  label: Localized | null;
  city: Bilingual | null;
  neighborhood: Bilingual | null;
  badge: CatalogBadge;
  playersPerSide: number | null;
  futsal: boolean | null;
  surface: CatalogSurface | null;
  indoor: boolean | null;
  lights: boolean | null;
  /** null = unknown; [] = checked, none. */
  amenities: CatalogAmenity[] | null;
  /** null when unconfirmed ("Location not confirmed"): list only, no pin or directions. */
  location: { lat: number; lng: number; confidence: LocationConfidence } | null;
  /** Only when searching near a point and the location is known. */
  distanceKm: number | null;
  access: 'public_rental' | 'public_free';
  /** Where the facts came from: osm, operator, field_team, community, reviewer. */
  sources: string[];
  lastReviewedAt: string | null;
  /**
   * An approved photo with a recorded right to use it (D-049), or null. `url` is a short-lived
   * signed link filled in by the data source; show `attribution` whenever it is set.
   */
  photo: CatalogPhoto | null;
  /** Always null for a not-verified field, so there is no price or slot to show. */
  operations: CatalogOperations | null;
};

export type CatalogDetail = CatalogListing & {
  /** The facility's other searchable fields, each with its own badge. */
  siblings: { pitchId: string; label: Localized; badge: CatalogBadge }[];
  dimensions: { lengthM: number | null; widthM: number | null } | null;
  address: Localized | null;
  /** e.g. "© OpenStreetMap contributors" when facts came from OSM. */
  attribution: string | null;
  canReport: boolean;
  /** Every approved photo of this field or the whole venue, the field's own first (D-075). */
  photos: CatalogPhoto[];
};

/** A city's published fields: all, verified, taking bookings now (D-075), for honest empty states. */
export type CityCounts = { listed: number; verified: number; bookable: number };

export type CatalogFilters = {
  cityId?: number;
  neighborhoodId?: number;
  q?: string;
  playersPerSide?: number[];
  surface?: CatalogSurface[];
  indoor?: boolean;
  lights?: boolean;
  badge?: 'all' | CatalogBadge;
  near?: { lat: number; lng: number; km?: number };
  bbox?: { s: number; w: number; n: number; e: number };
  limit?: number;
  cursor?: number;
};

export type CatalogPage = { items: CatalogListing[]; nextCursor: number | null };

// --- The RPC's JSON (public.search_pitches / public.catalog_pitch) ------------------------------

type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Raw) : null;
const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const num = (v: unknown): number | null =>
  typeof v === 'number'
    ? v
    : typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))
      ? Number(v)
      : null;
const bool = (v: unknown): boolean | null => (typeof v === 'boolean' ? v : null);
const localized = (v: unknown): Localized | null => {
  const o = obj(v);
  return o ? { ar: str(o.ar), en: str(o.en) } : null;
};
const bilingual = (v: unknown): Bilingual | null => {
  const o = obj(v);
  return o && typeof o.ar === 'string' && typeof o.en === 'string' ? { ar: o.ar, en: o.en } : null;
};

/** A nullable ar/en name in the viewer's language, falling back to the other one, else ''. */
export function localizedName(l: Localized | null, locale: string): string {
  if (!l) return '';
  return (locale === 'ar' ? (l.ar ?? l.en) : (l.en ?? l.ar)) ?? '';
}

export function toCatalogListing(raw: unknown): CatalogListing {
  const r = obj(raw) ?? {};
  const loc = obj(r.location);
  const ops = obj(r.operations);
  const lat = num(loc?.lat);
  const lng = num(loc?.lng);
  const price = num(ops?.price_per_hour);
  const slot = num(ops?.slot_minutes);
  return {
    pitchId: String(r.pitch_id),
    facilityId: String(r.facility_id),
    facilityName: localized(r.facility_name) ?? { ar: null, en: null },
    label: localized(r.label),
    city: bilingual(r.city),
    neighborhood: bilingual(r.neighborhood),
    badge: r.badge === 'verified' ? 'verified' : 'not_verified',
    playersPerSide: num(r.players_per_side),
    futsal: bool(r.futsal),
    surface: (str(r.surface) as CatalogSurface | null) ?? null,
    indoor: bool(r.indoor),
    lights: bool(r.lights),
    amenities: Array.isArray(r.amenities)
      ? (r.amenities.filter((a) => typeof a === 'string') as CatalogAmenity[])
      : null,
    location:
      loc && lat !== null && lng !== null
        ? {
            lat,
            lng,
            confidence: (str(loc.confidence) as LocationConfidence | null) ?? 'approximate',
          }
        : null,
    distanceKm: num(r.distance_km),
    access: r.access === 'public_free' ? 'public_free' : 'public_rental',
    sources: Array.isArray(r.sources)
      ? r.sources.filter((s): s is string => typeof s === 'string')
      : [],
    lastReviewedAt: str(r.last_reviewed_at),
    photo: (() => {
      const p = obj(r.photo);
      const path = str(p?.path);
      return p && path ? { path, url: null, attribution: str(p.attribution) } : null;
    })(),
    // Fail closed: operations only for a verified field with a complete, valid record.
    operations:
      r.badge === 'verified' && ops && price !== null && (slot === 60 || slot === 90)
        ? {
            pricePerHour: price,
            priceNote: localized(ops.price_note),
            slotMinutes: slot,
            bookable: ops.bookable === true,
          }
        : null,
  };
}

export function toCatalogDetail(raw: unknown): CatalogDetail {
  const r = obj(raw) ?? {};
  const dims = obj(r.dimensions);
  return {
    ...toCatalogListing(raw),
    siblings: Array.isArray(r.siblings)
      ? r.siblings.map((s) => {
          const o = obj(s) ?? {};
          return {
            pitchId: String(o.pitch_id),
            label: localized(o.label) ?? { ar: null, en: null },
            badge: o.badge === 'verified' ? ('verified' as const) : ('not_verified' as const),
          };
        })
      : [],
    dimensions: dims ? { lengthM: num(dims.length_m), widthM: num(dims.width_m) } : null,
    address: localized(r.address),
    attribution: str(r.attribution),
    canReport: r.can_report === true,
    photos: Array.isArray(r.photos)
      ? r.photos.flatMap((x) => {
          const o = obj(x);
          return o && typeof o.path === 'string'
            ? [{ path: o.path, url: null, attribution: str(o.attribution) }]
            : [];
        })
      : [],
  };
}

export function toCityCounts(raw: unknown): CityCounts {
  const r = obj(raw) ?? {};
  return {
    listed: Number(r.listed ?? 0),
    verified: Number(r.verified ?? 0),
    bookable: Number(r.bookable ?? 0),
  };
}

/** The RPC's input: snake_case, only the filters that were set. */
export function toSearchParams(filters: CatalogFilters): Record<string, unknown> {
  const p: Record<string, unknown> = {};
  if (filters.cityId !== undefined) p.city_id = filters.cityId;
  if (filters.neighborhoodId !== undefined) p.neighborhood_id = filters.neighborhoodId;
  if (filters.q?.trim()) p.q = filters.q.trim();
  if (filters.playersPerSide?.length) p.players_per_side = filters.playersPerSide;
  if (filters.surface?.length) p.surface = filters.surface;
  if (filters.indoor !== undefined) p.indoor = filters.indoor;
  if (filters.lights !== undefined) p.lights = filters.lights;
  if (filters.badge) p.badge = filters.badge;
  if (filters.near) p.near = filters.near;
  if (filters.bbox) p.bbox = filters.bbox;
  if (filters.limit !== undefined) p.limit = filters.limit;
  if (filters.cursor !== undefined) p.cursor = filters.cursor;
  return p;
}

/** Which directory state to show (docs/DESIGN.md G1 "Empty, offline and errors", D-076). */
export type CatalogListState = 'results' | 'none_in_city' | 'none_verified' | 'no_match';

/**
 * Tells apart "nothing reviewed in this city yet", "listed but none verified" (while filtering on
 * verified) and "these filters match nothing", from the city counts (D-075). Offline is the
 * query's error and is handled separately.
 */
export function catalogListState(
  counts: CityCounts | undefined,
  results: number,
  badge: 'all' | CatalogBadge,
): CatalogListState {
  if (results > 0) return 'results';
  if (!counts || counts.listed === 0) return 'none_in_city';
  if (badge === 'verified' && counts.verified === 0) return 'none_verified';
  return 'no_match';
}
