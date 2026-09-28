import { errorKey, guardianInviteState } from '@nujoom/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, View } from 'react-native';

import { getSource, type ConfigError, type GuardianLink } from '@/data/source';
import { useTheme } from '@/design/theme';
import { GuardianInvitePanel } from '@/features/guardian/GuardianInvitePanel';
import { useLocale } from '@/lib/locale';
import { useNow } from '@/lib/useNow';
import { accountKey, useAccount, useSession, useSignOut } from '@/lib/session';
import { Icon } from '@/ui/Icon';
import { Page } from '@/ui/Page';
import { Text } from '@/ui/Text';

/** Waiting for the session or account: the brand on the app's surface, never a black screen. */
export function SplashScreen() {
  const { color } = useTheme();
  return (
    <View className="flex-1 bg-surface items-center justify-center gap-6">
      <Image
        source={require('../../../assets/images/logo.png')}
        style={{ width: 96, height: 96 }}
        resizeMode="contain"
      />
      <ActivityIndicator color={color('primary')} />
    </View>
  );
}

/** The account couldn't load (offline, server error): say so and offer a retry. */
export function AccountErrorScreen({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { t } = useLocale();
  const signOut = useSignOut();
  return (
    <Page className="gap-5 pt-16 items-center">
      <Icon name="wifi_off" size={48} className="text-on-surface-variant" />
      <Text className="text-[17px] leading-[26px] text-on-surface text-center">
        {t(errorKey(error))}
      </Text>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        className="min-h-[52px] px-8 rounded-xl bg-primary-container active:bg-primary items-center justify-center"
      >
        <Text font="rubik" className="text-[17px] text-on-primary font-bold">
          {t('errors.retry')}
        </Text>
      </Pressable>
      <Pressable onPress={() => void signOut()} className="min-h-[44px] justify-center">
        <Text className="text-[15px] text-on-surface-variant">{t('onboarding.signOut')}</Text>
      </Pressable>
    </Page>
  );
}

/** A production build without backend settings (D-027): explicit, developer-facing, no fixtures. */
export function MisconfiguredScreen({ error }: { error: ConfigError }) {
  return (
    <View className="flex-1 bg-surface items-center justify-center p-8 gap-3">
      <Icon name="error" size={48} className="text-error" />
      <Text className="text-[16px] text-on-surface text-center">App configuration error</Text>
      <Text className="text-[13px] text-on-surface-variant text-center">{error.message}</Text>
    </View>
  );
}

/** The `consent` stage: terms or privacy changed since the user accepted them. */
export function ReconsentScreen() {
  const { t } = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useSession();
  const signOut = useSignOut();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Page className="gap-5 pt-10">
      <Icon name="policy" size={44} className="text-primary" />
      <Text font="rubik" className="text-[24px] text-on-surface font-bold">
        {t('onboarding.reconsentTitle')}
      </Text>
      <Text className="text-[16px] leading-[25px] text-on-surface-variant">
        {t('onboarding.reconsentBody')}
      </Text>
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
      {error ? <Text className="text-[15px] text-error">{error}</Text> : null}
      <Pressable
        onPress={async () => {
          setBusy(true);
          setError(null);
          try {
            const next = await getSource().acceptCurrentConsents();
            queryClient.setQueryData(accountKey(session?.userId), next);
          } catch (e) {
            setError(t(errorKey(e)));
          } finally {
            setBusy(false);
          }
        }}
        disabled={busy}
        className="min-h-[52px] rounded-xl bg-primary-container active:bg-primary items-center justify-center"
      >
        <Text font="rubik" className="text-[17px] text-on-primary font-bold">
          {busy ? t('onboarding.saving') : t('onboarding.accept')}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => void signOut()}
        className="min-h-[44px] items-center justify-center"
      >
        <Text className="text-[15px] text-on-surface-variant">{t('onboarding.signOut')}</Text>
      </Pressable>
    </Page>
  );
}

/**
 * The `guardian` stage (spec §7, S1-11): a youth names their guardian and we email an approval
 * link. Once an invite is pending the youth may continue into the app; recorded matches and any
 * visibility stay closed until the guardian approves. The account refreshes only on "Continue",
 * so the send result stays on screen.
 */
export function GuardianStepScreen() {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const { session } = useSession();
  const account = useAccount();
  const signOut = useSignOut();
  const [links, setLinks] = useState<GuardianLink[] | null>(null);
  const now = useNow(60_000);
  const current = links ?? account.data?.guardians ?? [];
  const named = current.length > 0;
  // Not yet told (failed or no send): the youth may go on, but with the limits spelled out.
  const told = guardianInviteState(current, now).state === 'sent';
  return (
    <Page className="gap-5 pt-10">
      <Icon name="family_restroom" size={48} className="text-primary" />
      <Text font="rubik" className="text-[24px] text-on-surface font-bold">
        {t('guardianStep.title')}
      </Text>
      <Text className="text-[16px] leading-[25px] text-on-surface-variant">
        {t('guardianStep.body')}
      </Text>
      <GuardianInvitePanel initial={account.data?.guardians ?? []} onChange={setLinks} />
      {named ? (
        <Pressable
          onPress={() =>
            void queryClient.invalidateQueries({ queryKey: accountKey(session?.userId) })
          }
          accessibilityRole="button"
          className="min-h-[52px] rounded-xl border border-primary/60 items-center justify-center"
        >
          <Text font="rubik" className="text-[16px] text-primary font-bold">
            {told ? t('guardianStep.continue') : t('guardianStep.continueLimited')}
          </Text>
        </Pressable>
      ) : null}
      <Pressable
        onPress={() => void signOut()}
        className="min-h-[44px] items-center justify-center"
      >
        <Text className="text-[15px] text-on-surface-variant">{t('guardianStep.signOut')}</Text>
      </Pressable>
    </Page>
  );
}
