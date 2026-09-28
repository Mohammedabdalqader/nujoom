import {
  bidiIsolate,
  errorKey,
  formatDateTime,
  formatMatchClock,
  GUARDIAN_RESEND_COOLDOWN_MS,
  guardianInviteState,
  normalizeEmail,
} from '@nujoom/shared';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { getSource, type GuardianLink } from '@/data/source';
import { useTheme } from '@/design/theme';
import { useLocale } from '@/lib/locale';
import { useNow } from '@/lib/useNow';
import { Field } from '@/ui/Field';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';

type Notice = { tone: 'ok' | 'error'; text: string } | null;

/**
 * A youth names their guardian and sends, resends or corrects the approval email (S1-11, spec §7).
 * "Sent" appears only after the Edge Function confirmed the email went out; a failed send says
 * so. Used by the guardian step and by Settings.
 */
export function GuardianInvitePanel({
  initial,
  onChange,
}: {
  initial: GuardianLink[];
  /** Called with the fresh links after every name or send attempt. */
  onChange?: (links: GuardianLink[]) => void;
}) {
  const { t, locale } = useLocale();
  const { color } = useTheme();
  const now = useNow(1000);
  const [links, setLinks] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);

  const { state, link } = guardianInviteState(links, now);
  const showForm = state === 'none' || editing;
  const waitMs = cooldownUntil - now;
  const address = link ? bidiIsolate(link.email) : '';

  const refresh = async () => {
    const next = await getSource().guardian.links();
    setLinks(next);
    onChange?.(next);
  };

  /** Names the guardian when `newEmail` is given, then asks the server to email them. */
  const send = async (newEmail?: string) => {
    setBusy(true);
    setNotice(null);
    const source = getSource();
    try {
      const linkId = newEmail ? await source.guardian.name(newEmail) : link?.id;
      if (!linkId) return;
      setEditing(false);
      setEmail('');
      try {
        await source.guardian.sendInvite(linkId, locale);
        setNotice({ tone: 'ok', text: t('guardianStep.checkSpam') });
      } catch (e) {
        setNotice({ tone: 'error', text: t(errorKey(e)) });
      } finally {
        setCooldownUntil(Date.now() + GUARDIAN_RESEND_COOLDOWN_MS);
      }
      await refresh().catch(() => {});
    } catch (e) {
      setNotice({ tone: 'error', text: t(errorKey(e)) });
    } finally {
      setBusy(false);
    }
  };

  const submitEmail = () => {
    const valid = normalizeEmail(email);
    if (!valid) {
      setNotice({ tone: 'error', text: t('errors.auth.emailInvalid') });
      return;
    }
    void send(valid);
  };

  const status =
    state === 'confirmed'
      ? {
          icon: 'verified' as const,
          tone: 'text-secondary',
          text: t('guardianStep.confirmed', { email: address }),
        }
      : state === 'sent'
        ? {
            icon: 'mark_email_read' as const,
            tone: 'text-secondary',
            text: t('guardianStep.sent', { email: address }),
          }
        : state === 'expired'
          ? {
              icon: 'schedule' as const,
              tone: 'text-error',
              text: t('guardianStep.expired', { email: address }),
            }
          : state === 'notSent'
            ? {
                icon: 'mail' as const,
                tone: 'text-primary',
                text: t('guardianStep.notSent', { email: address }),
              }
            : null;

  return (
    <View className="gap-4">
      {status && !editing ? (
        <View className="rounded-xl bg-surface-container border border-border p-3 gap-2">
          <View className="flex-row items-start gap-2">
            <Icon name={status.icon} size={20} className={status.tone} />
            <Text className="flex-1 text-[15px] leading-[23px] text-on-surface">{status.text}</Text>
          </View>
          {state === 'sent' && link?.sentAt && link.expiresAt ? (
            <Text font="grotesk" className="text-[12px] text-on-surface-variant">
              {t('guardianStep.sentAt', {
                date: formatDateTime(link.sentAt, locale),
                expires: formatDateTime(link.expiresAt, locale, { dateStyle: 'medium' }),
              })}
            </Text>
          ) : null}
          {state !== 'confirmed' ? (
            <Text className="text-[14px] leading-[22px] text-on-surface-variant">
              {t('guardianStep.waiting')}
            </Text>
          ) : null}
        </View>
      ) : null}

      {notice ? (
        <Text
          accessibilityLiveRegion="polite"
          className={`text-[14px] leading-[22px] ${notice.tone === 'error' ? 'text-error' : 'text-on-surface-variant'}`}
        >
          {notice.text}
        </Text>
      ) : null}

      {showForm ? (
        <View className="gap-3">
          <Field
            label={t('guardianStep.emailLabel')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect={false}
            ltr
            onSubmitEditing={submitEmail}
          />
          <Text className="text-[13px] leading-[20px] text-on-surface-variant">
            {t('guardianStep.emailHint')}
          </Text>
          <Pressable
            onPress={submitEmail}
            disabled={busy}
            accessibilityRole="button"
            className="min-h-[52px] rounded-xl bg-primary-container active:bg-primary items-center justify-center flex-row gap-2"
          >
            {busy ? <ActivityIndicator color={color('on-primary')} /> : null}
            <Text font="rubik" className="text-[17px] text-on-primary font-bold">
              {busy ? t('guardianStep.sending') : t('guardianStep.send')}
            </Text>
          </Pressable>
          {editing ? (
            <Pressable
              onPress={() => setEditing(false)}
              className="min-h-[44px] items-center justify-center"
            >
              <Text className="text-[15px] text-on-surface-variant">
                {t('guardianStep.cancel')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : state !== 'confirmed' ? (
        <View className="gap-2">
          <Pressable
            onPress={() => void send()}
            disabled={busy || waitMs > 0}
            accessibilityRole="button"
            accessibilityState={{ disabled: busy || waitMs > 0 }}
            className={`min-h-[52px] rounded-xl items-center justify-center flex-row gap-2 ${
              waitMs > 0 ? 'bg-surface-container-high' : 'bg-primary-container active:bg-primary'
            }`}
          >
            {busy ? <ActivityIndicator color={color('on-primary')} /> : null}
            <Text
              font="rubik"
              className={`text-[16px] font-bold ${waitMs > 0 ? 'text-on-surface-variant' : 'text-on-primary'}`}
            >
              {busy
                ? t('guardianStep.sending')
                : waitMs > 0
                  ? t('guardianStep.resendIn', { time: formatMatchClock(waitMs + 999) })
                  : t('guardianStep.resend')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setNotice(null);
              setEditing(true);
            }}
            disabled={busy}
            className="min-h-[44px] items-center justify-center"
          >
            <Text className="text-[15px] text-primary">{t('guardianStep.change')}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
