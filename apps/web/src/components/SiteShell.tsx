import { APP_NAME } from '@nujoom/shared';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { AccountLink } from '@/components/AccountLink';
import { getT, otherLocale, type Locale } from '@/lib/i18n';

/**
 * The public pages' frame: the floodlit header (logo, name, language switch) and a footer with
 * the legal links. Operator screens get their own calmer frame later (Codex, Q6).
 */
export function SiteShell({
  locale,
  path = '',
  children,
}: {
  locale: Locale;
  /** The current path after the locale, so the language switch keeps the page. */
  path?: string;
  children: ReactNode;
}) {
  const t = getT(locale);
  const other = otherLocale(locale);
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-chrome backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4">
          <Link href={`/${locale}`} className="flex items-center gap-3">
            <Image src="/logo.png" alt="" width={36} height={36} priority />
            <span className="font-headline text-lg font-bold text-on-surface">
              {APP_NAME[locale]}
            </span>
          </Link>
          <span className="ms-auto">
            <AccountLink locale={locale} signIn={t('auth.title')} signOut={t('settings.signOut')} />
          </span>
          <Link
            href={`/${other}${path}`}
            hrefLang={other}
            lang={other}
            className="rounded-full border border-border-strong px-4 py-1.5 text-sm text-on-surface-variant hover:text-on-surface"
          >
            {t('auth.language')}
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">{children}</main>
      <footer className="border-t border-border/60">
        <nav className="mx-auto flex max-w-3xl flex-wrap gap-x-6 gap-y-2 px-4 py-6 text-sm text-on-surface-variant">
          <Link href={`/${locale}/legal/terms`} className="hover:text-primary">
            {t('legal.terms')}
          </Link>
          <Link href={`/${locale}/legal/privacy`} className="hover:text-primary">
            {t('legal.privacy')}
          </Link>
          {/* The public account-deletion link the app stores ask for (D-042). */}
          <Link href={`/${locale}/account`} className="hover:text-primary">
            {t('web.accountLink')}
          </Link>
        </nav>
      </footer>
    </div>
  );
}
