/**
 * Player card codes (D-025): `NJM-XXXX-XXXX`, 8 random Crockford base32 characters, assigned by
 * the database (`private.new_card_code`). Players type them on Arabic keyboards and read them off
 * a phone screen, so input tolerates Arabic-Indic digits, lower case, spaces, missing dashes, a
 * missing prefix and the usual look-alikes (O→0, I/L→1).
 */

export const CARD_CODE_PREFIX = 'NJM';

/** Crockford base32: digits and letters without I, L, O, U. Mirrors the SQL alphabet. */
export const CARD_CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

const CARD_CODE = /^NJM-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/;

const ARABIC_INDIC = /[٠-٩۰-۹]/g;

/** Arabic-Indic and Persian digits → Western digits; everything else unchanged. */
export function westernDigits(value: string): string {
  return value.replace(ARABIC_INDIC, (d) => {
    const code = d.charCodeAt(0);
    // U+0660–0669 (Arabic-Indic) and U+06F0–06F9 (Extended, Persian/Urdu).
    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
  });
}

/** True for a canonical code as the database stores it. */
export function isCardCode(value: string): boolean {
  return CARD_CODE.test(value);
}

/** The canonical code (`NJM-7K3Q-M9XR`), or null when the input cannot be one. */
export function normalizeCardCode(input: string): string | null {
  let body = westernDigits(input)
    .toUpperCase()
    .replace(/[\s\-_.]/g, '');
  if (body.startsWith(CARD_CODE_PREFIX) && body.length === CARD_CODE_PREFIX.length + 8) {
    body = body.slice(CARD_CODE_PREFIX.length);
  }
  body = body.replace(/O/g, '0').replace(/[IL]/g, '1');
  if (body.length !== 8 || [...body].some((c) => !CARD_CODE_ALPHABET.includes(c))) return null;
  return `${CARD_CODE_PREFIX}-${body.slice(0, 4)}-${body.slice(4)}`;
}
