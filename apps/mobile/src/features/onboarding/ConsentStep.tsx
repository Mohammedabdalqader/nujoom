import {
  consentPayload,
  dobFromParts,
  errorKey,
  isYouthDob,
  normalizeDisplayName,
  normalizeHandle,
  validateConsentStep,
} from '@nujoom/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { getSource } from '@/data/source';
import { sfx } from '@/design/sound';
import { useTheme } from '@/design/theme';
import { useLocale } from '@/lib/locale';
import { accountKey, useSession } from '@/lib/session';
import { Icon } from '@/ui/Icon';
import { Page } from '@/ui/Page';
import { RichText } from '@/ui/RichText';
import { Text } from '@/ui/Text';

import { useOnboardingDraft } from './draft';
import { useOnboardingOptions } from './ProfileStep';

/** SQL codes that mean "fix something on the profile step". */
const PROFILE_ERRORS = new Set([
  'invalid_name',
  'invalid_handle',
  'handle_taken',
  'invalid_city',
  'invalid_neighborhood',
  'invalid_position',
  'invalid_shirt_number',
  'below_min_age',
  'dob_in_future',
]);

function Check({
  checked,
  onToggle,
  label,
  href,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  href: 'terms' | 'privacy';
}) {
  const { t } = useLocale();
  const router = useRouter();
  return (
    <View className="rounded-xl bg-surface-container border border-border p-3 gap-2">
      <Pressable
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        className="flex-row items-center gap-3 min-h-[44px]"
      >
        <View
          className={`w-7 h-7 rounded-lg border-2 items-center justify-center ${
            checked ? 'bg-secondary-container border-secondary-container' : 'border-outline'
          }`}
        >
          {checked ? <Icon name="check" size={18} className="text-on-secondary-container" /> : null}
        </View>
        <RichText
          className="flex-1 text-[16px] leading-[24px] text-on-surface"
          boldClassName="font-bold text-primary"
        >
          {label}
        </RichText>
        <Text font="grotesk" className="text-[11px] text-on-surface-variant">
          {t('onboarding.required')}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: href } })}
        accessibilityRole="link"
        className="min-h-[36px] justify-center"
      >
        <Text className="text-[14px] text-primary underline">
          {href === 'terms' ? t('auth.terms') : t('auth.privacy')}
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * Onboarding step 2 (docs/DESIGN.md §Slice 1, C-010): separate, unticked terms and privacy (the
 * account gate) and an optional recording yes/no with neither preselected. Streaming is never
 * implied. Submitting creates the account in one transaction (`complete_onboarding`).
 */
export function ConsentStep() {
  const { t } = useLocale();
  const { color } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useSession();
  const { draft, update, setServerError } = useOnboardingDraft();
  const options = useOnboardingOptions();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const dob = dobFromParts(draft.day, draft.month, draft.year);
  const youth = dob !== null && isYouthDob(dob);
  const answers = { terms: draft.terms, privacy: draft.privacy, recording: draft.recording };

  const finish = async () => {
    const issues = validateConsentStep(answers);
    if (issues.length) {
      setError(t('errors.consent.required'));
      return;
    }
    if (!options.data || dob === null || draft.cityId === null || draft.position === null) {
      router.back();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await getSource().completeOnboarding({
        displayName: normalizeDisplayName(draft.displayName),
        dob,
        cityId: draft.cityId,
        neighborhoodId: draft.neighborhoodId,
        position: draft.position,
        dominantFoot: draft.foot,
        handle: normalizeHandle(draft.handle),
        shirtNumber: draft.shirt === '' ? null : Number(draft.shirt),
        visibility: youth ? 'private' : draft.visibility,
        consents: consentPayload(answers, options.data.consentVersions),
      });
      sfx.success();
      // The router follows the account's new stage (app, or guardian for youth).
      await queryClient.invalidateQueries({ queryKey: accountKey(session?.userId) });
    } catch (e) {
      const message = e && typeof e === 'object' && 'message' in e ? String(e.message) : '';
      if (PROFILE_ERRORS.has(message)) {
        setServerError(t(errorKey(e)));
        router.back();
      } else {
        setError(t(errorKey(e)));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page className="gap-5">
      <View className="gap-2 pt-4">
        <Text font="grotesk" className="text-[12px] text-primary font-bold">
          {t('onboarding.stepOf', { step: 2, total: 2 })}
        </Text>
        <Text font="rubik" className="text-[26px] leading-[34px] text-on-surface font-bold">
          {t('onboarding.consentTitle')}
        </Text>
        <Text className="text-[15px] leading-[23px] text-on-surface-variant">
          {t('onboarding.consentSub')}
        </Text>
      </View>

      <Check
        checked={draft.terms}
        onToggle={() => update({ terms: !draft.terms })}
        label={t('onboarding.acceptTerms')}
        href="terms"
      />
      <Check
        checked={draft.privacy}
        onToggle={() => update({ privacy: !draft.privacy })}
        label={t('onboarding.acceptPrivacy')}
        href="privacy"
      />

      <View className="rounded-xl bg-surface-container border border-border p-3 gap-3">
        <View className="flex-row items-center gap-2">
          <Icon name="videocam" size={20} className="text-primary" />
          <Text font="rubik" className="text-[17px] text-on-surface font-bold shrink">
            {t('onboarding.recordingTitle')}
          </Text>
        </View>
        <Text className="text-[15px] leading-[23px] text-on-surface-variant">
          {t('onboarding.recordingBody')}
        </Text>
        {youth ? (
          <Text className="text-[15px] leading-[23px] text-primary">
            {t('onboarding.recordingYouth')}
          </Text>
        ) : null}
        <View className="flex-row gap-2" accessibilityRole="radiogroup">
          {([true, false] as const).map((value) => {
            const on = draft.recording === value;
            return (
              <Pressable
                key={String(value)}
                onPress={() => update({ recording: value })}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                className={`flex-1 min-h-[48px] rounded-xl border items-center justify-center ${
                  on
                    ? value
                      ? 'bg-secondary-container border-secondary-container'
                      : 'bg-surface-container-highest border-outline'
                    : 'border-border'
                }`}
              >
                <Text
                  font="rubik"
                  className={`text-[15px] font-bold ${
                    on && value ? 'text-on-secondary-container' : 'text-on-surface'
                  }`}
                >
                  {value ? t('onboarding.recordingYes') : t('onboarding.recordingNo')}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text className="text-[13px] text-on-surface-variant">{t('onboarding.streamingNote')}</Text>
      </View>

      {error ? (
        <View className="rounded-xl bg-error-container/30 border border-error/40 p-3">
          <Text className="text-[15px] text-error">{error}</Text>
          <Text className="text-[13px] text-on-surface-variant mt-1">
            {t('onboarding.draftSaved')}
          </Text>
        </View>
      ) : null}

      <View className="flex-row gap-3">
        <Pressable
          onPress={() => router.back()}
          disabled={busy}
          accessibilityRole="button"
          className="min-h-[52px] px-5 rounded-xl bg-surface-container-high items-center justify-center"
        >
          <Text font="rubik" className="text-[16px] text-on-surface">
            {t('onboarding.back')}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => void finish()}
          disabled={busy}
          accessibilityRole="button"
          className={`flex-1 min-h-[52px] rounded-xl bg-primary-container items-center justify-center flex-row gap-2 ${
            busy ? 'opacity-70' : 'active:bg-primary'
          }`}
        >
          {busy ? <ActivityIndicator color={color('on-primary')} /> : null}
          <Text font="rubik" className="text-[17px] text-on-primary font-bold">
            {busy ? t('onboarding.saving') : t('onboarding.finish')}
          </Text>
        </Pressable>
      </View>
    </Page>
  );
}
