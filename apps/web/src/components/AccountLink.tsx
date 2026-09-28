'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { browserSupabase } from '@/lib/supabase/client';

/**
 * The header's account corner: "Sign in", or the signed-in email with "Sign out". Read in the
 * browser so public pages stay static; access decisions always happen on the server.
 */
export function AccountLink({
  locale,
  signIn,
  signOut,
}: {
  locale: string;
  signIn: string;
  signOut: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const supabase = browserSupabase();
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) =>
      setEmail(session?.user.email ?? null),
    );
    return () => data.subscription.unsubscribe();
  }, []);

  if (email === undefined) return null;
  if (!email) {
    if (pathname.endsWith('/sign-in')) return null;
    return (
      <Link
        href={`/${locale}/sign-in?next=${encodeURIComponent(pathname)}`}
        className="text-sm text-primary hover:underline"
      >
        {signIn}
      </Link>
    );
  }
  return (
    <span className="flex min-w-0 items-center gap-3 text-sm">
      <Link
        href={`/${locale}/account`}
        className="hidden truncate text-on-surface-variant hover:text-on-surface sm:inline"
      >
        <bdi dir="ltr">{email}</bdi>
      </Link>
      <button
        type="button"
        onClick={async () => {
          await browserSupabase()?.auth.signOut();
          router.refresh();
        }}
        className="text-primary hover:underline"
      >
        {signOut}
      </button>
    </span>
  );
}
