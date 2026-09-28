import { describe, expect, it } from 'vitest';

import { CARD_CODE_ALPHABET, isCardCode, normalizeCardCode } from './card-code';

describe('normalizeCardCode', () => {
  it('accepts the printed form and loose variants', () => {
    expect(normalizeCardCode('NJM-7K3Q-M9XR')).toBe('NJM-7K3Q-M9XR');
    expect(normalizeCardCode(' njm 7k3q m9xr ')).toBe('NJM-7K3Q-M9XR');
    expect(normalizeCardCode('NJM7K3QM9XR')).toBe('NJM-7K3Q-M9XR');
    expect(normalizeCardCode('7k3q-m9xr')).toBe('NJM-7K3Q-M9XR');
  });

  it('reads Arabic-Indic digits and fixes look-alike letters', () => {
    expect(normalizeCardCode('NJM-٧K٣Q-M٩XR')).toBe('NJM-7K3Q-M9XR');
    expect(normalizeCardCode('NJM-O1IL-0000')).toBe('NJM-0111-0000');
  });

  it('rejects what cannot be a code', () => {
    expect(normalizeCardCode('')).toBeNull();
    expect(normalizeCardCode('NJM-')).toBeNull();
    expect(normalizeCardCode('NJM-4421')).toBeNull(); // the prototype's short demo number
    expect(normalizeCardCode('NJM-7K3Q-M9X')).toBeNull();
    expect(normalizeCardCode('NJM-7K3Q-M9XRR')).toBeNull();
    expect(normalizeCardCode('NJM-7K3Q-M9XU')).toBeNull(); // U is not in Crockford base32
    expect(normalizeCardCode('طارق')).toBeNull();
  });

  it('matches the database format', () => {
    expect(CARD_CODE_ALPHABET).toHaveLength(32);
    expect(isCardCode('NJM-7K3Q-M9XR')).toBe(true);
    expect(isCardCode('NJM-7K3Q-M9XU')).toBe(false);
    expect(isCardCode('njm-7k3q-m9xr')).toBe(false);
  });
});
