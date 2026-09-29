'use client';

import { errorKey } from '@nujoom/shared';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { browserSupabase } from '@/lib/supabase/client';

export type LinkStrings = {
  create: string;
  creating: string;
  createdHint: string;
  copy: string;
  copied: string;
  whatsapp: string;
  /** Contains `{{url}}`. */
  shareText: string;
  errors: Record<string, string>;
};

/**
 * Creates a one-time staff link (D-069). The token exists only in this browser tab: it is never
 * put in a URL, cookie or log of ours, and cannot be shown again once the owner leaves the page
 * (only its hash is stored, D-068). The owner copies it or shares it on WhatsApp.
 */
export function CreateLink({
  facilityId,
  locale,
  openIds,
  strings: s,
}: {
  facilityId: string;
  locale: string;
  /** The venue's open links; the new link is shown only while it is one of them. */
  openIds: string[];
  strings: LinkStrings;
}) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [created, setCreated] = useState<{ id: string; url: string } | null>(null);
  // Once cancelled or used (the list no longer has it), the link disappears from here too.
  const url = created && (refreshing || openIds.includes(created.id)) ? created.url : null;
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    const supabase = browserSupabase();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    setCopied(false);
    const { data, error: rpcError } = await supabase.rpc('create_staff_invite', {
      p_facility: facilityId,
    });
    setBusy(false);
    if (rpcError) {
      setError(s.errors[errorKey(rpcError.message)] ?? s.errors['errors.generic'] ?? '');
      return;
    }
    const invite = data as { id: string; token: string };
    setCreated({
      id: invite.id,
      url: `${window.location.origin}/${locale}/venue/join/${invite.token}`,
    });
    startRefresh(() => router.refresh());
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const quiet =
    'rounded-full border border-border-strong px-4 py-1.5 text-sm text-on-surface hover:border-primary';
  return (
    <div className="mt-3 flex flex-col gap-2">
      <button
        type="button"
        onClick={create}
        disabled={busy}
        className="self-start rounded-full bg-primary-container px-5 py-2 text-sm font-bold text-on-primary hover:opacity-90 disabled:opacity-50"
      >
        {busy ? s.creating : s.create}
      </button>
      {error ? (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : null}
      {url ? (
        <div className="flex flex-col gap-2 rounded-lg border border-secondary/50 p-3">
          <p className="text-sm">{s.createdHint}</p>
          <input
            readOnly
            value={url}
            dir="ltr"
            aria-label={s.copy}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full rounded-lg border border-border bg-surface-container-low px-3 py-2 font-numeric text-xs text-on-surface"
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copy} className={quiet}>
              {copied ? s.copied : s.copy}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(s.shareText.replace('{{url}}', url))}`}
              target="_blank"
              rel="noopener noreferrer"
              className={quiet}
            >
              {s.whatsapp}
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
