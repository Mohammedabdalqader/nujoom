import { describe, expect, it } from 'vitest';

import { isCatalogPhotoQaEnabled, parseCatalogPhotoQaManifest } from './catalogPhotoQa';

describe('catalog photo QA gate', () => {
  it('shows only in explicitly opted-in production-mode development', () => {
    expect(isCatalogPhotoQaEnabled(true, false, '1')).toBe(true);
    expect(isCatalogPhotoQaEnabled(true, false, undefined)).toBe(false);
    expect(isCatalogPhotoQaEnabled(true, true, '1')).toBe(false);
    expect(isCatalogPhotoQaEnabled(false, false, '1')).toBe(false);
  });

  it('fails closed on absent or malformed manifests', () => {
    expect(parseCatalogPhotoQaManifest(undefined)).toEqual([]);
    expect(parseCatalogPhotoQaManifest('{')).toEqual([]);
    expect(parseCatalogPhotoQaManifest('[{"imageUrl":"http://unsafe"}]')).toEqual([]);
  });

  it('accepts a source-credited HTTPS photo', () => {
    const photo = {
      name: { ar: 'ملعب', en: 'Pitch' },
      city: { ar: 'عمّان', en: 'Amman' },
      imageUrl: 'https://example.test/photo.jpg',
      sourceUrl: 'https://example.test/rights',
      credit: 'Photographer · CC0',
    };
    expect(parseCatalogPhotoQaManifest(JSON.stringify([photo]))).toEqual([photo]);
  });
});
