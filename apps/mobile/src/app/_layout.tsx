// Polyfills first: i18n and formatting below rely on Intl.PluralRules / RelativeTimeFormat.
import '@/lib/intl-polyfills';
import '../../global.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider, useTheme } from '@/design/theme';
import { FONT_ASSETS } from '@/design/typography';
import { ensureLayoutDirection, i18n } from '@/lib/i18n';
import { ToastProvider } from '@/ui/Toast';

void SplashScreen.preventAutoHideAsync();

/** Dialogs from the design: transparent modal routes over the tabs (see ui/Dialog). */
const DIALOG = { presentation: 'transparentModal', animation: 'fade' } as const;

function Navigator() {
  const { theme } = useTheme();
  return (
    <>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
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
        <Stack.Screen name="checkin" options={DIALOG} />
        <Stack.Screen name="player/[id]" />
        <Stack.Screen name="wallet" options={DIALOG} />
        <Stack.Screen name="settings" />
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
            <ThemeProvider>
              <ToastProvider>
                <Navigator />
              </ToastProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </I18nextProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
