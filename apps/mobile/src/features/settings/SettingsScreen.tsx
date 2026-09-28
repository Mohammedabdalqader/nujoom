import { errorKey } from '@nujoom/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { getSource, type Account } from '@/data/source';
import { setSoundsMuted, soundsMuted } from '@/design/sound';
import { useTheme } from '@/design/theme';
import { GuardianInvitePanel } from '@/features/guardian/GuardianInvitePanel';
import { DataRightsSection } from '@/features/settings/DataRightsSection';
import { changeLocale } from '@/lib/i18n';
import { useLocale } from '@/lib/locale';
import { accountKey, useAccount, useSession, useSignOut } from '@/lib/session';
import { IS_DEMO } from '@/lib/variant';
import { Icon, type IconName } from '@/ui/Icon';
import { ChoiceChips, Page } from '@/ui/Page';
import { Text } from '@/ui/Text';
import { useToast } from '@/ui/Toast';

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: IconName;
  children: ReactNode;
}) {
  return (
    <View className="rounded-2xl bg-surface-container border border-border p-4 gap-4">
      <View className="flex-row items-center gap-2">
        <Icon name={icon} size={20} className="text-primary" />
        <Text font="rubik" className="text-[17px] text-on-surface font-bold">
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

/**
 * Settings (spec §6.1, docs/DESIGN.md §Slice 1): language, theme and sounds (on the device);
 * visibility, presence and recording permission (on the account, youth rules enforced by the
 * database); legal pages; sign-out. Each change shows its saving/error state.
 */
export function SettingsScreen() {
  const { t, locale } = useLocale();
  const { theme, setTheme, color } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { session } = useSession();
  const account = useAccount();
  const signOut = useSignOut();
  const [muted, setMuted] = useState(soundsMuted());
  const [pending, setPending] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  const save = async (key: string, run: () => Promise<Account>) => {
    setPending(key);
    try {
      const next = await run();
      queryClient.setQueryData(accountKey(session?.userId), next);
      void queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.show(t('settings.saved'));
    } catch (e) {
      toast.show(t(errorKey(e)));
    } finally {
      setPending(null);
    }
  };

  const a = account.data;
  const youth = a?.isYouth ?? true;

  return (
    <Page title={t('settings.title')} back>
      <Section title={t('settings.account')} icon="person">
        <Text className="text-[15px] text-on-surface-variant">
          {IS_DEMO
            ? t('settings.demoAccount')
            : t('settings.signedInAs', { email: session?.email ?? a?.email ?? '' })}
        </Text>
        <ChoiceChips
          label={t('settings.language')}
          options={[
            { value: 'ar', label: 'العربية' },
            { value: 'en', label: 'English' },
          ]}
          value={locale}
          onChange={(next) => {
            if (a && !IS_DEMO)
              void getSource()
                .setSettings({ locale: next })
                .catch(() => {});
            void changeLocale(next);
          }}
        />
        <ChoiceChips
          label={t('settings.theme')}
          options={[
            { value: 'dark', label: t('settings.themeDark') },
            { value: 'light', label: t('settings.themeLight') },
          ]}
          value={theme}
          onChange={setTheme}
        />
        <ChoiceChips
          label={t('settings.sounds')}
          options={[
            { value: 'on', label: t('settings.on') },
            { value: 'off', label: t('settings.off') },
          ]}
          value={muted ? 'off' : 'on'}
          onChange={(v) => {
            setSoundsMuted(v === 'off');
            setMuted(v === 'off');
          }}
        />
      </Section>

      {a ? (
        <Section title={t('settings.privacy')} icon="lock">
          {youth ? (
            <Text className="text-[15px] leading-[23px] text-on-surface-variant">
              {t('settings.youthVisibility')}
            </Text>
          ) : (
            <ChoiceChips
              label={t('settings.visibility')}
              options={(['public', 'city', 'private'] as const).map((v) => ({
                value: v,
                label: t(`onboarding.visibilityOptions.${v}`),
              }))}
              value={a.visibility}
              onChange={(v) => void save('visibility', () => getSource().setVisibility(v))}
            />
          )}
          {youth ? (
            <Text className="text-[15px] leading-[23px] text-on-surface-variant">
              {t('settings.presenceYouth')}
            </Text>
          ) : (
            <ChoiceChips
              label={t('settings.presence')}
              options={[
                { value: 'on', label: t('settings.on') },
                { value: 'off', label: t('settings.off') },
              ]}
              value={a.settings.sharePresence ? 'on' : 'off'}
              onChange={(v) =>
                void save('presence', () => getSource().setSettings({ sharePresence: v === 'on' }))
              }
            />
          )}
        </Section>
      ) : null}

      {a?.isYouth && !IS_DEMO ? (
        <Section title={t('settings.guardian')} icon="family_restroom">
          <GuardianInvitePanel
            initial={a.guardians}
            onChange={() =>
              void queryClient.invalidateQueries({ queryKey: accountKey(session?.userId) })
            }
          />
        </Section>
      ) : null}

      {a ? (
        <Section title={t('settings.recording')} icon="videocam">
          <ChoiceChips
            options={[
              { value: 'yes', label: t('onboarding.recordingYes') },
              { value: 'no', label: t('onboarding.recordingNo') },
            ]}
            value={a.recordingConsent ? 'yes' : 'no'}
            onChange={(v) =>
              void save('recording', () => getSource().setRecordingConsent(v === 'yes'))
            }
          />
          <Text className="text-[14px] leading-[22px] text-on-surface-variant">
            {a.recordingConsent ? t('settings.recordingOn') : t('settings.recordingOff')}
          </Text>
          {youth ? (
            <Text className="text-[14px] text-primary">{t('settings.recordingNeedsGuardian')}</Text>
          ) : null}
          <Text className="text-[13px] text-on-surface-variant">
            {t('onboarding.streamingNote')}
          </Text>
        </Section>
      ) : null}

      <Section title={t('settings.legal')} icon="policy">
        <View className="flex-row gap-4">
          <Pressable
            onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'terms' } })}
            className="min-h-[44px] justify-center"
          >
            <Text className="text-[15px] text-primary underline">{t('auth.terms')}</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'privacy' } })}
            className="min-h-[44px] justify-center"
          >
            <Text className="text-[15px] text-primary underline">{t('auth.privacy')}</Text>
          </Pressable>
        </View>
      </Section>

      {a && !IS_DEMO ? (
        <Section title={t('settings.data')} icon="download">
          <DataRightsSection />
        </Section>
      ) : null}

      {pending ? <ActivityIndicator color={color('primary')} /> : null}

      {!IS_DEMO ? (
        <Pressable
          onPress={async () => {
            setLeaving(true);
            try {
              await signOut();
            } catch (e) {
              toast.show(t(errorKey(e)));
              setLeaving(false);
            }
          }}
          disabled={leaving}
          accessibilityRole="button"
          className="min-h-[52px] rounded-xl border border-error/50 items-center justify-center flex-row gap-2"
        >
          <Icon name="logout" size={20} className="text-error" directional />
          <Text font="rubik" className="text-[16px] text-error font-bold">
            {leaving ? t('settings.signingOut') : t('settings.signOut')}
          </Text>
        </Pressable>
      ) : null}
    </Page>
  );
}
