import { ERROR_KEYS } from '@nujoom/shared';
import type { Metadata } from 'next';

import { SiteShell } from '@/components/SiteShell';
import { getT, localeFrom } from '@/lib/i18n';
import { serverSupabase } from '@/lib/supabase/server';

import { AccountData, type AccountStrings } from './AccountData';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: getT(localeFrom((await params).locale))('web.account') };
}

/**
 * The web account page (S1-8/S1-9, D-042): download my data and delete my account, the same
 * as the app's Settings. Signed out it explains how deletion works and links to sign-in, so it
 * is also the public account-deletion link the app stores ask for.
 */
export default async function AccountPage({ params }: Props) {
  const locale = localeFrom((await params).locale);
  const t = getT(locale);
  const supabase = await serverSupabase();
  const { data } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const email = data.user?.email ?? null;

  const s = (key: string) => t(`settings.${key}`);
  const strings: AccountStrings = {
    title: t('web.account'),
    signedInAs: t('settings.signedInAs', { email: '{{email}}' }),
    signedOut: t('web.accountSignedOut'),
    signIn: t('auth.title'),
    signOut: s('signOut'),
    data: s('data'),
    dataExplain: s('dataExplain'),
    download: s('download'),
    preparing: s('preparing'),
    downloadReady: t('settings.downloadReady', { date: '{{date}}' }),
    openDownload: s('openDownload'),
    delete: s('delete'),
    deleteExplain: s('deleteExplain'),
    deleteConfirm: s('deleteConfirm'),
    keep: s('keep'),
    deleteScheduled: t('settings.deleteScheduled', { date: '{{date}}' }),
    cancelDelete: s('cancelDelete'),
    deleteCancelled: s('deleteCancelled'),
    errors: Object.fromEntries(ERROR_KEYS.map((key) => [key, t(key)])),
  };

  return (
    <SiteShell locale={locale} path="/account">
      <AccountData locale={locale} email={email} strings={strings} />
    </SiteShell>
  );
}
