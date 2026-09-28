'use client';

import type { Locale } from '@nujoom/i18n';
import {
  ADULT_AGE,
  currentAge,
  digitsOnly,
  dobFromParts,
  errorKey,
  formatDateTime,
  normalizeDisplayName,
} from '@nujoom/shared';
import Link from 'next/link';
import { useCallback, useEffect, useState, type ReactNode } from 'react';

import { browserSupabase } from '@/lib/supabase/client';

type Visibility = 'private' | 'city' | 'public';

export type ApprovalStrings = {
  title: string;
  signInBody: string;
  signIn: string;
  invalidBody: string;
  switchAccount: string;
  intro: string;
  explain: string;
  expires: string;
  visibility: string;
  visibilityOptions: Record<Visibility, string>;
  visibilityHint: Record<Visibility, string>;
  recording: string;
  recordingYes: string;
  recordingNo: string;
  recordingHint: string;
  yourDetails: string;
  yourDetailsHint: string;
  name: string;
  nameError: string;
  dob: string;
  day: string;
  month: string;
  year: string;
  dobError: string;
  approve: string;
  approving: string;
  decline: string;
  declineConfirm: string;
  declineYes: string;
  cancel: string;
  approved: string;
  declined: string;
  guardianOnly: string;
  done: string;
  signOut: string;
  retry: string;
  errors: Record<string, string>;
};

type Invite = { youthName: string; expiresAt: string | null; needsDetails: boolean };
type State =
  | { kind: 'loading' }
  | { kind: 'signedOut' }
  | { kind: 'invalid'; email: string }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; invite: Invite }
  | { kind: 'done'; outcome: 'approved' | 'declined'; youthName: string; guardianOnly: boolean };

const fill = (template: string, vars: Record<string, string>) =>
  template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '');

const primary =
  'min-h-[52px] w-full rounded-xl bg-primary-container font-headline text-lg font-bold text-on-primary hover:bg-primary disabled:opacity-60';
const quiet = 'min-h-11 w-full text-sm text-on-surface-variant hover:text-primary';
const card = 'flex flex-col gap-3 rounded-2xl border border-border bg-surface-container p-4';
const field =
  'w-full rounded-lg border border-border bg-surface-container-low px-3 py-3 text-on-surface outline-none focus:border-primary';

/**
 * The approval flow in the browser. The invite email signs the guardian in through a link whose
 * tokens arrive in the URL fragment (server-issued links can't use PKCE); they're turned into the
 * cookie session and removed from the address bar before anything else happens.
 */
export function GuardianApproval({
  locale,
  token,
  strings: s,
}: {
  locale: Locale;
  token: string;
  strings: ApprovalStrings;
}) {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const here = `/${locale}/guardian/accept/${token}`;
  const message = useCallback(
    (e: unknown) => s.errors[errorKey(e)] ?? s.errors['errors.generic'] ?? '',
    [s.errors],
  );

  const load = useCallback(async () => {
    const supabase = browserSupabase();
    if (!supabase) return setState({ kind: 'error', message: s.errors['errors.generic'] ?? '' });
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const access = hash.get('access_token');
    const refresh = hash.get('refresh_token');
    if (access || hash.has('error')) window.history.replaceState(null, '', here);
    if (access && refresh) {
      await supabase.auth.setSession({ access_token: access, refresh_token: refresh });
    }
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return setState({ kind: 'signedOut' });
    const { data, error } = await supabase.rpc('guardian_invite_preview', { p_token: token });
    if (error) return setState({ kind: 'error', message: message(error) });
    if (!data) return setState({ kind: 'invalid', email: auth.user.email ?? '' });
    setState({
      kind: 'ready',
      invite: {
        youthName: data.youth_name,
        expiresAt: data.expires_at ?? null,
        needsDetails: data.needs_details === true,
      },
    });
  }, [here, message, s.errors, token]);

  useEffect(() => {
    // Reads the URL fragment and the session, which only exist in the browser.
    void load();
  }, [load]);

  const signInHref = `/${locale}/sign-in?next=${encodeURIComponent(here)}`;

  if (state.kind === 'loading') {
    return <Frame title={s.title}>{null}</Frame>;
  }
  if (state.kind === 'signedOut') {
    return (
      <Frame title={s.title} body={s.signInBody}>
        <Link href={signInHref} className={`${primary} flex items-center justify-center`}>
          {s.signIn}
        </Link>
      </Frame>
    );
  }
  if (state.kind === 'error') {
    return (
      <Frame title={s.title} body={state.message}>
        <button type="button" className={primary} onClick={() => void load()}>
          {s.retry}
        </button>
      </Frame>
    );
  }
  if (state.kind === 'invalid') {
    return (
      <Frame
        title={s.title}
        body={
          <>
            {s.invalidBody.split('{{email}}')[0]}
            <bdi dir="ltr" className="text-on-surface">
              {state.email}
            </bdi>
            {s.invalidBody.split('{{email}}')[1]}
          </>
        }
      >
        <button
          type="button"
          className={primary}
          onClick={async () => {
            await browserSupabase()?.auth.signOut();
            window.location.assign(signInHref);
          }}
        >
          {s.switchAccount}
        </button>
      </Frame>
    );
  }
  if (state.kind === 'done') {
    return (
      <Frame
        title={
          state.outcome === 'approved' ? fill(s.approved, { name: state.youthName }) : s.declined
        }
        body={state.guardianOnly ? s.guardianOnly : undefined}
      >
        <Link href={`/${locale}`} className={`${primary} flex items-center justify-center`}>
          {s.done}
        </Link>
        <button
          type="button"
          className={quiet}
          onClick={async () => {
            await browserSupabase()?.auth.signOut();
            window.location.assign(`/${locale}`);
          }}
        >
          {s.signOut}
        </button>
      </Frame>
    );
  }
  return (
    <ApprovalForm
      locale={locale}
      token={token}
      invite={state.invite}
      strings={s}
      message={message}
      onDone={(outcome, guardianOnly) =>
        setState({ kind: 'done', outcome, youthName: state.invite.youthName, guardianOnly })
      }
    />
  );
}

function Frame({
  title,
  body,
  children,
}: {
  title: string;
  body?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5 py-6">
      <h1 className="font-headline text-3xl font-bold leading-tight">{title}</h1>
      {body ? <p className="text-lg leading-8 text-on-surface-variant">{body}</p> : null}
      {children}
    </div>
  );
}

function Choice<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
}: {
  legend: string;
  name: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-numeric text-xs text-on-surface-variant">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={`cursor-pointer rounded-xl border px-4 py-2.5 font-bold ${
              option.value === value
                ? 'border-primary-container bg-primary-container text-on-primary'
                : 'border-border bg-surface-container-low text-on-surface hover:border-primary'
            }`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ApprovalForm({
  locale,
  token,
  invite,
  strings: s,
  message,
  onDone,
}: {
  locale: Locale;
  token: string;
  invite: Invite;
  strings: ApprovalStrings;
  message: (e: unknown) => string;
  onDone: (outcome: 'approved' | 'declined', guardianOnly: boolean) => void;
}) {
  const [visibility, setVisibility] = useState<Visibility>('private');
  const [recording, setRecording] = useState<'yes' | 'no' | null>(null);
  const [name, setName] = useState('');
  const [dob, setDob] = useState({ day: '', month: '', year: '' });
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState<'approve' | 'decline' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDecline, setConfirmDecline] = useState(false);

  const dobIso = dobFromParts(dob.day, dob.month, dob.year);
  const nameOk = normalizeDisplayName(name).length >= 2;
  const dobOk = dobIso !== null && currentAge(dobIso) >= ADULT_AGE;
  const detailsOk = !invite.needsDetails || (nameOk && dobOk);

  /** A guardian without a player profile gets a note; me() says so via the onboarding stage. */
  const guardianOnly = async () => {
    const { data } = (await browserSupabase()?.rpc('me')) ?? {};
    return (data as { stage?: string } | null)?.stage === 'onboarding';
  };

  const approve = async () => {
    setShown(true);
    if (!detailsOk) return;
    const supabase = browserSupabase();
    if (!supabase) return;
    setBusy('approve');
    setError(null);
    const { error: rpcError } = await supabase.rpc('accept_guardian_invite', {
      p_token: token,
      p_visibility: visibility,
      p_recording: recording === null ? null : recording === 'yes',
      p_guardian_name: invite.needsDetails ? normalizeDisplayName(name) : null,
      p_guardian_dob: invite.needsDetails ? dobIso : null,
    });
    if (rpcError) {
      setBusy(null);
      return setError(message(rpcError));
    }
    onDone('approved', await guardianOnly());
  };

  const decline = async () => {
    const supabase = browserSupabase();
    if (!supabase) return;
    setBusy('decline');
    setError(null);
    const { error: rpcError } = await supabase.rpc('decline_guardian_invite', { p_token: token });
    if (rpcError) {
      setBusy(null);
      return setError(message(rpcError));
    }
    onDone('declined', await guardianOnly());
  };

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5 py-6">
      {/* The name is the youth's, in either script: <bdi> keeps the sentence's direction. */}
      <h1 className="font-headline text-3xl font-bold leading-tight">
        {s.intro.split('{{name}}')[0]}
        <bdi>{invite.youthName}</bdi>
        {s.intro.split('{{name}}')[1]}
      </h1>
      <p className="text-lg leading-8 text-on-surface-variant">{s.explain}</p>
      {invite.expiresAt ? (
        <p className="font-numeric text-xs text-on-surface-variant">
          {fill(s.expires, {
            date: formatDateTime(invite.expiresAt, locale, { dateStyle: 'medium' }),
          })}
        </p>
      ) : null}

      <div className={card}>
        <Choice
          legend={s.visibility}
          name="visibility"
          options={(['private', 'city', 'public'] as const).map((v) => ({
            value: v,
            label: s.visibilityOptions[v],
          }))}
          value={visibility}
          onChange={setVisibility}
        />
        <p className="text-sm leading-6 text-on-surface-variant">{s.visibilityHint[visibility]}</p>
      </div>

      <div className={card}>
        <Choice
          legend={s.recording}
          name="recording"
          options={[
            { value: 'yes' as const, label: s.recordingYes },
            { value: 'no' as const, label: s.recordingNo },
          ]}
          value={recording}
          onChange={setRecording}
        />
        <p className="text-sm leading-6 text-on-surface-variant">{s.recordingHint}</p>
      </div>

      {invite.needsDetails ? (
        <div className={card}>
          <h2 className="font-headline text-lg font-bold">{s.yourDetails}</h2>
          <p className="text-sm leading-6 text-on-surface-variant">{s.yourDetailsHint}</p>
          <label className="flex flex-col gap-1.5">
            <span className="font-numeric text-xs text-on-surface-variant">{s.name}</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              maxLength={40}
              aria-invalid={shown && !nameOk}
              className={field}
            />
            {shown && !nameOk ? <span className="text-sm text-error">{s.nameError}</span> : null}
          </label>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 font-numeric text-xs text-on-surface-variant">{s.dob}</legend>
            <div className="flex gap-2">
              {(
                [
                  ['day', 2],
                  ['month', 2],
                  ['year', 4],
                ] as const
              ).map(([part, max]) => (
                <label key={part} className="flex flex-1 flex-col gap-1">
                  <span className="font-numeric text-xs text-on-surface-variant">{s[part]}</span>
                  <input
                    dir="ltr"
                    inputMode="numeric"
                    maxLength={max}
                    value={dob[part]}
                    onChange={(e) =>
                      setDob((d) => ({ ...d, [part]: digitsOnly(e.target.value).slice(0, max) }))
                    }
                    className={field}
                  />
                </label>
              ))}
            </div>
            {shown && !dobOk ? <span className="text-sm text-error">{s.dobError}</span> : null}
          </fieldset>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-error">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        className={primary}
        disabled={busy !== null}
        onClick={() => void approve()}
      >
        {busy === 'approve' ? s.approving : s.approve}
      </button>
      {confirmDecline ? (
        <div className="flex flex-col gap-3 rounded-xl border border-error/40 p-4">
          <p className="leading-7">
            {s.declineConfirm.split('{{name}}')[0]}
            <bdi>{invite.youthName}</bdi>
            {s.declineConfirm.split('{{name}}')[1]}
          </p>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void decline()}
            className="min-h-[52px] w-full rounded-xl border border-error/60 font-headline font-bold text-error disabled:opacity-60"
          >
            {s.declineYes}
          </button>
          <button type="button" className={quiet} onClick={() => setConfirmDecline(false)}>
            {s.cancel}
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={quiet}
          disabled={busy !== null}
          onClick={() => setConfirmDecline(true)}
        >
          {s.decline}
        </button>
      )}
    </div>
  );
}
