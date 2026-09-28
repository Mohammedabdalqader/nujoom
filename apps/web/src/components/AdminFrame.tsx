import Link from 'next/link';
import type { ReactNode } from 'react';

import { SiteShell } from '@/components/SiteShell';
import { getT, type Locale } from '@/lib/i18n';

/** The calmer, denser frame for operator screens (Codex, Q6), inside the site shell. */
export function AdminFrame({
  locale,
  path,
  allowed,
  children,
}: {
  locale: Locale;
  path: string;
  allowed: boolean;
  children: ReactNode;
}) {
  const t = getT(locale);
  return (
    <SiteShell locale={locale} path={path}>
      <nav className="mb-6 flex flex-wrap gap-4 border-b border-border pb-3 text-sm">
        <Link href={`/${locale}/admin`} className="font-bold text-on-surface hover:text-primary">
          {t('web.admin.title')}
        </Link>
        <Link
          href={`/${locale}/admin/catalog`}
          className="text-on-surface-variant hover:text-primary"
        >
          {t('web.admin.catalog')}
        </Link>
      </nav>
      {allowed ? (
        children
      ) : (
        <p role="alert" className="rounded-lg border border-error/40 p-4 text-error">
          {t('web.admin.notAllowed')}
        </p>
      )}
    </SiteShell>
  );
}
