import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import {
  addDays,
  dateInAmman,
  dayRows,
  errorKey,
  formatDateTime,
  halfHourTimes,
  isValidOpeningHours,
  type ScheduleEntry,
} from '@nujoom/shared';

import { SiteShell } from '@/components/SiteShell';
import { getT, localeFrom } from '@/lib/i18n';
import { serverSupabase } from '@/lib/supabase/server';

import { addWalkIn, blockTime, cancelFromCalendar } from '../../actions';

type Props = {
  params: Promise<{ locale: string; facility: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
type Json = Record<string, unknown>;
type Named = { ar: string | null; en: string | null } | null;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const REASONS = ['venue_closed', 'maintenance', 'weather', 'staff_other'] as const;
// Database codes to translation keys (keys ending in "_other" would read as plural forms).
const key = (code: string) => code.replace(/_(\w)/g, (_, c: string) => c.toUpperCase());

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: getT(localeFrom((await params).locale))('web.calendar.title'),
    robots: 'noindex, nofollow',
  };
}

const input =
  'rounded-lg border border-border bg-surface-container-low px-3 py-2 text-sm text-on-surface';
const button =
  'rounded-full bg-primary-container px-5 py-2 text-sm font-bold text-on-primary hover:opacity-90';
const quiet =
  'rounded-full border border-border-strong px-3 py-1 text-xs text-on-surface hover:border-primary';

/**
 * The venue calendar (D-073): one Amman day at a time, every field's free slots, app bookings,
 * walk-ins and blocks (venue_schedule, D-072). Staff add walk-ins and cancel; owners also block
 * time. Works without client JavaScript.
 */
export default async function CalendarPage({ params, searchParams }: Props) {
  const { locale: rawLocale, facility } = await params;
  const locale = localeFrom(rawLocale);
  if (!UUID.test(facility)) notFound();
  const sp = await searchParams;
  const one = (v: unknown) => (typeof v === 'string' ? v : undefined);
  const today = dateInAmman(new Date());
  const date = DATE.test(one(sp.date) ?? '') ? (one(sp.date) as string) : today;
  const done = one(sp.done);
  const error = one(sp.error);
  const t = getT(locale);
  const pick = (n: unknown) => {
    const v = n as Named;
    return (locale === 'ar' ? (v?.ar ?? v?.en) : (v?.en ?? v?.ar)) ?? '';
  };
  const here = `/${locale}/venue/calendar/${facility}`;

  const supabase = await serverSupabase();
  if (!supabase) notFound();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/${locale}/sign-in?next=${encodeURIComponent(`${here}?date=${date}`)}`);
  const { data: venues } = await supabase.rpc('my_venues');
  const venue = ((venues as Json[] | null) ?? []).find((v) => v.facility_id === facility);
  if (!venue) notFound();
  const isOwner = venue.role === 'owner';
  const prev = addDays(date, -1);
  const next = addDays(date, 1);
  const dayStart = `${date}T00:00:00+03:00`;
  const dayEnd = `${next}T00:00:00+03:00`;
  const { data: schedule, error: scheduleError } = await supabase.rpc('venue_schedule', {
    p_facility: facility,
    p_from: dayStart,
    p_to: dayEnd,
  });
  const entries = (schedule as ScheduleEntry[] | null) ?? [];
  const now = new Date();
  const time = (iso: string) => formatDateTime(iso, locale, { timeStyle: 'short' });
  const fields = ((venue.fields as Json[] | undefined) ?? []).map((f) => {
    const ops = f.operations as Json | null;
    const hours = isValidOpeningHours(ops?.opening_hours) ? ops.opening_hours : null;
    const rows =
      hours && ops?.slot_minutes
        ? dayRows(
            hours,
            Number(ops.slot_minutes),
            date,
            entries.filter((e) => e.pitch_id === f.pitch_id),
            now,
          )
        : null;
    return { id: String(f.pitch_id), label: pick(f.label) || pick(venue.name), rows };
  });
  const cancelled = entries.filter((e) => e.status === 'cancelled');
  const freeSlots = fields.flatMap((f) =>
    (f.rows ?? [])
      .filter((r) => r.type === 'free' && !r.past)
      .map((r) => (r.type === 'free' ? { field: f, startsAt: r.startsAt, endsAt: r.endsAt } : null))
      .filter((x): x is NonNullable<typeof x> => x !== null),
  );
  const who = (e: ScheduleEntry) =>
    e.kind === 'block'
      ? t(`web.calendar.reasons.${key(e.block_reason ?? 'staff_other')}`)
      : (e.kind === 'app' ? e.organizer : e.walk_in_name) || '—';

  return (
    <SiteShell locale={locale} path={`/venue/calendar/${facility}?date=${date}`}>
      <Link
        href={`/${locale}/venue`}
        className="mb-3 inline-block text-sm text-primary hover:underline"
      >
        {t('web.calendar.back')}
      </Link>
      <h1 className="mb-1 font-headline text-3xl font-bold">{t('web.calendar.title')}</h1>
      <p className="mb-4 text-on-surface-variant">{pick(venue.name)}</p>

      <nav className="mb-4 flex flex-wrap items-center gap-2">
        <Link href={`${here}?date=${prev}`} className={quiet}>
          {t('web.calendar.prev')}
        </Link>
        <form method="get" className="flex items-center gap-2">
          <input
            type="date"
            name="date"
            defaultValue={date}
            className={input}
            dir="ltr"
            aria-label={t('web.calendar.pickDate')}
          />
          <button type="submit" className={quiet}>
            {t('web.calendar.go')}
          </button>
        </form>
        <Link href={`${here}?date=${next}`} className={quiet}>
          {t('web.calendar.next')}
        </Link>
        {date !== today ? (
          <Link href={`${here}?date=${today}`} className={quiet}>
            {t('web.calendar.today')}
          </Link>
        ) : null}
      </nav>
      <h2 className="mb-3 font-headline text-xl font-bold">
        {formatDateTime(`${date}T12:00:00+03:00`, locale, { dateStyle: 'full' })}
      </h2>

      {done ? (
        <p role="status" className="mb-4 rounded-lg border border-secondary/50 p-3 text-secondary">
          {t(`web.calendar.done.${key(done)}`, { defaultValue: t('web.owner.done') })}
        </p>
      ) : null}
      {error || scheduleError ? (
        <p role="alert" className="mb-4 rounded-lg border border-error/50 p-3 text-error">
          {t(errorKey(error ?? scheduleError?.message ?? 'generic'))}
        </p>
      ) : null}

      <div className="flex flex-col gap-4">
        {fields.map((f) => (
          <section key={f.id} className="rounded-2xl border border-border bg-surface-container p-4">
            <h3 className="mb-3 font-headline text-lg font-bold">{f.label}</h3>
            {f.rows === null ? (
              <p className="text-sm text-on-surface-variant">{t('web.calendar.noHours')}</p>
            ) : f.rows.length === 0 ? (
              <p className="text-sm text-on-surface-variant">{t('web.calendar.closed')}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {f.rows.map((r) =>
                  r.type === 'free' ? (
                    <li
                      key={r.startsAt}
                      className={`flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm ${r.past ? 'opacity-50' : ''}`}
                    >
                      <bdi className="font-numeric">
                        {time(r.startsAt)} – {time(r.endsAt)}
                      </bdi>
                      <span className="text-on-surface-variant">
                        {r.past ? t('web.calendar.past') : t('web.calendar.free')}
                      </span>
                    </li>
                  ) : (
                    <li
                      key={r.entry.id}
                      className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${r.entry.kind === 'block' ? 'border-border-strong bg-surface-container-low' : 'border-primary/40'}`}
                    >
                      <span className="flex flex-wrap items-center gap-2">
                        <bdi className="font-numeric">
                          {time(r.entry.starts_at)} – {time(r.entry.ends_at)}
                        </bdi>
                        <span className="rounded-full border border-border-strong px-2 py-0.5 text-xs">
                          {t(`web.calendar.kind.${r.entry.kind}`)}
                        </span>
                        <span className="font-bold">{who(r.entry)}</span>
                        {r.entry.kind === 'app' && r.entry.players ? (
                          <span className="text-xs text-on-surface-variant">
                            {t('web.calendar.players', { n: r.entry.players })}
                          </span>
                        ) : null}
                        {r.entry.contact_phone ? (
                          <a
                            href={`tel:${r.entry.contact_phone}`}
                            dir="ltr"
                            className="font-numeric text-primary"
                          >
                            {r.entry.contact_phone}
                          </a>
                        ) : null}
                      </span>
                      {r.started ? null : (
                        <form action={cancelFromCalendar} className="flex items-center gap-2">
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="facility" value={facility} />
                          <input type="hidden" name="date" value={date} />
                          <input type="hidden" name="booking" value={r.entry.id} />
                          {r.entry.kind === 'block' ? null : (
                            <select
                              name="reason"
                              className={input}
                              aria-label={t('web.calendar.reason')}
                            >
                              {REASONS.map((x) => (
                                <option key={x} value={x}>
                                  {t(`web.calendar.reasons.${key(x)}`)}
                                </option>
                              ))}
                            </select>
                          )}
                          <button type="submit" className={quiet}>
                            {r.entry.kind === 'block'
                              ? t('web.calendar.unblock')
                              : t('web.calendar.cancel')}
                          </button>
                        </form>
                      )}
                    </li>
                  ),
                )}
              </ul>
            )}
          </section>
        ))}
      </div>

      {cancelled.length ? (
        <section className="mt-6">
          <h3 className="mb-2 font-headline font-bold">{t('web.calendar.cancelledTitle')}</h3>
          <ul className="flex flex-col gap-1 text-sm text-on-surface-variant">
            {cancelled.map((e) => (
              <li key={e.id}>
                <bdi className="font-numeric">{time(e.starts_at)}</bdi> ·{' '}
                {t(`web.calendar.kind.${e.kind}`)} · {who(e)} ·{' '}
                {t(`web.calendar.cancelReasons.${key(e.cancel_reason ?? 'staff_other')}`)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-8 rounded-2xl border border-border bg-surface-container p-4">
        <h3 className="mb-1 font-headline text-lg font-bold">{t('web.calendar.walkInTitle')}</h3>
        <p className="mb-3 text-xs text-on-surface-variant">{t('web.calendar.walkInHint')}</p>
        {freeSlots.length === 0 ? (
          <p className="text-sm text-on-surface-variant">{t('web.calendar.noFree')}</p>
        ) : (
          <form action={addWalkIn} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="facility" value={facility} />
            <input type="hidden" name="date" value={date} />
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              {t('web.calendar.slot')}
              <select name="slot" required className={input}>
                {fields.map((f) => (
                  <optgroup key={f.id} label={f.label}>
                    {freeSlots
                      .filter((s) => s.field.id === f.id)
                      .map((s) => (
                        <option key={s.startsAt} value={`${f.id}|${s.startsAt}`}>
                          {time(s.startsAt)} – {time(s.endsAt)}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              {t('web.calendar.name')}
              <input name="name" required maxLength={60} className={input} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              {t('web.calendar.phone')}
              <input name="phone" type="tel" dir="ltr" placeholder="+9627…" className={input} />
            </label>
            <button type="submit" className={`${button} justify-self-start`}>
              {t('web.calendar.addWalkIn')}
            </button>
          </form>
        )}
      </section>

      {isOwner ? (
        <section className="mt-6 rounded-2xl border border-border bg-surface-container p-4">
          <h3 className="mb-1 font-headline text-lg font-bold">{t('web.calendar.blockTitle')}</h3>
          <p className="mb-3 text-xs text-on-surface-variant">{t('web.calendar.blockHint')}</p>
          <form action={blockTime} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="facility" value={facility} />
            <input type="hidden" name="date" value={date} />
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              {t('web.calendar.field')}
              <select name="pitch" className={input}>
                {fields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              {t('web.calendar.from')}
              <select name="from" className={input} defaultValue={`${date}T16:00:00+03:00`}>
                {halfHourTimes('start').map((h) => (
                  <option key={h} value={`${date}T${h}:00+03:00`}>
                    {time(`${date}T${h}:00+03:00`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              {t('web.calendar.to')}
              <select name="to" className={input} defaultValue={`${next}T00:00:00+03:00`}>
                {halfHourTimes('end').map((h) => {
                  const iso = h === '24:00' ? `${next}T00:00:00+03:00` : `${date}T${h}:00+03:00`;
                  return (
                    <option key={h} value={iso}>
                      {h === '24:00' ? t('web.owner.hours.midnight') : time(iso)}
                    </option>
                  );
                })}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              {t('web.calendar.reason')}
              <select name="reason" className={input}>
                {REASONS.map((x) => (
                  <option key={x} value={x}>
                    {t(`web.calendar.reasons.${key(x)}`)}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className={`${button} justify-self-start`}>
              {t('web.calendar.block')}
            </button>
          </form>
        </section>
      ) : null}
    </SiteShell>
  );
}
