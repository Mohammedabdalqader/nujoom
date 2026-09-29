import { describe, expect, it } from 'vitest';

import { demoCatalog, demoFavoritePitches, setDemoFavorite } from './catalog';

// The demo keeps the server's favourite rules (D-086), so the demo app behaves like production.
describe('demo favourites', () => {
  const verified = demoCatalog.filter((l) => l.badge === 'verified').map((l) => l.pitchId);
  const notVerified = demoCatalog.find((l) => l.badge !== 'verified')!.pitchId;

  it('adds verified fields newest first, once each', () => {
    expect(setDemoFavorite(verified[0]!, true)).toBe(true);
    expect(setDemoFavorite(verified[1]!, true)).toBe(true);
    expect(setDemoFavorite(verified[0]!, true)).toBe(true);
    expect(demoFavoritePitches().map((l) => l.pitchId)).toEqual([verified[1], verified[0]]);
  });

  it('refuses a not-verified field', () => {
    expect(() => setDemoFavorite(notVerified, true)).toThrow('pitch_unavailable');
  });

  it('removing always works, even twice', () => {
    expect(setDemoFavorite(verified[0]!, false)).toBe(false);
    expect(setDemoFavorite(verified[0]!, false)).toBe(false);
    expect(demoFavoritePitches().map((l) => l.pitchId)).toEqual([verified[1]]);
  });
});
