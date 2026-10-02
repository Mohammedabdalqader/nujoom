import type { CatalogListing } from '@/data/catalog';

function normalize(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[\u0640\u064b-\u065f]/g, '')
    .toLocaleLowerCase()
    .trim();
}

export function filterSavedCatalog(
  items: readonly CatalogListing[],
  query: string,
  playersPerSide: number | null,
): CatalogListing[] {
  const term = normalize(query);
  return items.filter((item) => {
    if (playersPerSide !== null && item.playersPerSide !== playersPerSide) return false;
    if (!term) return true;
    const names = [item.facilityName, item.label, item.city, item.neighborhood]
      .flatMap((name) => (name ? [name.ar ?? '', name.en ?? ''] : []))
      .join(' ');
    return normalize(names).includes(term);
  });
}
