/**
 * Player card codes ("NJM-8702"), printed on the FIFA card and used to add friends. Players type
 * them on Arabic keyboards too, so Arabic-Indic digits, lower case, spaces and a missing prefix
 * or dash are all accepted.
 */

export const CARD_CODE_PREFIX = 'NJM';

const ARABIC_INDIC = /[٠-٩۰-۹]/g;

function westernDigits(value: string): string {
  return value.replace(ARABIC_INDIC, (d) => {
    const code = d.charCodeAt(0);
    // U+0660–0669 (Arabic-Indic) and U+06F0–06F9 (Extended, Persian/Urdu).
    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
  });
}

/** The canonical code ("NJM-4421"), or null when the input cannot be one. */
export function normalizeCardCode(input: string): string | null {
  const compact = westernDigits(input)
    .toUpperCase()
    .replace(/[\s\-_]/g, '');
  const body = compact.startsWith(CARD_CODE_PREFIX)
    ? compact.slice(CARD_CODE_PREFIX.length)
    : compact;
  return /^[0-9A-Z]{4,8}$/.test(body) && /\d/.test(body) ? `${CARD_CODE_PREFIX}-${body}` : null;
}
