import { errorKey, normalizeEmail } from '@nujoom/shared';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, View } from 'react-native';

import { getSource } from '@/data/source';
import { sfx } from '@/design/sound';
import { useTheme } from '@/design/theme';
import { changeLocale } from '@/lib/i18n';
import { useLocale } from '@/lib/locale';
import { sessionStorage } from '@/lib/session-storage';
import { Field } from '@/ui/Field';
import { Icon } from '@/ui/Icon';
import { Page } from '@/ui/Page';
import { Text } from '@/ui/Text';

/** Google shows only once the owner has set it up (docs/SETUP_AUTH.md). */
const GOOGLE_ENABLED = process.env.EXPO_PUBLIC_GOOGLE_SIGN_IN === '1';
const EMAIL_DRAFT_KEY = 'signin.emailDraft';
const EMAIL_DRAFT_MAX_AGE_MS = 5 * 60_000;

/**
 * Sign-in (docs/DESIGN.md §Slice 1): one email field, a 6-digit code, and Google when enabled.
 * Never says whether an account exists: every valid address gets the same "check your email".
 */
export function SignInScreen() {
  const { t, locale } = useLocale();
  const { color } = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'code' | 'google' | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let active = true;
    void sessionStorage
      .getItem(EMAIL_DRAFT_KEY)
      .then(async (saved) => {
        if (!saved) return;
        await sessionStorage.removeItem(EMAIL_DRAFT_KEY);
        const draft = JSON.parse(saved) as { email: string; expiresAt: number };
        if (active && typeof draft.email === 'string' && draft.expiresAt > Date.now()) {
          setEmail((current) => current || draft.email);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const valid = normalizeEmail(email);

  const send = async (alreadyHaveCode = false) => {
    if (!valid) {
      setError(t('errors.auth.emailInvalid'));
      return;
    }
    setError(null);
    if (!alreadyHaveCode) {
      setBusy('code');
      try {
        await getSource().auth.sendCode(valid);
        sfx.success();
      } catch (e) {
        setError(t(errorKey(e)));
        setBusy(null);
        return;
      }
      setBusy(null);
    }
    if (Platform.OS !== 'web') void sessionStorage.removeItem(EMAIL_DRAFT_KEY).catch(() => {});
    router.push({
      pathname: '/(auth)/code',
      params: { email: valid, sent: alreadyHaveCode ? '0' : '1' },
    });
  };

  const google = async () => {
    setError(null);
    setBusy('google');
    try {
      await getSource().auth.google(); // the session listener routes on success
    } catch (e) {
      setError(t(errorKey(e)));
    } finally {
      setBusy(null);
    }
  };

  const switchLanguage = async () => {
    if (Platform.OS !== 'web' && email) {
      try {
        await sessionStorage.setItem(
          EMAIL_DRAFT_KEY,
          JSON.stringify({ email, expiresAt: Date.now() + EMAIL_DRAFT_MAX_AGE_MS }),
        );
      } catch {
        // Language switching still works if secure storage is unavailable.
      }
    }
    await changeLocale(locale === 'ar' ? 'en' : 'ar');
  };

  return (
    <Page className="gap-6">
      <View className="flex-row justify-end">
        <Pressable
          onPress={() => void switchLanguage()}
          accessibilityRole="button"
          className="min-h-[44px] px-3 flex-row items-center gap-1.5 rounded-full bg-surface-container"
        >
          <Icon name="language" size={18} className="text-primary" />
          <Text font="rubik" className="text-[14px] text-on-surface">
            {t('auth.language')}
          </Text>
        </Pressable>
      </View>

      <View className="items-center gap-3 pt-2">
        <Image
          source={require('../../../assets/images/logo.png')}
          style={{ width: 88, height: 88 }}
          contentFit="contain"
          accessibilityIgnoresInvertColors
        />
        <Text font="rubik" className="text-[30px] leading-[38px] text-primary font-black">
          {t('app.name')}
        </Text>
        <Text className="text-[16px] leading-[24px] text-on-surface-variant text-center px-4">
          {t('auth.tagline')}
        </Text>
      </View>

      <View className="rounded-2xl bg-surface-container border border-primary/30 p-4 gap-4 shadow-2xl">
        <Text font="rubik" className="text-[20px] text-on-surface font-bold">
          {t('auth.title')}
        </Text>
        <Field
          label={t('auth.emailLabel')}
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            setError(null);
          }}
          onSubmitEditing={() => void send()}
          placeholder={t('auth.emailPlaceholder')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="send"
          error={error}
          ltr
        />
        <Pressable
          onPress={() => void send()}
          disabled={busy !== null}
          accessibilityRole="button"
          className={`min-h-[52px] rounded-xl bg-primary-container active:bg-primary items-center justify-center flex-row gap-2 ${
            busy ? 'opacity-70' : ''
          }`}
        >
          {busy === 'code' ? <ActivityIndicator color={color('on-primary')} /> : null}
          <Text font="rubik" className="text-[17px] text-on-primary font-bold">
            {busy === 'code' ? t('auth.sending') : t('auth.sendCode')}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => void send(true)}
          disabled={busy !== null}
          accessibilityRole="button"
          className="min-h-[44px] items-center justify-center"
        >
          <Text className="text-[15px] text-primary font-bold">{t('auth.haveCode')}</Text>
        </Pressable>

        {GOOGLE_ENABLED ? (
          <>
            <View className="flex-row items-center gap-3">
              <View className="flex-1 h-px bg-border" />
              <Text className="text-[13px] text-on-surface-variant">{t('auth.or')}</Text>
              <View className="flex-1 h-px bg-border" />
            </View>
            <Pressable
              onPress={() => void google()}
              disabled={busy !== null}
              accessibilityRole="button"
              className="min-h-[52px] rounded-xl bg-surface-container-high active:bg-surface-container-highest border border-border items-center justify-center flex-row gap-2"
            >
              {busy === 'google' ? <ActivityIndicator color={color('on-surface')} /> : null}
              <Text font="rubik" className="text-[16px] text-on-surface font-bold">
                {t('auth.google')}
              </Text>
            </Pressable>
          </>
        ) : null}
      </View>

      <View className="flex-row flex-wrap justify-center gap-x-4 gap-y-1">
        <Text className="text-[13px] text-on-surface-variant text-center w-full">
          {t('auth.legal').replace(/<\/?b>/g, '')}
        </Text>
        <Pressable
          onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'terms' } })}
          accessibilityRole="link"
          className="min-h-[44px] justify-center"
        >
          <Text className="text-[14px] text-primary font-bold underline">{t('auth.terms')}</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'privacy' } })}
          accessibilityRole="link"
          className="min-h-[44px] justify-center"
        >
          <Text className="text-[14px] text-primary font-bold underline">{t('auth.privacy')}</Text>
        </Pressable>
      </View>
    </Page>
  );
}
