import { APP_NAME } from '@nujoom/shared';
import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Rubik, Space_Grotesk } from 'next/font/google';
import type { ReactNode } from 'react';

import { getDirection, getT, LOCALES, localeFrom } from '@/lib/i18n';

import '../globals.css';

// The prototype's three families (D-017). Rubik carries Arabic; Arabic in the other two falls
// back to the system Arabic font, as in the app.
const rubik = Rubik({ subsets: ['arabic', 'latin'], variable: '--font-rubik', display: 'swap' });
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
});
const grotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-grotesk', display: 'swap' });

type Props = { children: ReactNode; params: Promise<{ locale: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = localeFrom((await params).locale);
  return {
    title: { default: APP_NAME[locale], template: `%s · ${APP_NAME[locale]}` },
    description: getT(locale)('auth.tagline'),
    alternates: { languages: { ar: '/ar', en: '/en' } },
  };
}

export const viewport: Viewport = { themeColor: '#111317', colorScheme: 'dark' };

/** The root layout: `lang` and `dir` follow the locale segment (Arabic RTL by default). */
export default async function LocaleLayout({ children, params }: Props) {
  const locale = localeFrom((await params).locale);
  return (
    <html
      lang={locale}
      dir={getDirection(locale)}
      className={`${rubik.variable} ${jakarta.variable} ${grotesk.variable}`}
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
