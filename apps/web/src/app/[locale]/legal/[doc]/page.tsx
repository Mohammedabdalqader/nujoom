import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { SiteShell } from '@/components/SiteShell';
import { getT, LOCALES, localeFrom } from '@/lib/i18n';

const DOCS = ['terms', 'privacy'] as const;
type Doc = (typeof DOCS)[number];
const POINTS = ['p1', 'p2', 'p3', 'p4', 'p5'] as const;

type Props = { params: Promise<{ locale: string; doc: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.flatMap((locale) => DOCS.map((doc) => ({ locale, doc })));
}

function docFrom(value: string): Doc {
  if (!(DOCS as readonly string[]).includes(value)) notFound();
  return value as Doc;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, doc } = await params;
  return { title: getT(localeFrom(locale))(`legal.${docFrom(doc)}`) };
}

/**
 * Terms of use and privacy policy (spec §7): the same draft text as the app, clearly marked for
 * lawyer review. The app stores need these at a public URL.
 */
export default async function LegalPage({ params }: Props) {
  const { locale: rawLocale, doc: rawDoc } = await params;
  const locale = localeFrom(rawLocale);
  const doc = docFrom(rawDoc);
  const t = getT(locale);
  return (
    <SiteShell locale={locale} path={`/legal/${doc}`}>
      <article className="flex flex-col gap-6">
        <h1 className="font-headline text-3xl font-bold text-on-surface">{t(`legal.${doc}`)}</h1>
        <p className="rounded-xl border border-primary/30 bg-primary-container/15 p-4 text-primary">
          {t('legal.draftNotice')}
        </p>
        <ol className="flex flex-col gap-4">
          {POINTS.map((p) => (
            <li
              key={p}
              className="border-s-4 border-primary/50 ps-4 text-base leading-7 text-on-surface"
            >
              {t(`legal.${doc === 'terms' ? 'termsPoints' : 'privacyPoints'}.${p}`)}
            </li>
          ))}
        </ol>
      </article>
    </SiteShell>
  );
}
