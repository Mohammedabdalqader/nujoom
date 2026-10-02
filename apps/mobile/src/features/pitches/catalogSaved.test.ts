import { describe, expect, it } from 'vitest';

import type { CatalogListing } from '@/data/catalog';
import { filterSavedCatalog } from './catalogSaved';

const items = [
  {
    pitchId: 'a',
    facilityName: { ar: 'ملعب النجوم', en: 'Nujoom Pitch' },
    label: null,
    city: { ar: 'عمّان', en: 'Amman' },
    neighborhood: { ar: 'الجبيهة', en: 'Jubeiha' },
    playersPerSide: 5,
  },
  {
    pitchId: 'b',
    facilityName: { ar: 'ملعب اليرموك', en: 'Yarmouk Field' },
    label: { ar: 'الملعب الثاني', en: 'Field Two' },
    city: { ar: 'إربد', en: 'Irbid' },
    neighborhood: null,
    playersPerSide: 7,
  },
] as CatalogListing[];

describe('filterSavedCatalog', () => {
  it('keeps the server order and includes saved pitches across cities', () => {
    expect(filterSavedCatalog(items, '', null).map((item) => item.pitchId)).toEqual(['a', 'b']);
  });

  it('matches Arabic and English names or areas', () => {
    expect(filterSavedCatalog(items, 'الجبيهة', null).map((item) => item.pitchId)).toEqual(['a']);
    expect(filterSavedCatalog(items, 'FIELD TWO', null).map((item) => item.pitchId)).toEqual(['b']);
    expect(filterSavedCatalog(items, 'عمان', null).map((item) => item.pitchId)).toEqual(['a']);
  });

  it('applies size together with search and preserves unknown sizes only for any size', () => {
    expect(filterSavedCatalog(items, 'ملعب', 7).map((item) => item.pitchId)).toEqual(['b']);
    expect(filterSavedCatalog(items, 'Jubeiha', 7)).toEqual([]);
  });
});
