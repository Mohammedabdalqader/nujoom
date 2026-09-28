import { APP_NAME, ERROR_KEYS } from '@nujoom/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { SiteShell } from '@/components/SiteShell';
import { getT, localeFrom } from '@/lib/i18n';

import { GuardianApproval, type ApprovalStrings } from './GuardianApproval';

type Props = { params: Promise<{ locale: string; token: string }> };

// Matches safeAppResumePath's guardian route: long random tokens only.
const TOKEN = /^[A-Za-z0-9_-]{16,128}$/;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = getT(localeFrom((await params).locale));
  return { title: t('guardianApprove.title'), robots: 'noindex, nofollow' };
}

/**
 * The guardian's approval page (S1-8/S1-11, spec §7): where the invite email lands once
 * `APPROVAL_URL` points at the web app. The same rules as the in-app screen (D-033): only the
 * invited address sees anything, visibility starts private, and recording has no default.
 */
export default async function GuardianAcceptPage({ params }: Props) {
  const { locale: rawLocale, token } = await params;
  const locale = localeFrom(rawLocale);
  if (!TOKEN.test(token)) notFound();
  const t = getT(locale);
  const g = (key: string) => t(`guardianApprove.${key}`);

  const strings: ApprovalStrings = {
    title: g('title'),
    signInBody: g('signInBody'),
    signIn: g('signIn'),
    invalidBody: t('guardianApprove.invalidBody', { email: '{{email}}' }),
    switchAccount: g('switchAccount'),
    intro: t('guardianApprove.intro', { name: '{{name}}', app: APP_NAME[locale] }),
    explain: g('explain'),
    expires: t('guardianApprove.expires', { date: '{{date}}' }),
    visibility: g('visibility'),
    visibilityOptions: {
      private: g('visibilityOptions.private'),
      city: g('visibilityOptions.city'),
      public: g('visibilityOptions.public'),
    },
    visibilityHint: {
      private: g('visibilityHint.private'),
      city: g('visibilityHint.city'),
      public: g('visibilityHint.public'),
    },
    recording: g('recording'),
    recordingYes: g('recordingYes'),
    recordingNo: g('recordingNo'),
    recordingHint: g('recordingHint'),
    yourDetails: g('yourDetails'),
    yourDetailsHint: g('yourDetailsHint'),
    name: g('name'),
    nameError: g('nameError'),
    dob: t('onboarding.dob'),
    day: t('onboarding.day'),
    month: t('onboarding.month'),
    year: t('onboarding.year'),
    dobError: g('dobError'),
    approve: g('approve'),
    approving: g('approving'),
    decline: g('decline'),
    declineConfirm: t('guardianApprove.declineConfirm', { name: '{{name}}' }),
    declineYes: g('declineYes'),
    cancel: t('guardianStep.cancel'),
    approved: t('guardianApprove.approved', { name: '{{name}}' }),
    declined: g('declined'),
    guardianOnly: g('guardianOnly'),
    done: g('done'),
    signOut: g('signOut'),
    retry: t('errors.retry'),
    errors: Object.fromEntries(ERROR_KEYS.map((key) => [key, t(key)])),
  };

  return (
    <SiteShell locale={locale} path={`/guardian/accept/${token}`}>
      <GuardianApproval locale={locale} token={token} strings={strings} />
    </SiteShell>
  );
}
