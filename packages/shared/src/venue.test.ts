import { describe, expect, it } from 'vitest';

import { amenitiesKey, nextAmenities, parseDimension, parseFieldLabel } from './venue';

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

describe('parseDimension (D-067)', () => {
  it('reads metres as typed on a phone', () => {
    expect(parseDimension('length_m', '40')).toBe(40);
    expect(parseDimension('width_m', ' 20,5 ')).toBe(20.5);
    expect(parseDimension('length_m', '٤٠')).toBe(40);
    expect(parseDimension('width_m', '٢٠٫٥')).toBe(20.5);
    expect(parseDimension('length_m', '38.46')).toBe(38.5);
  });

  it('leaves an empty box alone and refuses the impossible', () => {
    expect(parseDimension('length_m', '')).toBeNull();
    expect(parseDimension('length_m', '400')).toBe('invalid');
    expect(parseDimension('width_m', '2')).toBe('invalid');
    expect(parseDimension('width_m', '-20')).toBe('invalid');
    expect(parseDimension('width_m', '20m')).toBe('invalid');
  });
});

describe('parseFieldLabel (D-067)', () => {
  it('tidies spaces, keeps empty as unchanged, caps the length', () => {
    expect(parseFieldLabel('  الملعب   الكبير ')).toBe('الملعب الكبير');
    expect(parseFieldLabel('   ')).toBeNull();
    expect(parseFieldLabel('x'.repeat(61))).toBe('invalid');
  });
});
