import { APP_NAME, errorKey, formatDateTime } from '@nujoom/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { SiteShell } from '@/components/SiteShell';
import { getT, localeFrom } from '@/lib/i18n';
import { serverSupabase } from '@/lib/supabase/server';

import { createProfileAndJoin, joinTeam } from '../../actions';

type Props = {
  params: Promise<{ locale: string; token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
type Named = { ar: string | null; en: string | null } | null;
const TOKEN = /^[0-9a-f]{64}$/;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: getT(localeFrom((await params).locale))('web.join.title'),
    robots: 'noindex, nofollow',
  };
}

const button =
  'rounded-full bg-primary-container px-5 py-2 font-bold text-on-primary hover:opacity-90';
const input =
  'w-full rounded-lg border border-border bg-surface-container-low px-3 py-2 text-on-surface focus:border-primary focus:outline-none';

/**
 * Where a staff link lands (D-069). Signed out: explain and sign in. Signed in: which venue, who
 * invited, then join. Someone without an adult profile gives the basics first (D-059). The page
 * sends no referrer and is never cached (next.config), since the path holds the token.
 */
export default async function JoinPage({ params, searchParams }: Props) {
  const { locale: rawLocale, token } = await params;
  const locale = localeFrom(rawLocale);
  if (!TOKEN.test(token)) notFound();
  const sp = await searchParams;
  const error = typeof sp.error === 'string' ? sp.error : undefined;
  const wantsProfile = sp.profile === '1';
  const t = getT(locale);
  const pick = (n: unknown) => {
    const v = n as Named;
    return (locale === 'ar' ? (v?.ar ?? v?.en) : (v?.en ?? v?.ar)) ?? '';
  };
  const here = `/${locale}/venue/join/${token}`;
  const supabase = await serverSupabase();
  const { data: auth } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  const card = (children: React.ReactNode) => (
    <SiteShell locale={locale} path={`/venue/join/${token}`}>
      <h1 className="mb-4 font-headline text-3xl font-bold">{t('web.join.title')}</h1>
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface-container p-5">
        {error ? (
          <p role="alert" className="rounded-lg border border-error/50 p-3 text-error">
            {t(errorKey(error))}
          </p>
        ) : null}
        {children}
      </div>
    </SiteShell>
  );

  if (!supabase || !auth.user) {
    return card(
      <>
        <p>{t('web.join.signInBody')}</p>
        <Link
          href={`/${locale}/sign-in?next=${encodeURIComponent(here)}`}
          className={`${button} self-start`}
        >
          {t('web.join.signIn')}
        </Link>
      </>,
    );
  }

  const { data, error: previewError } = await supabase.rpc('staff_invite_preview', {
    p_token: token,
  });
  if (previewError || !data) {
    return card(
      <>
        <p>{t(errorKey(previewError?.message ?? 'invalid_staff_invite'))}</p>
        <Link href={`/${locale}/venue`} className="text-primary hover:underline">
          {t('web.join.open')}
        </Link>
      </>,
    );
  }
  const preview = data as {
    name: Named;
    city: Named;
    invited_by: string | null;
    expires_at: string;
    already_staff: boolean;
  };
  const venue = pick(preview.name);

  if (preview.already_staff) {
    return card(
      <>
        <p>{t('web.join.already', { venue })}</p>
        <Link href={`/${locale}/venue`} className={`${button} self-start`}>
          {t('web.join.open')}
        </Link>
      </>,
    );
  }

  const intro = (
    <>
      <p className="text-lg">
        {t('web.join.intro', {
          name: preview.invited_by ?? '—',
          venue,
          city: pick(preview.city),
          app: APP_NAME[locale],
        })}
      </p>
      <p className="text-sm text-on-surface-variant">{t('web.join.what')}</p>
      <p className="text-xs text-on-surface-variant">
        {t('web.join.expires', {
          date: formatDateTime(preview.expires_at, locale, { dateStyle: 'medium' }),
        })}
      </p>
    </>
  );

  if (wantsProfile) {
    const maxDob = new Date(Date.now() - 18 * 365.25 * 864e5).toISOString().slice(0, 10);
    return card(
      <>
        {intro}
        <h2 className="font-headline text-xl font-bold">{t('web.owner.profileTitle')}</h2>
        <p className="text-sm text-on-surface-variant">{t('web.join.profileHint')}</p>
        <form action={createProfileAndJoin} className="flex flex-col gap-4">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="token" value={token} />
          <label className="flex flex-col gap-1 text-sm">
            {t('web.owner.name')}
            <input name="name" required minLength={2} maxLength={40} className={input} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {t('web.owner.dob')}
            <input name="dob" type="date" required max={maxDob} className={input} dir="ltr" />
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input name="accept" type="checkbox" value="yes" required className="mt-1" />
            <span>
              {t('web.owner.accept')} (
              <Link href={`/${locale}/legal/terms`} className="text-primary hover:underline">
                {t('legal.terms')}
              </Link>
              {' · '}
              <Link href={`/${locale}/legal/privacy`} className="text-primary hover:underline">
                {t('legal.privacy')}
              </Link>
              )
            </span>
          </label>
          <button type="submit" className={`${button} self-start`}>
            {t('web.join.join')}
          </button>
        </form>
      </>,
    );
  }

  return card(
    <>
      {intro}
      <form action={joinTeam}>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="token" value={token} />
        <button type="submit" className={button}>
          {t('web.join.join')}
        </button>
      </form>
    </>,
  );
}
