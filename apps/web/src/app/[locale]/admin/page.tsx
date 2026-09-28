import type { Metadata } from 'next';
import Link from 'next/link';

import { AdminFrame } from '@/components/AdminFrame';
import { adminSession } from '@/lib/admin';
import { getT, localeFrom } from '@/lib/i18n';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: getT(localeFrom((await params).locale))('web.admin.title'),
    robots: 'noindex, nofollow',
  };
}

// Queue → the list that works it off.
const QUEUES: { key: string; href: string }[] = [
  { key: 'candidates', href: 'catalog?state=candidate' },
  { key: 'published', href: 'catalog?state=published' },
  { key: 'verified_fields', href: 'catalog?state=published' },
  { key: 'sources_changed', href: 'catalog?state=all' },
  { key: 'open_claims', href: 'catalog?state=all' },
  { key: 'pending_reports', href: 'catalog?state=published' },
  { key: 'pending_media', href: 'catalog?state=all' },
  { key: 'stale_due', href: 'catalog?state=published' },
];

/** The admin home: how much waits in each queue (D-053). */
export default async function AdminHome({ params }: Props) {
  const locale = localeFrom((await params).locale);
  const t = getT(locale);
  const session = await adminSession(locale, `/${locale}/admin`);
  return (
    <AdminFrame locale={locale} path="/admin" allowed={session !== null}>
      <h1 className="mb-4 font-headline text-2xl font-bold">{t('web.admin.catalog')}</h1>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {QUEUES.map(({ key, href }) => (
          <li key={key}>
            <Link
              href={`/${locale}/admin/${href}`}
              className="flex h-full flex-col gap-1 rounded-lg border border-border bg-surface-container p-3 hover:border-primary"
            >
              <span className="font-numeric text-2xl font-bold text-on-surface">
                {session?.summary[key] ?? 0}
              </span>
              <span className="text-sm text-on-surface-variant">
                {t(`web.admin.summary.${key}`)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </AdminFrame>
  );
}
