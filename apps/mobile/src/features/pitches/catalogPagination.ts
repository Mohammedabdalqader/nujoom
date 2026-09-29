export function mergeCatalogPages<T extends { pitchId: string }>(
  previous: T[],
  incoming: T[],
  cursor: number,
): T[] {
  if (cursor === 0) return incoming;
  const seen = new Set(previous.map((item) => item.pitchId));
  return [
    ...previous,
    ...incoming.filter((item) => {
      if (seen.has(item.pitchId)) return false;
      seen.add(item.pitchId);
      return true;
    }),
  ];
}
