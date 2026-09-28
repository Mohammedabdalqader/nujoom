import { errorKey } from '@nujoom/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable } from 'react-native';

import { getSource } from '@/data/source';
import { SplashScreen } from '@/features/onboarding/JourneyScreens';
import { useLocale } from '@/lib/locale';
import { Page } from '@/ui/Page';
import { Text } from '@/ui/Text';

/** Magic-link and Google redirects land here (PKCE code); the session listener routes on. */
export default function AuthCallback() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const router = useRouter();
  const { t } = useLocale();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      router.replace('/sign-in');
      return;
    }
    getSource()
      .auth.completeLink(code)
      .catch((e: unknown) => setError(t(errorKey(e))));
  }, [code, router, t]);

  if (!error) return <SplashScreen />;
  return (
    <Page className="gap-4 pt-16">
      <Text className="text-[17px] text-on-surface text-center">{error}</Text>
      <Pressable onPress={() => router.replace('/sign-in')} className="min-h-[44px] justify-center">
        <Text className="text-[15px] text-primary text-center">{t('auth.changeEmail')}</Text>
      </Pressable>
    </Page>
  );
}
