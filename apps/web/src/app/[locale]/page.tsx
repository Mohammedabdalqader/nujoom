import { APP_NAME } from '@nujoom/shared';
import Image from 'next/image';

import { SiteShell } from '@/components/SiteShell';
import { getT, localeFrom } from '@/lib/i18n';

type Props = { params: Promise<{ locale: string }> };

/** The public front page: what the app is, honestly (no store links until there are stores). */
export default async function Home({ params }: Props) {
  const locale = localeFrom((await params).locale);
  const t = getT(locale);
  return (
    <SiteShell locale={locale}>
      <section className="flex flex-col items-center gap-6 py-16 text-center">
        <Image
          src="/logo.png"
          alt=""
          width={112}
          height={112}
          priority
          className="drop-shadow-[0_0_32px_rgba(245,158,11,0.35)]"
        />
        <h1 className="font-headline text-4xl font-extrabold text-on-surface">
          {APP_NAME[locale]}
        </h1>
        <p className="max-w-md text-lg leading-8 text-on-surface-variant">{t('auth.tagline')}</p>
        <p className="rounded-full border border-primary/40 bg-primary-container/10 px-5 py-2 font-numeric text-sm text-primary">
          {t('web.comingSoon')}
        </p>
      </section>
    </SiteShell>
  );
}
