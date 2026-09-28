import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';

import { useLocale } from '@/lib/locale';
import { getSource } from '@/data/source';
import { Page } from '@/ui/Page';
import { Text } from '@/ui/Text';

const POINTS = ['p1', 'p2', 'p3', 'p4', 'p5'] as const;

/**
 * Terms of use and privacy policy (spec §7). Draft text, clearly marked for lawyer review; the
 * version shown is the one consents are recorded against (`config.consent_versions`).
 */
export function LegalScreen({ doc }: { doc: 'terms' | 'privacy' }) {
  const { t } = useLocale();
  const versions = useQuery({
    queryKey: ['consent-versions'],
    queryFn: async () => (await getSource().onboardingOptions()).consentVersions,
    staleTime: 10 * 60_000,
  });
  const version = versions.data?.[doc];
  return (
    <Page title={t(`legal.${doc}`)} back>
      <View className="rounded-xl bg-primary-container/15 border border-primary/30 p-3">
        <Text className="text-[14px] text-primary">{t('legal.draftNotice')}</Text>
      </View>
      <View className="gap-4">
        {POINTS.map((p) => (
          <View key={p} className="flex-row gap-3">
            <View className="w-1.5 rounded-full bg-primary/50" />
            <Text className="flex-1 text-[16px] leading-[26px] text-on-surface">
              {t(`legal.${doc === 'terms' ? 'termsPoints' : 'privacyPoints'}.${p}`)}
            </Text>
          </View>
        ))}
      </View>
      {version ? (
        <Text font="grotesk" className="text-[12px] text-on-surface-variant">
          {t('legal.version', { version })}
        </Text>
      ) : null}
    </Page>
  );
}
