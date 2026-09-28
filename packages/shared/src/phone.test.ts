import { describe, expect, it } from 'vitest';

import { isJordanMobile, normalizeDigits, normalizePhone } from './phone';

describe('phone', () => {
  it('normalises Arabic-Indic digits', () => {
    expect(normalizeDigits('٠٧٩١٢٣٤٥٦٧')).toBe('0791234567');
    expect(normalizeDigits('۰۷۸')).toBe('078');
  });

  it.each([
    ['0791234567', '+962791234567'],
    ['791234567', '+962791234567'],
    ['00962 79 123 4567', '+962791234567'],
    ['+962-78-123-4567', '+962781234567'],
    ['+962 0771234567', '+962771234567'],
    ['٠٧٧١٢٣٤٥٦٧', '+962771234567'],
    ['+971501234567', '+971501234567'],
  ])('normalises %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each(['', '12345', '0761234567', '+96264123456', 'abc'])('rejects %s', (input) => {
    expect(normalizePhone(input)).toBeNull();
  });

  it('recognises Jordanian mobiles', () => {
    expect(isJordanMobile('+962791234567')).toBe(true);
    expect(isJordanMobile('+96264123456')).toBe(false);
  });
});
