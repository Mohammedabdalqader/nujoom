import { describe, expect, it } from 'vitest';

import { mergeCatalogPages } from './catalogPagination';

const listing = (pitchId: string) => ({ pitchId });

describe('mergeCatalogPages', () => {
  it('replaces old results when filters return the first page', () => {
    expect(mergeCatalogPages([listing('old')], [listing('new')], 0)).toEqual([listing('new')]);
  });

  it('appends the next page without duplicate fields', () => {
    expect(
      mergeCatalogPages(
        [listing('a'), listing('b')],
        [listing('b'), listing('c'), listing('c')],
        2,
      ),
    ).toEqual([listing('a'), listing('b'), listing('c')]);
  });
});
