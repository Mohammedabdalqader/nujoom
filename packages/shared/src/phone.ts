import { DEFAULT_COUNTRY_CALLING_CODE } from './constants';

const ARABIC_INDIC_ZERO = 0x0660; // ٠
const EXTENDED_ARABIC_INDIC_ZERO = 0x06f0; // ۰ (Persian/Urdu keyboards)

/** Converts Arabic-Indic and Extended Arabic-Indic digits to 0-9. */
export function normalizeDigits(input: string): string {
  return input.replace(/[٠-٩۰-۹]/g, (char) => {
    const code = char.charCodeAt(0);
    const zero =
      code >= EXTENDED_ARABIC_INDIC_ZERO ? EXTENDED_ARABIC_INDIC_ZERO : ARABIC_INDIC_ZERO;
    return String(code - zero);
  });
}

const E164 = /^\+[1-9]\d{7,14}$/;

/** Jordanian mobile numbers: +962 7[7-9] followed by 7 digits. */
const JORDAN_MOBILE = /^\+9627[789]\d{7}$/;

export function isE164(value: string): boolean {
  return E164.test(value);
}

export function isJordanMobile(value: string): boolean {
  return JORDAN_MOBILE.test(value);
}

/**
 * Normalises user input to E.164. Accepts local Jordanian forms
 * ("0791234567", "791234567"), international forms ("00962…", "+962…"),
 * spaces/dashes/parentheses and Arabic-Indic digits. Returns null if invalid.
 */
export function normalizePhone(
  input: string,
  defaultCallingCode: string = DEFAULT_COUNTRY_CALLING_CODE,
): string | null {
  let value = normalizeDigits(input).replace(/[\s\-().‎‏]/g, '');
  if (value.startsWith('00')) value = `+${value.slice(2)}`;
  if (!value.startsWith('+')) {
    value = `${defaultCallingCode}${value.replace(/^0+/, '')}`;
  }
  // Drop a trunk zero written after the country code, e.g. +962 079…
  if (value.startsWith(`${defaultCallingCode}0`)) {
    value = defaultCallingCode + value.slice(defaultCallingCode.length + 1);
  }
  if (!isE164(value)) return null;
  if (value.startsWith('+962') && !isJordanMobile(value)) return null;
  return value;
}
