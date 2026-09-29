// Polyfills first: i18n and formatting below rely on Intl.PluralRules / RelativeTimeFormat.
import '@/lib/intl-polyfills';
import '../../global.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack, useRouter, type Href } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider, useTheme } from '@/design/theme';
import {
  AccountErrorScreen,
  MisconfiguredScreen,
  SplashScreen as BrandSplash,
} from '@/features/onboarding/JourneyScreens';
import { FONT_ASSETS } from '@/design/typography';
import { ensureLayoutDirection, i18n } from '@/lib/i18n';
import { takeResume } from '@/lib/resume';
import { SessionProvider, useAccount, useSession } from '@/lib/session';
import { ToastProvider } from '@/ui/Toast';

void SplashScreen.preventAutoHideAsync();

/** Dialogs from the design: transparent modal routes over the tabs (see ui/Dialog). */
const DIALOG = { presentation: 'transparentModal', animation: 'fade' } as const;

/**
 * The journey router (contract §3): signed out → sign-in; not onboarded → onboarding; terms
 * changed → re-consent; youth without a guardian → guardian step; otherwise the app. The demo
 * build is always signed in. Loading shows the brand, failures show a retry, never a black screen.
 */
function Navigator() {
  const { theme } = useTheme();
  const router = useRouter();
  const session = useSession();
  const account = useAccount();
  const stage = session.status === 'signedIn' ? (account.data?.stage ?? 'onboarding') : 'auth';
  const routed = session.status === 'signedIn' && account.isSuccess;

  // A link opened while signed out (a guardian approval) resumes once sign-in has routed.
  useEffect(() => {
    if (!routed) return;
    const next = takeResume();
    if (next) router.push(next as Href);
  }, [routed, router]);

  if (session.status === 'misconfigured') return <MisconfiguredScreen error={session.error} />;
  if (session.status === 'loading' || (session.status === 'signedIn' && account.isPending)) {
    return <BrandSplash />;
  }
  if (session.status === 'signedIn' && account.isError) {
    return <AccountErrorScreen error={account.error} onRetry={() => void account.refetch()} />;
  }

  return (
    <>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={stage === 'auth'}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="auth-callback" />
        </Stack.Protected>
        <Stack.Protected guard={stage === 'onboarding'}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={stage === 'consent'}>
          <Stack.Screen name="reconsent" />
        </Stack.Protected>
        <Stack.Protected guard={stage === 'guardian'}>
          <Stack.Screen name="guardian-setup" />
        </Stack.Protected>
        <Stack.Protected guard={stage === 'app'}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="notifications" options={DIALOG} />
          <Stack.Screen name="friends" options={DIALOG} />
          <Stack.Screen name="missing-one" options={DIALOG} />
          <Stack.Screen name="match-details/[id]" options={DIALOG} />
          <Stack.Screen name="clip/[id]" options={DIALOG} />
          <Stack.Screen name="tools/squad" options={DIALOG} />
          <Stack.Screen name="tools/gear" options={DIALOG} />
          <Stack.Screen name="tools/cost" options={DIALOG} />
          <Stack.Screen name="book/[pitchId]" options={DIALOG} />
          <Stack.Screen name="pitch/[id]" options={DIALOG} />
          <Stack.Screen name="checkin" options={DIALOG} />
          <Stack.Screen name="player/[id]" />
          <Stack.Screen name="wallet" options={DIALOG} />
          <Stack.Screen name="settings" />
        </Stack.Protected>
        <Stack.Screen name="legal/[doc]" />
        {/* Any stage: the guardian may be signed out, a player, or not a player at all. */}
        <Stack.Screen name="guardian/accept/[token]" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FONT_ASSETS);
  const [directionReady, setDirectionReady] = useState(false);
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } }),
  );

  useEffect(() => {
    void ensureLayoutDirection().finally(() => setDirectionReady(true));
  }, []);

  const ready = (fontsLoaded || fontError !== null) && directionReady;
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <I18nextProvider i18n={i18n}>
          <QueryClientProvider client={queryClient}>
            <SessionProvider>
              <ThemeProvider>
                <ToastProvider>
                  <Navigator />
                </ToastProvider>
              </ThemeProvider>
            </SessionProvider>
          </QueryClientProvider>
        </I18nextProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
