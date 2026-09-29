import { describe, expect, it } from 'vitest';

import { amenitiesKey, nextAmenities } from './venue';

describe('amenitiesKey', () => {
  it('tells unknown from checked-none and ignores order', () => {
    expect(amenitiesKey(null)).toBe('unknown');
    expect(amenitiesKey(undefined)).toBe('unknown');
    expect(amenitiesKey([])).toBe('');
    expect(amenitiesKey(['water', 'parking', 'water'])).toBe('parking,water');
  });
});

describe('nextAmenities (D-066)', () => {
  it('saves what the owner ticked, cleaned and sorted', () => {
    expect(nextAmenities(['water', 'parking', 'jacuzzi', 'water'], false, 'unknown')).toEqual([
      'parking',
      'water',
    ]);
  });

  it('keeps an unknown list unknown when nothing is ticked', () => {
    expect(nextAmenities([], false, 'unknown')).toBeNull();
  });

  it('records "none" only when the owner says so, or when unticking a known list', () => {
    expect(nextAmenities([], true, 'unknown')).toEqual([]);
    expect(nextAmenities([], false, 'parking')).toEqual([]);
  });

  it('sends nothing when the list is unchanged', () => {
    expect(nextAmenities(['water', 'parking'], false, 'parking,water')).toBeNull();
    expect(nextAmenities([], true, '')).toBeNull();
  });

  it('lets ticked items win over "none of these"', () => {
    expect(nextAmenities(['toilets'], true, '')).toEqual(['toilets']);
  });
});
