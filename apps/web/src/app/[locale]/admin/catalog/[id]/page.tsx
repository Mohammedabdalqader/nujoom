import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { errorKey } from '@nujoom/shared';

import { AdminFrame } from '@/components/AdminFrame';
import { adminSession } from '@/lib/admin';
import { getT, localeFrom } from '@/lib/i18n';

import { decideClaim, decideReport, reviewListing } from './actions';

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ done?: string; error?: string }>;
};
type Json = Record<string, unknown>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: getT(localeFrom((await params).locale))('web.admin.catalog'),
    robots: 'noindex, nofollow',
  };
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 border-b border-border pb-1 font-headline text-lg font-bold">
        {title}
        {count !== undefined ? (
          <span className="ms-2 font-numeric text-sm text-on-surface-variant">{count}</span>
        ) : null}
      </h2>
      {children}
    </section>
  );
}

function Rows({ rows, cols }: { rows: Json[]; cols: [string, (r: Json) => ReactNode][] }) {
  if (!rows.length) return <p className="text-sm text-on-surface-variant">—</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs text-on-surface-variant">
          <tr className="border-b border-border">
            {cols.map(([h], c) => (
              <th key={c} className="px-2 py-1 text-start font-normal">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border/50 align-top">
              {cols.map(([, cell], c) => (
                <td key={c} className="px-2 py-1">
                  {cell(r) ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Dates, codes and English notes are isolated so they keep their order inside Arabic rows.
const when = (v: unknown) =>
  typeof v === 'string' ? (
    <bdi dir="ltr" className="font-numeric whitespace-nowrap">
      {v.slice(0, 16).replace('T', ' ')}
    </bdi>
  ) : null;
const text = (v: unknown) => (v === null || v === undefined || v === '' ? null : String(v));

type Tone = 'plain' | 'primary' | 'danger';

/** One decision button: a tiny form posting to a server action (works without client JS). */
function Act({
  action,
  fields,
  label,
  tone = 'plain',
}: {
  action: (form: FormData) => Promise<void>;
  fields: Record<string, string>;
  label: string;
  tone?: Tone;
}) {
  const cls = {
    plain: 'border-border-strong text-on-surface hover:border-primary',
    primary: 'border-primary-container bg-primary-container font-bold text-on-primary',
    danger: 'border-error/60 text-error',
  }[tone];
  return (
    <form action={action} className="inline">
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button type="submit" className={`rounded-md border px-2.5 py-1 text-xs ${cls}`}>
        {label}
      </button>
    </form>
  );
}

// Which listing decisions make sense from each state.
const NEXT: Record<string, { action: string; tone: Tone }[]> = {
  candidate: [
    { action: 'publish', tone: 'primary' },
    { action: 'reject', tone: 'danger' },
  ],
  published: [
    { action: 'hide', tone: 'plain' },
    { action: 'mark_closed', tone: 'danger' },
  ],
  hidden: [
    { action: 'publish', tone: 'primary' },
    { action: 'mark_closed', tone: 'danger' },
  ],
};

/** One venue, everything a reviewer needs (D-053), and the decisions on it (D-055). */
export default async function AdminVenue({ params, searchParams }: Props) {
  const { locale: rawLocale, id } = await params;
  const { done, error } = await searchParams;
  const locale = localeFrom(rawLocale);
  if (!UUID.test(id)) notFound();
  const t = getT(locale);
  const session = await adminSession(locale, `/${locale}/admin/catalog/${id}`);
  const { data } = session
    ? await session.supabase.rpc('admin_catalog_detail', { p_facility: id })
    : { data: null };
  if (session && !data) notFound();
  const d = (data ?? {}) as Json;
  const f = (d.facility ?? {}) as Json;
  const list = (k: string) => (d[k] as Json[] | undefined) ?? [];
  const yesNo = (v: unknown) =>
    v === true ? t('web.admin.fact.yes') : v === false ? t('web.admin.fact.no') : null;
  const name = (locale === 'ar' ? (f.name_ar ?? f.name_en) : (f.name_en ?? f.name_ar)) as
    string | null;
  const base = { locale, facility: id };
  const listingButtons = (target: 'facility' | 'pitch', targetId: string, state: unknown) =>
    (NEXT[String(state)] ?? []).map(({ action, tone }) => (
      <Act
        key={action}
        action={reviewListing}
        fields={{ ...base, target, id: targetId, action }}
        label={t(`web.admin.actions.${action}`)}
        tone={tone}
      />
    ));

  return (
    <AdminFrame locale={locale} path={`/admin/catalog/${id}`} allowed={session !== null}>
      <Link
        href={`/${locale}/admin/catalog`}
        className="mb-3 inline-block text-sm text-primary hover:underline"
      >
        {t('web.admin.backToList')}
      </Link>
      <h1 className="mb-1 font-headline text-2xl font-bold">{name ?? t('web.admin.unknown')}</h1>
      <p className="mb-3 text-sm text-on-surface-variant">
        {text(f.listing_state) ? t(`web.admin.states.${f.listing_state}`) : null} ·{' '}
        {text(f.operator_state) ? t(`web.admin.operator.${f.operator_state}`) : null}
      </p>
      {done ? (
        <p
          role="status"
          className="mb-3 rounded-md border border-secondary/50 p-2 text-sm text-secondary"
        >
          {t('web.admin.done')}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mb-3 rounded-md border border-error/50 p-2 text-sm text-error">
          {t(errorKey(error))}{' '}
          <bdi dir="ltr" className="font-numeric">
            ({error})
          </bdi>
        </p>
      ) : null}
      <div className="mb-5 flex flex-wrap gap-2">
        {listingButtons('facility', id, f.listing_state)}
      </div>

      <Section title={t('web.admin.sections.facts')}>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-on-surface-variant">{t('web.admin.fact.access')}</dt>
          <dd>{text(f.access)}</dd>
          <dt className="text-on-surface-variant">{t('web.admin.fact.location')}</dt>
          <dd>
            {text(f.location_confidence)}
            {f.lat !== null && f.lat !== undefined ? (
              <>
                {' · '}
                <bdi dir="ltr" className="font-numeric">
                  {String(f.lat)}, {String(f.lng)}
                </bdi>
              </>
            ) : null}
          </dd>
          <dt className="text-on-surface-variant">{t('web.admin.fact.reviewed')}</dt>
          <dd>{when(f.last_reviewed_at) ?? '—'}</dd>
        </dl>
      </Section>

      <Section title={t('web.admin.sections.fields')} count={list('fields').length}>
        <Rows
          rows={list('fields')}
          cols={[
            [t('web.admin.field.label'), (r) => text(r.label_ar ?? r.label_en)],
            [t('web.admin.field.badge'), (r) => t(`web.admin.badge.${r.participation}`)],
            [t('web.admin.field.state'), (r) => t(`web.admin.states.${r.listing_state}`)],
            [t('web.admin.field.size'), (r) => text(r.players_per_side)],
            [t('web.admin.field.surface'), (r) => text(r.surface)],
            [
              t('web.admin.field.price'),
              (r) => text((r.operations as Json | null)?.price_per_hour),
            ],
            [t('web.admin.field.bookable'), (r) => yesNo(r.bookable)],
            [
              '',
              (r) => (
                <span className="flex flex-wrap gap-1">
                  {listingButtons('pitch', String(r.id), r.listing_state)}
                </span>
              ),
            ],
          ]}
        />
      </Section>

      <Section title={t('web.admin.sections.evidence')} count={list('evidence').length}>
        <Rows
          rows={list('evidence')}
          cols={[
            ['', (r) => text(r.attribute)],
            ['', (r) => text(r.source_kind)],
            [
              '',
              (r) => {
                const v = r.value as Json | null;
                const url = typeof v?.source_url === 'string' ? v.source_url : null;
                return url ? (
                  <a
                    href={url}
                    rel="noreferrer noopener"
                    target="_blank"
                    className="text-primary hover:underline"
                  >
                    <bdi>{text(v?.summary) ?? url}</bdi>
                  </a>
                ) : (
                  <bdi dir="ltr" className="font-numeric">
                    {JSON.stringify(r.value)}
                  </bdi>
                );
              },
            ],
            ['', (r) => when(r.recorded_at)],
          ]}
        />
      </Section>

      <Section title={t('web.admin.sections.claims')} count={list('claims').length}>
        <Rows
          rows={list('claims')}
          cols={[
            ['', (r) => text(r.name)],
            ['', (r) => text(r.status)],
            ['', (r) => when(r.created_at)],
            [
              '',
              (r) =>
                ['submitted', 'evidence_requested'].includes(String(r.status)) ? (
                  <span className="flex flex-wrap gap-1">
                    {(['approve', 'request_evidence', 'reject'] as const).map((decision) => (
                      <Act
                        key={decision}
                        action={decideClaim}
                        fields={{ ...base, claim: String(r.id), decision }}
                        label={t(`web.admin.actions.${decision}`)}
                        tone={
                          decision === 'approve'
                            ? 'primary'
                            : decision === 'reject'
                              ? 'danger'
                              : 'plain'
                        }
                      />
                    ))}
                  </span>
                ) : null,
            ],
          ]}
        />
      </Section>
      <Section title={t('web.admin.sections.reports')} count={list('reports').length}>
        <Rows
          rows={list('reports')}
          cols={[
            ['', (r) => text(r.kind)],
            [
              '',
              (r) => (
                <bdi dir="ltr" className="font-numeric text-xs">
                  {JSON.stringify(r.payload)}
                </bdi>
              ),
            ],
            ['', (r) => text(r.status)],
            ['', (r) => when(r.created_at)],
            [
              '',
              (r) =>
                r.status === 'pending' ? (
                  <span className="flex flex-wrap gap-1">
                    {(['accepted', 'rejected'] as const).map((decision) => (
                      <Act
                        key={decision}
                        action={decideReport}
                        fields={{ ...base, report: String(r.id), decision }}
                        label={t(`web.admin.actions.${decision}`)}
                        tone={decision === 'accepted' ? 'primary' : 'danger'}
                      />
                    ))}
                  </span>
                ) : null,
            ],
          ]}
        />
      </Section>
      <Section title={t('web.admin.sections.media')} count={list('media').length}>
        <Rows
          rows={list('media')}
          cols={[
            ['', (r) => text(r.path)],
            ['', (r) => text(r.rights)],
            ['', (r) => text(r.status)],
          ]}
        />
      </Section>
      <Section title={t('web.admin.sections.staff')} count={list('staff').length}>
        <Rows
          rows={list('staff')}
          cols={[
            ['', (r) => text(r.name)],
            ['', (r) => text(r.role)],
          ]}
        />
      </Section>
      <Section title={t('web.admin.sections.contacts')} count={list('contacts').length}>
        <Rows
          rows={list('contacts')}
          cols={[
            ['', (r) => text(r.name)],
            ['', (r) => (r.phone ? <bdi dir="ltr">{String(r.phone)}</bdi> : null)],
            ['', (r) => text(r.email)],
          ]}
        />
      </Section>
      <Section title={t('web.admin.sections.outreach')} count={list('outreach').length}>
        <Rows
          rows={list('outreach')}
          cols={[
            ['', (r) => text(r.channel)],
            ['', (r) => text(r.outcome)],
            ['', (r) => text(r.note)],
            ['', (r) => when(r.at)],
          ]}
        />
      </Section>
      <Section
        title={t('web.admin.sections.history')}
        count={list('reviews').length + list('badge_history').length}
      >
        <Rows
          rows={[
            ...list('badge_history').map((b) => ({ ...b, action: `${b.from} → ${b.to}` })),
            ...list('reviews'),
          ]}
          cols={[
            ['', (r) => text(r.action)],
            ['', (r) => text(r.reason)],
            ['', (r) => when(r.at)],
          ]}
        />
      </Section>
    </AdminFrame>
  );
}
