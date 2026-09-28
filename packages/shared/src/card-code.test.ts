import { describe, expect, it } from 'vitest';

import { normalizeCardCode } from './card-code';

describe('normalizeCardCode', () => {
  it('accepts the printed form and loose variants', () => {
    expect(normalizeCardCode('NJM-4421')).toBe('NJM-4421');
    expect(normalizeCardCode(' njm 4421 ')).toBe('NJM-4421');
    expect(normalizeCardCode('NJM4421')).toBe('NJM-4421');
    expect(normalizeCardCode('4421')).toBe('NJM-4421');
    expect(normalizeCardCode('njm-a7k2q9')).toBe('NJM-A7K2Q9');
  });

  it('reads Arabic-Indic digits', () => {
    expect(normalizeCardCode('٤٤٢١')).toBe('NJM-4421');
    expect(normalizeCardCode('NJM-۸۷۰۲')).toBe('NJM-8702');
  });

  it('rejects what cannot be a code', () => {
    expect(normalizeCardCode('')).toBeNull();
    expect(normalizeCardCode('NJM-')).toBeNull();
    expect(normalizeCardCode('123')).toBeNull();
    expect(normalizeCardCode('طارق')).toBeNull();
    expect(normalizeCardCode('ABCDEF')).toBeNull();
    expect(normalizeCardCode('NJM-123456789')).toBeNull();
  });
});
