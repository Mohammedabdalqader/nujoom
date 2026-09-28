'use client';

import type { Locale } from '@nujoom/i18n';
import { errorKey, formatDateTime } from '@nujoom/shared';
import { FunctionsHttpError } from '@supabase/supabase-js';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { browserSupabase } from '@/lib/supabase/client';

export type AccountStrings = {
  title: string;
  /** Contains `{{email}}`. */
  signedInAs: string;
  signedOut: string;
  signIn: string;
  signOut: string;
  data: string;
  dataExplain: string;
  download: string;
  preparing: string;
  /** Contains `{{date}}`. */
  downloadReady: string;
  openDownload: string;
  delete: string;
  deleteExplain: string;
  deleteConfirm: string;
  keep: string;
  /** Contains `{{date}}`. */
  deleteScheduled: string;
  cancelDelete: string;
  deleteCancelled: string;
  errors: Record<string, string>;
};

type Request = { kind: 'export' | 'deletion'; status: string; scheduled_for: string };

const primary =
  'flex min-h-[52px] w-full items-center justify-center rounded-xl bg-primary-container font-headline text-lg font-bold text-on-primary hover:bg-primary disabled:opacity-60';
const outline =
  'flex min-h-[52px] w-full items-center justify-center rounded-xl border border-border-strong font-headline font-bold text-on-surface hover:border-primary disabled:opacity-60';
const danger =
  'flex min-h-[52px] w-full items-center justify-center rounded-xl border border-error/60 font-headline font-bold text-error disabled:opacity-60';

export function AccountData({
  locale,
  email,
  strings: s,
}: {
  locale: Locale;
  email: string | null;
  strings: AccountStrings;
}) {
  const [requests, setRequests] = useState<Request[] | null>(null);
  const [download, setDownload] = useState<{ url: string; expiresAt: string } | null>(null);
  const [busy, setBusy] = useState<'export' | 'delete' | 'cancel' | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const day = (iso: string) => formatDateTime(iso, locale, { dateStyle: 'medium' });
  const fail = (e: unknown) =>
    setNotice({ tone: 'error', text: s.errors[errorKey(e)] ?? s.errors['errors.generic'] ?? '' });

  const load = useCallback(async () => {
    const supabase = browserSupabase();
    if (!supabase || !email) return;
    const { data } = await supabase.rpc('my_data_requests');
    setRequests((data as Request[] | null) ?? []);
  }, [email]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!email) {
    return (
      <section className="mx-auto flex max-w-lg flex-col gap-5 py-6">
        <h1 className="font-headline text-3xl font-bold">{s.data}</h1>
        <p className="text-lg leading-8 text-on-surface-variant">{s.signedOut}</p>
        <p className="leading-7 text-on-surface-variant">{s.deleteExplain}</p>
        <Link
          href={`/${locale}/sign-in?next=${encodeURIComponent(`/${locale}/account`)}`}
          className={primary}
        >
          {s.signIn}
        </Link>
      </section>
    );
  }

  const pendingDeletion = requests?.find((r) => r.kind === 'deletion' && r.status === 'pending');

  const run = async (kind: 'export' | 'delete' | 'cancel', task: () => Promise<void>) => {
    setBusy(kind);
    setNotice(null);
    try {
      await task();
      await load();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  };

  const requestExport = async () => {
    const supabase = browserSupabase();
    if (!supabase) return;
    const { data, error } = await supabase.functions.invoke<{ url?: string; expiresAt?: string }>(
      'data-export',
      { body: {} },
    );
    if (error instanceof FunctionsHttpError) {
      const body = (await (error.context as Response).json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(body?.error ?? 'export_failed');
    }
    if (error || !data?.url || !data.expiresAt) throw error ?? new Error('export_failed');
    setDownload({ url: data.url, expiresAt: data.expiresAt });
  };

  const rpc = async (name: 'request_account_deletion' | 'cancel_account_deletion') => {
    const { error } = (await browserSupabase()?.rpc(name)) ?? {};
    if (error) throw error;
  };

  return (
    <section className="mx-auto flex max-w-lg flex-col gap-6 py-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-headline text-3xl font-bold">{s.title}</h1>
        <p className="text-on-surface-variant">
          {s.signedInAs.split('{{email}}')[0]}
          <bdi dir="ltr" className="text-on-surface">
            {email}
          </bdi>
          {s.signedInAs.split('{{email}}')[1]}
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface-container p-5">
        <h2 className="font-headline text-xl font-bold">{s.data}</h2>
        <p className="leading-7 text-on-surface-variant">{s.dataExplain}</p>

        {download ? (
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-container-low p-4">
            <p>{s.downloadReady.replace('{{date}}', day(download.expiresAt))}</p>
            <a href={download.url} className={primary} rel="noreferrer">
              {s.openDownload}
            </a>
          </div>
        ) : (
          <button
            type="button"
            className={outline}
            disabled={busy !== null}
            onClick={() => void run('export', requestExport)}
          >
            {busy === 'export' ? s.preparing : s.download}
          </button>
        )}

        {pendingDeletion ? (
          <div className="flex flex-col gap-3 rounded-xl border border-error/50 bg-tint-red p-4">
            <p aria-live="polite">
              {s.deleteScheduled.replace('{{date}}', day(pendingDeletion.scheduled_for))}
            </p>
            <button
              type="button"
              className={primary}
              disabled={busy !== null}
              onClick={() =>
                void run('cancel', async () => {
                  await rpc('cancel_account_deletion');
                  setNotice({ tone: 'ok', text: s.deleteCancelled });
                })
              }
            >
              {s.cancelDelete}
            </button>
          </div>
        ) : confirming ? (
          <div className="flex flex-col gap-3 rounded-xl border border-error/50 p-4">
            <p className="leading-7">{s.deleteExplain}</p>
            <button
              type="button"
              className={danger}
              disabled={busy !== null}
              onClick={() =>
                void run('delete', async () => {
                  await rpc('request_account_deletion');
                  setConfirming(false);
                })
              }
            >
              {s.deleteConfirm}
            </button>
            <button
              type="button"
              className="min-h-11 text-sm text-on-surface-variant hover:text-primary"
              onClick={() => setConfirming(false)}
            >
              {s.keep}
            </button>
          </div>
        ) : (
          <button
            type="button"
            className={danger}
            disabled={busy !== null || requests === null}
            onClick={() => setConfirming(true)}
          >
            {s.delete}
          </button>
        )}

        {notice ? (
          <p role="status" className={notice.tone === 'error' ? 'text-error' : 'text-secondary'}>
            {notice.text}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        className="min-h-11 text-sm text-on-surface-variant hover:text-primary"
        onClick={async () => {
          await browserSupabase()?.auth.signOut();
          window.location.assign(`/${locale}`);
        }}
      >
        {s.signOut}
      </button>
    </section>
  );
}
