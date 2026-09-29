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
