'use client';

import type { Locale } from '@nujoom/i18n';
import { digitsOnly, errorKey, normalizeEmail } from '@nujoom/shared';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { browserSupabase } from '@/lib/supabase/client';

export type SignInStrings = {
  title: string;
  emailLabel: string;
  emailPlaceholder: string;
  sendCode: string;
  sending: string;
  haveCode: string;
  checkTitle: string;
  /** Contains the literal `{{email}}` placeholder. */
  checkBody: string;
  codeLabel: string;
  verify: string;
  verifying: string;
  changeEmail: string;
  emailInvalid: string;
  linkFailed: string;
  unconfigured: string;
  errors: Record<string, string>;
};

const field =
  'w-full rounded-lg border border-border bg-surface-container-low px-3 py-3 text-on-surface outline-none focus:border-primary';
const primary =
  'min-h-[52px] rounded-xl bg-primary-container font-headline text-lg font-bold text-on-primary hover:bg-primary disabled:opacity-60';

/** Email → 6-digit code, as in the app. "I already have a code" skips sending (tester codes). */
export function SignInForm({
  locale,
  next,
  strings: s,
  linkError,
  configured,
}: {
  locale: Locale;
  next: string;
  strings: SignInStrings;
  linkError: boolean;
  configured: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    !configured ? s.unconfigured : linkError ? s.linkFailed : null,
  );
  const message = (e: unknown) => s.errors[errorKey(e)] ?? s.errors['errors.generic'] ?? '';

  const sendCode = async (event: FormEvent, skip = false) => {
    event.preventDefault();
    const address = normalizeEmail(email);
    if (!address) return setError(s.emailInvalid);
    const supabase = browserSupabase();
    if (!supabase) return setError(s.unconfigured);
    setError(null);
    if (!skip) {
      setBusy(true);
      const callback = new URL('/auth/callback', window.location.origin);
      callback.searchParams.set('next', next);
      const { error: sendError } = await supabase.auth.signInWithOtp({
        email: address,
        options: { shouldCreateUser: true, emailRedirectTo: callback.toString() },
      });
      setBusy(false);
      if (sendError) return setError(message(sendError));
    }
    setEmail(address);
    setStep('code');
  };

  const verify = async (event: FormEvent) => {
    event.preventDefault();
    const supabase = browserSupabase();
    if (!supabase || code.length !== 6) return;
    setBusy(true);
    setError(null);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    });
    if (verifyError) {
      setBusy(false);
      return setError(message(verifyError));
    }
    router.replace(next);
    router.refresh();
  };

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-5 py-8">
      <h1 className="font-headline text-3xl font-bold">
        {step === 'email' ? s.title : s.checkTitle}
      </h1>
      {step === 'email' ? (
        <form className="flex flex-col gap-4" onSubmit={(e) => void sendCode(e)} noValidate>
          <label className="flex flex-col gap-1.5">
            <span className="font-numeric text-xs text-on-surface-variant">{s.emailLabel}</span>
            <input
              type="email"
              dir="ltr"
              autoComplete="email"
              inputMode="email"
              placeholder={s.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={field}
            />
          </label>
          {error ? (
            <p role="alert" className="text-sm text-error">
              {error}
            </p>
          ) : null}
          <button type="submit" disabled={busy || !configured} className={primary}>
            {busy ? s.sending : s.sendCode}
          </button>
          <button
            type="button"
            onClick={(e) => void sendCode(e, true)}
            className="min-h-11 text-sm text-on-surface-variant hover:text-primary"
          >
            {s.haveCode}
          </button>
        </form>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={(e) => void verify(e)}>
          {/* The address gets its own left-to-right line so it never breaks inside the sentence. */}
          <p className="leading-7 text-on-surface-variant">
            {s.checkBody.split('{{email}}')[0]?.trim()}
            <span className="block break-all">
              <bdi dir="ltr" className="font-numeric text-on-surface">
                {email}
              </bdi>
            </span>
          </p>
          <label className="flex flex-col gap-1.5">
            <span className="font-numeric text-xs text-on-surface-variant">{s.codeLabel}</span>
            <input
              dir="ltr"
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(digitsOnly(e.target.value).slice(0, 6))}
              className={`${field} text-center font-numeric text-2xl tracking-[0.5em]`}
              lang={locale}
            />
          </label>
          {error ? (
            <p role="alert" className="text-sm text-error">
              {error}
            </p>
          ) : null}
          <button type="submit" disabled={busy || code.length !== 6} className={primary}>
            {busy ? s.verifying : s.verify}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('email');
              setCode('');
              setError(null);
            }}
            className="min-h-11 text-sm text-on-surface-variant hover:text-primary"
          >
            {s.changeEmail}
          </button>
        </form>
      )}
    </div>
  );
}
