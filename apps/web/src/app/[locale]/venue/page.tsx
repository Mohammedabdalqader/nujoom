import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { ERROR_KEYS, errorKey } from '@nujoom/shared';

import { SiteShell } from '@/components/SiteShell';
import { getT, localeFrom, type Locale } from '@/lib/i18n';
import { serverSupabase } from '@/lib/supabase/server';

import { claimVenue, confirmField, createProfileAndClaim, setSchedule } from './actions';
import { PhotoUpload, type PhotoStrings } from './PhotoUpload';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
type Json = Record<string, unknown>;
type Named = { ar: string | null; en: string | null } | null;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: getT(localeFrom((await params).locale))('web.owner.title'),
    robots: 'noindex, nofollow',
  };
}

const pick = (n: unknown, locale: Locale) => {
  const v = n as Named;
  return (locale === 'ar' ? (v?.ar ?? v?.en) : (v?.en ?? v?.ar)) ?? null;
};

const input =
  'w-full rounded-lg border border-border bg-surface-container-low px-3 py-2 text-on-surface focus:border-primary focus:outline-none';
const button =
  'rounded-full bg-primary-container px-5 py-2 text-sm font-bold text-on-primary hover:opacity-90';
const quiet =
  'rounded-full border border-border-strong px-4 py-1.5 text-sm text-on-surface hover:border-primary';

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-container p-4">{children}</div>
  );
}

function Heading({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 mt-8 font-headline text-xl font-bold">{children}</h2>;
}

function Hidden({ fields }: { fields: Record<string, string> }) {
  return Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />);
}

/**
 * The venue owner's page on the website (D-060): claim a listed venue, then run the ones you
 * manage (price, booking length, schedule on or off). Signed-out visitors go to sign-in first.
 * Everything shown comes from my_venues / my_claims / search_pitches, and every change goes
 * through the owner RPCs, which check staff membership again.
 */
export default async function VenuePage({ params, searchParams }: Props) {
  const locale = localeFrom((await params).locale);
  // Hand-edited URLs can repeat a parameter (an array); only single strings count.
  const sp = await searchParams;
  const one = (v: unknown) => (typeof v === 'string' ? v : undefined);
  const [q, profileFor, done, error] = [sp.q, sp.profile_for, sp.done, sp.error].map(one);
  const t = getT(locale);
  const supabase = await serverSupabase();
  const { data: auth } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (supabase && !auth.user)
    redirect(`/${locale}/sign-in?next=${encodeURIComponent(`/${locale}/venue`)}`);

  const notice = (
    <>
      {done ? (
        <p role="status" className="mb-4 rounded-lg border border-secondary/50 p-3 text-secondary">
          {done === 'claimed' ? t('web.owner.claimSent') : t('web.owner.done')}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mb-4 rounded-lg border border-error/50 p-3 text-error">
          {t(errorKey(error))}
        </p>
      ) : null}
    </>
  );

  // A web-only owner without a profile: collect the minimum, then claim (D-059).
  if (supabase && profileFor && UUID.test(profileFor)) {
    const maxDob = new Date(Date.now() - 18 * 365.25 * 864e5).toISOString().slice(0, 10);
    return (
      <SiteShell locale={locale} path="/venue">
        <h1 className="mb-2 font-headline text-3xl font-bold">{t('web.owner.profileTitle')}</h1>
        <p className="mb-6 text-on-surface-variant">{t('web.owner.profileHint')}</p>
        {notice}
        <Card>
          <form action={createProfileAndClaim} className="flex flex-col gap-4">
            <Hidden fields={{ locale, facility: profileFor }} />
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
              {t('web.owner.createAndClaim')}
            </button>
          </form>
        </Card>
      </SiteShell>
    );
  }

  const query = (q ?? '').trim().slice(0, 80);
  const [venuesRes, claimsRes, searchRes] = supabase
    ? await Promise.all([
        supabase.rpc('my_venues'),
        supabase.rpc('my_claims'),
        query ? supabase.rpc('search_pitches', { p: { q: query, limit: 30 } }) : null,
      ])
    : [null, null, null];
  const venues = (venuesRes?.data as Json[] | null) ?? [];
  const claims = (claimsRes?.data as Json[] | null) ?? [];
  const mine = new Set(venues.map((v) => String(v.facility_id)));
  const pending = new Set(
    claims
      .filter((c) => c.status === 'submitted' || c.status === 'evidence_requested')
      .map((c) => String(c.facility_id)),
  );
  // One result per venue: the search lists fields.
  const found = new Map<string, Json>();
  for (const row of ((searchRes?.data as { items?: Json[] } | null)?.items ?? []) as Json[]) {
    const id = String(row.facility_id);
    if (!found.has(id)) found.set(id, row);
  }
  // Short-lived previews of the owner's own photos, any review status (D-061).
  const photoPaths = venues.flatMap((v) =>
    ((v.photos as Json[] | undefined) ?? []).map((m) => String(m.path)),
  );
  const { data: signed } =
    supabase && photoPaths.length
      ? await supabase.storage.from('pitch-media').createSignedUrls(photoPaths, 600)
      : { data: [] as { path: string | null; signedUrl: string; error: string | null }[] };
  const previews = new Map((signed ?? []).map((x) => [x.path, x.error ? null : x.signedUrl]));
  const photoStrings: PhotoStrings = {
    ...(Object.fromEntries(
      [
        'add',
        'choose',
        'where',
        'wholeVenue',
        'rights',
        'upload',
        'uploading',
        'sent',
        'unreadable',
      ].map((k) => [k, t(`web.owner.photos.${k}`)]),
    ) as Omit<PhotoStrings, 'errors'>),
    errors: Object.fromEntries(ERROR_KEYS.map((key) => [key, t(key)])),
  };

  return (
    <SiteShell locale={locale} path="/venue">
      <h1 className="mb-2 font-headline text-3xl font-bold">{t('web.owner.title')}</h1>
      <p className="mb-6 text-on-surface-variant">{t('web.owner.intro')}</p>
      {notice}

      <Heading>{t('web.owner.venuesTitle')}</Heading>
      {venues.length === 0 ? (
        <p className="text-on-surface-variant">{t('web.owner.noVenues')}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {venues.map((v) => {
            const state = String(v.operator_state);
            const fields = (v.fields as Json[] | undefined) ?? [];
            return (
              <Card key={String(v.facility_id)}>
                <h3 className="font-headline text-lg font-bold">{pick(v.name, locale)}</h3>
                <p className="text-sm text-on-surface-variant">{pick(v.city, locale)}</p>
                <p className="mt-2 text-sm">
                  {t(
                    `web.owner.operator.${state === 'claimed' || state === 'authority_verified' ? state : 'other'}`,
                  )}
                </p>
                {fields.map((f) => {
                  const ops = f.operations as Json | null;
                  const note = (ops?.price_note as Named) ?? null;
                  const pitch = String(f.pitch_id);
                  return (
                    <div key={pitch} className="mt-4 border-t border-border pt-4">
                      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-bold">
                          {pick(f.label, locale) ?? pick(v.name, locale)}
                        </span>
                        {f.players_per_side ? (
                          <bdi dir="ltr" className="font-numeric text-on-surface-variant">
                            {String(f.players_per_side)}×{String(f.players_per_side)}
                          </bdi>
                        ) : null}
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs ${f.badge === 'verified' ? 'border-secondary/60 text-secondary' : 'border-border-strong text-on-surface-variant'}`}
                        >
                          {t(
                            `web.owner.badge.${f.badge === 'verified' ? 'verified' : 'not_verified'}`,
                          )}
                        </span>
                        <span className="text-xs text-on-surface-variant">
                          {f.bookable ? t('web.owner.bookable') : t('web.owner.notBookable')}
                        </span>
                      </div>
                      <form action={confirmField} className="grid gap-3 sm:grid-cols-2">
                        <Hidden fields={{ locale, pitch }} />
                        <label className="flex flex-col gap-1 text-sm">
                          {t('web.owner.price')}
                          <input
                            name="price"
                            inputMode="decimal"
                            required
                            dir="ltr"
                            defaultValue={
                              ops?.price_per_hour != null ? String(ops.price_per_hour) : ''
                            }
                            className={`${input} font-numeric`}
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-sm">
                          {t('web.owner.slot')}
                          <select
                            name="slot"
                            defaultValue={String(ops?.slot_minutes ?? 60)}
                            className={input}
                          >
                            {[60, 90].map((n) => (
                              <option key={n} value={n}>
                                {t('web.owner.minutes', { n })}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col gap-1 text-sm">
                          {t('web.owner.priceNoteAr')}
                          <input
                            name="note_ar"
                            maxLength={120}
                            dir="rtl"
                            lang="ar"
                            defaultValue={note?.ar ?? ''}
                            className={input}
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-sm">
                          {t('web.owner.priceNoteEn')}
                          <input
                            name="note_en"
                            maxLength={120}
                            dir="ltr"
                            lang="en"
                            defaultValue={note?.en ?? ''}
                            className={input}
                          />
                        </label>
                        <p className="text-xs text-on-surface-variant sm:col-span-2">
                          {t('web.owner.opsHint')}
                        </p>
                        <button type="submit" className={`${button} justify-self-start`}>
                          {t('web.owner.save')}
                        </button>
                      </form>
                      {ops ? (
                        <form action={setSchedule} className="mt-3 flex items-center gap-3">
                          <Hidden
                            fields={{ locale, pitch, active: ops.schedule_active ? 'off' : 'on' }}
                          />
                          <span className="text-sm text-on-surface-variant">
                            {ops.schedule_active
                              ? t('web.owner.scheduleIsOn')
                              : t('web.owner.scheduleIsOff')}
                          </span>
                          <button type="submit" className={quiet}>
                            {ops.schedule_active
                              ? t('web.owner.scheduleOff')
                              : t('web.owner.scheduleOn')}
                          </button>
                        </form>
                      ) : null}
                    </div>
                  );
                })}
                <div className="mt-4 border-t border-border pt-4">
                  <h4 className="mb-2 font-headline font-bold">{t('web.owner.photos.title')}</h4>
                  {((v.photos as Json[] | undefined) ?? []).length === 0 ? (
                    <p className="text-sm text-on-surface-variant">{t('web.owner.photos.none')}</p>
                  ) : (
                    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {((v.photos as Json[] | undefined) ?? []).map((m) => {
                        const src = previews.get(String(m.path));
                        return (
                          <li key={String(m.id)} className="flex flex-col gap-1">
                            {src ? (
                              // eslint-disable-next-line @next/next/no-img-element -- short-lived signed link
                              <img
                                src={src}
                                alt=""
                                className="aspect-[4/3] w-full rounded-lg border border-border object-cover"
                              />
                            ) : (
                              <div className="aspect-[4/3] w-full rounded-lg border border-border bg-surface-container-low" />
                            )}
                            <span
                              className={`text-xs ${m.status === 'approved' ? 'text-secondary' : m.status === 'rejected' ? 'text-error' : 'text-on-surface-variant'}`}
                            >
                              {t(`web.owner.photos.status.${String(m.status)}`)}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <PhotoUpload
                    facilityId={String(v.facility_id)}
                    fields={fields.map((f) => ({
                      id: String(f.pitch_id),
                      label: pick(f.label, locale) ?? pick(v.name, locale) ?? '',
                    }))}
                    strings={photoStrings}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {claims.length ? (
        <>
          <Heading>{t('web.owner.claimsTitle')}</Heading>
          <ul className="flex flex-col gap-2">
            {claims.map((c) => (
              <li
                key={String(c.id)}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
              >
                <span>{pick(c.name, locale)}</span>
                <span className="text-sm text-on-surface-variant">
                  {t(`web.owner.claimStatus.${String(c.status)}`)}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <Heading>{t('web.owner.findTitle')}</Heading>
      <p className="mb-3 text-sm text-on-surface-variant">{t('web.owner.findHint')}</p>
      <form method="get" className="mb-4 flex gap-2">
        <input
          name="q"
          defaultValue={query}
          maxLength={80}
          aria-label={t('web.owner.search')}
          placeholder={t('web.owner.search')}
          className={input}
        />
        <button type="submit" className={button}>
          {t('web.owner.searchButton')}
        </button>
      </form>
      {query && found.size === 0 ? (
        <p className="text-on-surface-variant">{t('web.owner.noResults')}</p>
      ) : null}
      <ul className="flex flex-col gap-2">
        {[...found.entries()].map(([id, row]) => (
          <li
            key={id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
          >
            <span>
              <span className="block">{pick(row.facility_name, locale)}</span>
              <span className="text-sm text-on-surface-variant">
                {[pick(row.neighborhood, locale), pick(row.city, locale)]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </span>
            {mine.has(id) ? null : pending.has(id) ? (
              <span className="text-sm text-on-surface-variant">{t('web.owner.claimPending')}</span>
            ) : (
              <form action={claimVenue}>
                <Hidden fields={{ locale, facility: id }} />
                <button type="submit" className={quiet}>
                  {t('web.owner.claim')}
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </SiteShell>
  );
}
