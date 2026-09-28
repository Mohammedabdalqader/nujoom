import { ERROR_KEYS, safeRedirectPath } from '@nujoom/shared';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { SiteShell } from '@/components/SiteShell';
import { getT, localeFrom } from '@/lib/i18n';
import { serverSupabase } from '@/lib/supabase/server';

import { SignInForm, type SignInStrings } from './SignInForm';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; error?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: getT(localeFrom((await params).locale))('auth.title'), robots: 'noindex' };
}

/**
 * Web sign-in (S1-8): the same email code as the app (docs/DESIGN.md §Slice 1). Used by guardians
 * approving a youth now, and by pitch owners and admins later. Never says whether an account
 * exists. `next` is limited to same-site paths under this locale.
 */
export default async function SignInPage({ params, searchParams }: Props) {
  const locale = localeFrom((await params).locale);
  const { next: rawNext, error } = await searchParams;
  const next = safeRedirectPath(rawNext, locale, `/${locale}`);
  const t = getT(locale);

  const supabase = await serverSupabase();
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    if (data.user) redirect(next);
  }

  const strings: SignInStrings = {
    title: t('auth.title'),
    emailLabel: t('auth.emailLabel'),
    emailPlaceholder: t('auth.emailPlaceholder'),
    sendCode: t('auth.sendCode'),
    sending: t('auth.sending'),
    haveCode: t('auth.haveCode'),
    checkTitle: t('auth.checkTitle'),
    checkBody: t('auth.checkBody', { email: '{{email}}' }),
    codeLabel: t('auth.codeLabel'),
    verify: t('auth.verify'),
    verifying: t('auth.verifying'),
    changeEmail: t('auth.changeEmail'),
    emailInvalid: t('errors.auth.emailInvalid'),
    linkFailed: t('errors.auth.codeInvalid'),
    unconfigured: t('errors.generic'),
    errors: Object.fromEntries(ERROR_KEYS.map((key) => [key, t(key)])),
  };

  return (
    <SiteShell locale={locale} path="/sign-in">
      <SignInForm
        locale={locale}
        next={next}
        strings={strings}
        linkError={error === 'link'}
        configured={supabase !== null}
      />
    </SiteShell>
  );
}
