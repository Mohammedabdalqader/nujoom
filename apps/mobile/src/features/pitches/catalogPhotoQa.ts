import type { Bilingual } from '@/data/types';

/** Injected only by a local QA server; never imported from the research catalog into the app. */
export type QaStadiumPhoto = {
  name: Bilingual;
  city: Bilingual;
  imageUrl: string;
  sourceUrl: string;
  credit: string;
};

export function parseCatalogPhotoQaManifest(value: string | undefined): QaStadiumPhoto[] {
  if (!value) return [];
  try {
    const photos: unknown = JSON.parse(value);
    if (!Array.isArray(photos) || photos.length > 10) return [];
    if (
      !photos.every(
        (photo) =>
          photo &&
          typeof photo === 'object' &&
          typeof photo.name?.ar === 'string' &&
          typeof photo.name?.en === 'string' &&
          typeof photo.city?.ar === 'string' &&
          typeof photo.city?.en === 'string' &&
          typeof photo.imageUrl === 'string' &&
          photo.imageUrl.startsWith('https://') &&
          typeof photo.sourceUrl === 'string' &&
          photo.sourceUrl.startsWith('https://') &&
          typeof photo.credit === 'string',
      )
    )
      return [];
    return photos as QaStadiumPhoto[];
  } catch {
    return [];
  }
}

export function isCatalogPhotoQaEnabled(isDev: boolean, isDemo: boolean, flag: string | undefined) {
  return isDev && !isDemo && flag === '1';
}
