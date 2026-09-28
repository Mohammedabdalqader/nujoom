/**
 * Post-sign-in destinations. A crafted `?next=` or deep link must never send a user to another
 * site (open redirect) or to an unexpected screen, so only known shapes pass.
 */

/** Web: same-site paths under the current locale. */
export function safeRedirectPath(
  next: string | null | undefined,
  locale: string,
  fallback: string,
): string {
  if (!next) return fallback;
  if (!next.startsWith(`/${locale}/`) && next !== `/${locale}`) return fallback;
  if (next.startsWith('//') || next.includes('\\') || /[\r\n]/.test(next)) return fallback;
  return next;
}

/** App routes a sign-in may resume to (invite links, guardian links, a player profile). */
const APP_RESUME = [
  /^\/j\/[A-Za-z0-9_-]{16,128}$/,
  /^\/guardian\/accept\/[A-Za-z0-9_-]{16,128}$/,
  /^\/player\/[0-9a-f-]{36}$/,
];

/** Mobile: the stored destination if it is one of the allowed routes, else null. */
export function safeAppResumePath(path: string | null | undefined): string | null {
  if (!path) return null;
  const clean = path.split(/[?#]/)[0]!;
  return APP_RESUME.some((re) => re.test(clean)) ? clean : null;
}
