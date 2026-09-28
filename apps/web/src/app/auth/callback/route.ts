import { isLocale } from '@nujoom/i18n';
import { safeRedirectPath } from '@nujoom/shared';
import { NextResponse, type NextRequest } from 'next/server';

import { serverSupabase } from '@/lib/supabase/server';

/**
 * Email magic links and OAuth return here with a PKCE `code`. Only same-site paths under a
 * locale are accepted as `next` (no open redirect); anything else lands on the front page.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = searchParams.get('next');
  const localeGuess = next?.split('/')[1];
  const locale = isLocale(localeGuess) ? localeGuess : 'ar';
  const destination = safeRedirectPath(next, locale, `/${locale}`);
  const code = searchParams.get('code');

  const supabase = await serverSupabase();
  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(destination, origin));
  }
  const failed = new URL(`/${locale}/sign-in`, origin);
  failed.searchParams.set('error', 'link');
  failed.searchParams.set('next', destination);
  return NextResponse.redirect(failed);
}
