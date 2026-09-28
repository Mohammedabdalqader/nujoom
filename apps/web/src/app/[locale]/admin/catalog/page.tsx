import type { Metadata } from 'next';
import Link from 'next/link';

import { AdminFrame } from '@/components/AdminFrame';
import { adminSession } from '@/lib/admin';
import { getT, localeFrom } from '@/lib/i18n';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ state?: string; q?: string; cursor?: string }>;
};

const STATES = [
  'candidate',
  'published',
  'hidden',
  'duplicate',
  'closed',
  'rejected',
  'all',
] as const;

type Row = {
  facility_id: string;
  name: { ar: string | null; en: string | null };
  city: { ar: string; en: string } | null;
  listing_state: string;
  operator_state: string;
  fields: { pitch_id: string; badge: string; listing_state: string }[];
  waiting: Record<string, number>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: getT(localeFrom((await params).locale))('web.admin.catalog'),
    robots: 'noindex, nofollow',
  };
}

/** The directory in any state (default: candidates to review), densest view first (D-053). */
export default async function AdminCatalog({ params, searchParams }: Props) {
  const locale = localeFrom((await params).locale);
  const t = getT(locale);
  const query = await searchParams;
  const state = (STATES as readonly string[]).includes(query.state ?? '')
    ? query.state!
    : 'candidate';
  const session = await adminSession(locale, `/${locale}/admin/catalog`);
  const { data } = session
    ? await session.supabase.rpc('admin_catalog_listings', {
        p: { state, q: query.q || undefined, cursor: Number(query.cursor) || 0 },
      })
    : { data: null };
  const rows = ((data as { items?: Row[] } | null)?.items ?? []) as Row[];
  const next = (data as { next_cursor?: number | null } | null)?.next_cursor ?? null;
  const pick = (v: { ar: string | null; en: string | null } | null) =>
    v ? (locale === 'ar' ? (v.ar ?? v.en) : (v.en ?? v.ar)) : null;

  return (
    <AdminFrame locale={locale} path="/admin/catalog" allowed={session !== null}>
      <h1 className="mb-3 font-headline text-2xl font-bold">{t('web.admin.catalog')}</h1>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        {STATES.map((s) => (
          <Link
            key={s}
            href={`/${locale}/admin/catalog?state=${s}`}
            aria-current={s === state ? 'page' : undefined}
            className={`rounded-full border px-3 py-1 ${
              s === state
                ? 'border-primary-container bg-primary-container font-bold text-on-primary'
                : 'border-border text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {t(`web.admin.states.${s}`)}
          </Link>
        ))}
        <form className="ms-auto flex gap-2" action={`/${locale}/admin/catalog`}>
          <input type="hidden" name="state" value={state} />
          <input
            name="q"
            defaultValue={query.q ?? ''}
            placeholder={t('web.admin.search')}
            aria-label={t('web.admin.search')}
            className="rounded-lg border border-border bg-surface-container-low px-3 py-1.5 text-on-surface"
          />
          <button type="submit" className="rounded-lg border border-border-strong px-3 py-1.5">
            {t('web.admin.searchButton')}
          </button>
        </form>
      </div>
      {rows.length === 0 ? (
        <p className="text-on-surface-variant">{t('web.admin.empty')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-start text-sm">
            <thead className="text-xs text-on-surface-variant">
              <tr className="border-b border-border">
                {(['name', 'city', 'state', 'operator', 'fields', 'waiting'] as const).map((c) => (
                  <th key={c} className="px-2 py-2 text-start font-normal">
                    {t(`web.admin.columns.${c}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const waiting = Object.entries(r.waiting).filter(([, n]) => n > 0);
                return (
                  <tr key={r.facility_id} className="border-b border-border/60 align-top">
                    <td className="px-2 py-2">
                      <Link
                        href={`/${locale}/admin/catalog/${r.facility_id}`}
                        className="font-bold text-primary hover:underline"
                      >
                        {pick(r.name) ?? t('web.admin.unknown')}
                      </Link>
                    </td>
                    <td className="px-2 py-2">{r.city ? r.city[locale] : '—'}</td>
                    <td className="px-2 py-2">{t(`web.admin.states.${r.listing_state}`)}</td>
                    <td className="px-2 py-2">{t(`web.admin.operator.${r.operator_state}`)}</td>
                    <td className="px-2 py-2">
                      {r.fields.map((f) => t(`web.admin.badge.${f.badge}`)).join(' · ') || '—'}
                    </td>
                    <td className="px-2 py-2">
                      {waiting.length
                        ? waiting.map(([k, n]) => `${n} ${t(`web.admin.waiting.${k}`)}`).join(' · ')
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {next !== null ? (
        <Link
          href={`/${locale}/admin/catalog?state=${state}&cursor=${next}${query.q ? `&q=${encodeURIComponent(query.q)}` : ''}`}
          className="mt-4 inline-block text-primary hover:underline"
        >
          {t('web.admin.next')}
        </Link>
      ) : null}
    </AdminFrame>
  );
}
