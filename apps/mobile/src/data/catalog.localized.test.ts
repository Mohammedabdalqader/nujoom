import { describe, expect, it } from 'vitest';

import { localizedName } from './catalog';

describe('localizedName', () => {
  it("picks the viewer's language and falls back to the other", () => {
    expect(localizedName({ ar: 'ملعب', en: 'Pitch' }, 'ar')).toBe('ملعب');
    expect(localizedName({ ar: 'ملعب', en: 'Pitch' }, 'en')).toBe('Pitch');
    expect(localizedName({ ar: 'ملعب', en: null }, 'en')).toBe('ملعب');
    expect(localizedName({ ar: null, en: 'Pitch' }, 'ar')).toBe('Pitch');
    expect(localizedName(null, 'ar')).toBe('');
  });
});
