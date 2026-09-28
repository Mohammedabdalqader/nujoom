import { errorKey } from '@nujoom/shared';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';

import { getSource } from '@/data/source';
import { sfx } from '@/design/sound';
import { useTheme } from '@/design/theme';
import { useLocale } from '@/lib/locale';
import { Icon } from '@/ui/Icon';
import { Page } from '@/ui/Page';
import { Text } from '@/ui/Text';

const LENGTH = 6;
const RESEND_SECONDS = 60; // Supabase's max_frequency for email codes

/** Arabic-Indic and Persian digits typed on Arabic keyboards → 0-9; anything else dropped. */
function digitsOnly(value: string): string {
  return value
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/\D/g, '')
    .slice(0, LENGTH);
}

/**
 * Code entry (docs/DESIGN.md §Slice 1): six slots backed by one accessible input, paste and
 * autofill, auto-submit, resend with a countdown, and "change email". On success the session
 * listener moves the user to the next journey step; nothing here claims success early.
 */
export function CodeScreen({ email, sent }: { email: string; sent: boolean }) {
  const { t } = useLocale();
  const { color } = useTheme();
  const router = useRouter();
  const input = useRef<TextInput>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(sent ? RESEND_SECONDS : 0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const verify = async (value: string) => {
    if (value.length !== LENGTH || busy) return;
    setBusy(true);
    setError(null);
    try {
      await getSource().auth.verifyCode(email, value);
      sfx.success();
    } catch (e) {
      setError(t(errorKey(e)));
      setCode('');
      input.current?.focus();
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError(null);
    setInfo(null);
    try {
      await getSource().auth.sendCode(email);
      setInfo(t('auth.resent'));
      setCooldown(RESEND_SECONDS);
    } catch (e) {
      setError(t(errorKey(e)));
    }
  };

  return (
    <Page className="gap-6">
      <View className="gap-2 pt-6">
        <View className="w-14 h-14 rounded-2xl bg-primary-container/20 border border-primary/40 items-center justify-center">
          <Icon name="mark_email_read" size={30} className="text-primary" />
        </View>
        <Text font="rubik" className="text-[26px] leading-[34px] text-on-surface font-bold">
          {t('auth.checkTitle')}
        </Text>
        <Text className="text-[16px] leading-[24px] text-on-surface-variant">
          {t('auth.checkBody', { email })}
        </Text>
      </View>

      <View className="gap-3">
        <Text font="grotesk" className="text-[12px] text-on-surface-variant">
          {t('auth.codeLabel')}
        </Text>
        <Pressable onPress={() => input.current?.focus()} accessible={false}>
          {/* Codes read left to right in both languages. */}
          <View className="flex-row gap-2 justify-center" style={{ direction: 'ltr' }}>
            {Array.from({ length: LENGTH }, (_, i) => {
              const active = i === code.length && !busy;
              return (
                <View
                  key={i}
                  className={`w-12 h-14 rounded-xl border-2 items-center justify-center bg-surface-container-low ${
                    error ? 'border-error' : active ? 'border-primary' : 'border-border'
                  }`}
                >
                  <Text font="grotesk" className="text-[24px] text-on-surface font-bold">
                    {code[i] ?? ''}
                  </Text>
                </View>
              );
            })}
          </View>
        </Pressable>
        <TextInput
          ref={input}
          value={code}
          onChangeText={(v) => {
            const next = digitsOnly(v);
            setCode(next);
            setError(null);
            if (next.length === LENGTH) void verify(next);
          }}
          autoFocus
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={LENGTH * 2}
          editable={!busy}
          accessibilityLabel={t('auth.codeLabel')}
          // Visually replaced by the slots above, still focusable and readable by screen readers.
          style={{ position: 'absolute', opacity: 0.011, height: 1, width: 1 }}
        />
        {busy ? (
          <View className="flex-row items-center justify-center gap-2">
            <ActivityIndicator color={color('primary')} />
            <Text className="text-[15px] text-on-surface-variant">{t('auth.verifying')}</Text>
          </View>
        ) : null}
        {error ? <Text className="text-[14px] text-error text-center">{error}</Text> : null}
        {info ? <Text className="text-[14px] text-secondary text-center">{info}</Text> : null}
      </View>

      <View className="gap-2">
        <Pressable
          onPress={() => void verify(code)}
          disabled={busy || code.length !== LENGTH}
          accessibilityRole="button"
          className={`min-h-[52px] rounded-xl bg-primary-container items-center justify-center ${
            busy || code.length !== LENGTH ? 'opacity-50' : 'active:bg-primary'
          }`}
        >
          <Text font="rubik" className="text-[17px] text-on-primary font-bold">
            {t('auth.verify')}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => void resend()}
          disabled={cooldown > 0}
          accessibilityRole="button"
          className="min-h-[44px] items-center justify-center"
        >
          <Text
            className={`text-[15px] font-bold ${cooldown > 0 ? 'text-outline' : 'text-primary'}`}
          >
            {cooldown > 0 ? t('auth.resendIn', { seconds: cooldown }) : t('auth.resend')}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          className="min-h-[44px] items-center justify-center"
        >
          <Text className="text-[15px] text-on-surface-variant">{t('auth.changeEmail')}</Text>
        </Pressable>
      </View>
    </Page>
  );
}
