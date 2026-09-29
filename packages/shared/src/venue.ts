/**
 * Venue owner rules shared by the website and, later, the app (D-066). The database is the
 * authority (pitches.amenities check, owner_confirm_field); these decide what a form submits.
 */

/** Amenities a field can have (the closed list in the pitches.amenities check). */
export const AMENITIES = [
  'changing_rooms',
  'parking',
  'water',
  'seating',
  'toilets',
  'cafe',
] as const;
export type Amenity = (typeof AMENITIES)[number];

/** A stored list as a comparable key: "unknown" for null (never checked), else a sorted list. */
export function amenitiesKey(value: unknown): string {
  return Array.isArray(value) ? [...new Set(value.map(String))].sort().join(',') : 'unknown';
}

/**
 * What an owner's amenities checkboxes mean, or null for "leave as stored":
 * - ticked items → exactly those (unknown values dropped, sorted, no duplicates);
 * - nothing ticked, but "none of these" ticked or the list was already known → [] (checked, none);
 * - nothing ticked on an unknown list → unchanged (not ticking is not a statement).
 * Returns null too when the result equals the stored list, so no duplicate evidence is written.
 */
export function nextAmenities(
  ticked: readonly string[],
  noneTicked: boolean,
  storedKey: string,
): Amenity[] | null {
  const known = [
    ...new Set(ticked.filter((a): a is Amenity => (AMENITIES as readonly string[]).includes(a))),
  ].sort();
  const next = known.length > 0 ? known : noneTicked || storedKey !== 'unknown' ? [] : null;
  return next && amenitiesKey(next) !== storedKey ? next : null;
}

/** Field size limits in metres (the pitches.length_m / width_m checks). */
export const DIMENSION_LIMITS = { length_m: [10, 130], width_m: [5, 100] } as const;

/**
 * An owner's typed dimension: '' → null (leave as stored), a number within the limits rounded to
 * 0.1 m (the column's precision), anything else → 'invalid'. Accepts a decimal comma and Arabic
 * digits as typed on phones in Jordan.
 */
export function parseDimension(
  kind: keyof typeof DIMENSION_LIMITS,
  raw: string,
): number | null | 'invalid' {
  const text = raw
    .trim()
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[,٫]/, '.');
  if (text === '') return null;
  if (!/^\d{1,3}(\.\d+)?$/.test(text)) return 'invalid';
  const value = Math.round(Number(text) * 10) / 10;
  const [min, max] = DIMENSION_LIMITS[kind];
  return value >= min && value <= max ? value : 'invalid';
}

/** A field's name as typed: trimmed, inner spaces collapsed; '' → null, over 60 → 'invalid'. */
export function parseFieldLabel(raw: string): string | null | 'invalid' {
  const text = raw.trim().replace(/\s+/g, ' ');
  if (text === '') return null;
  return text.length <= 60 ? text : 'invalid';
}
