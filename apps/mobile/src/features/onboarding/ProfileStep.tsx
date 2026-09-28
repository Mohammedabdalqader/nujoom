import {
  dobFromParts,
  isYouthDob,
  PLAYER_POSITIONS,
  validateProfileStep,
  type OnboardingIssue,
} from '@nujoom/shared';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { getSource } from '@/data/source';
import { sfx } from '@/design/sound';
import { useTheme } from '@/design/theme';
import { useLocale } from '@/lib/locale';
import { useSignOut } from '@/lib/session';
import { Field } from '@/ui/Field';
import { ChoiceChips, Page } from '@/ui/Page';
import { SelectField } from '@/ui/SelectField';
import { Text } from '@/ui/Text';

import { useOnboardingDraft } from './draft';

export const ISSUE_KEYS: Record<OnboardingIssue, string> = {
  displayName: 'errors.profile.name',
  dob: 'errors.onboarding.dob',
  belowMinAge: 'errors.onboarding.belowMinAge',
  city: 'errors.profile.city',
  neighborhood: 'errors.profile.neighborhood',
  position: 'errors.profile.position',
  handle: 'errors.profile.handle',
  shirtNumber: 'errors.profile.shirtNumber',
  terms: 'errors.consent.required',
  privacy: 'errors.consent.required',
};

const westernDigits = (v: string) =>
  v
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/\D/g, '');

export const useOnboardingOptions = () =>
  useQuery({
    queryKey: ['onboarding-options'],
    queryFn: () => getSource().onboardingOptions(),
    staleTime: 10 * 60_000,
  });

/**
 * Onboarding step 1 (docs/DESIGN.md §Slice 1): name and date of birth, city and neighbourhood,
 * position; foot, shirt number and username optional; visibility for adults. No city is
 * preselected, and nothing is sent until the consent step.
 */
export function ProfileStep() {
  const { t, pick } = useLocale();
  const { color } = useTheme();
  const router = useRouter();
  const signOut = useSignOut();
  const { draft, update, serverError, setServerError } = useOnboardingDraft();
  const options = useOnboardingOptions();
  const [issues, setIssues] = useState<OnboardingIssue[]>([]);

  const cities = options.data?.cities ?? [];
  const city = cities.find((c) => c.id === draft.cityId) ?? null;
  const dob = dobFromParts(draft.day, draft.month, draft.year);
  const youth = dob !== null && isYouthDob(dob);
  const has = (issue: OnboardingIssue) => issues.includes(issue);
  const message = (issue: OnboardingIssue) => (has(issue) ? t(ISSUE_KEYS[issue]) : null);

  const next = () => {
    setServerError(null);
    const found = validateProfileStep({
      displayName: draft.displayName,
      dob,
      cityId: draft.cityId,
      neighborhoodId: draft.neighborhoodId,
      cityHasNeighborhoods: (city?.neighborhoods.length ?? 0) > 0,
      position: draft.position,
      handle: draft.handle,
      shirtNumber: draft.shirt === '' ? null : Number(draft.shirt),
    });
    // A date typed with an impossible day/month is still a date problem.
    if (dob === null && (draft.day || draft.month || draft.year) && !found.includes('dob')) {
      found.push('dob');
    }
    setIssues(found);
    if (found.length) return;
    sfx.clipBeep();
    router.push('/onboarding/consent');
  };

  if (options.isPending) {
    return (
      <Page>
        <ActivityIndicator color={color('primary')} />
      </Page>
    );
  }

  return (
    <Page className="gap-5">
      <View className="gap-2 pt-4">
        <Text font="grotesk" className="text-[12px] text-primary font-bold">
          {t('onboarding.stepOf', { step: 1, total: 2 })}
        </Text>
        <Text font="rubik" className="text-[26px] leading-[34px] text-on-surface font-bold">
          {t('onboarding.profileTitle')}
        </Text>
        <Text className="text-[15px] leading-[23px] text-on-surface-variant">
          {t('onboarding.profileSub')}
        </Text>
      </View>

      {serverError ? (
        <View className="rounded-xl bg-error-container/30 border border-error/40 p-3">
          <Text className="text-[15px] text-error">{serverError}</Text>
        </View>
      ) : null}
      {options.isError ? (
        <Pressable
          onPress={() => void options.refetch()}
          className="rounded-xl bg-error-container/30 border border-error/40 p-3"
        >
          <Text className="text-[15px] text-error">{t('errors.network')}</Text>
        </Pressable>
      ) : null}

      <Field
        label={t('onboarding.name')}
        value={draft.displayName}
        onChangeText={(displayName) => update({ displayName })}
        placeholder={t('onboarding.namePlaceholder')}
        autoComplete="name"
        maxLength={40}
        error={message('displayName')}
      />

      <View className="gap-1.5">
        <Text font="grotesk" className="text-[12px] text-on-surface-variant">
          {t('onboarding.dob')}
        </Text>
        <View className="flex-row gap-2">
          {(
            [
              ['day', 2],
              ['month', 2],
              ['year', 4],
            ] as const
          ).map(([part, max]) => (
            <View key={part} className="flex-1">
              <Field
                label={t(`onboarding.${part}`)}
                value={draft[part]}
                onChangeText={(v) => update({ [part]: westernDigits(v).slice(0, max) })}
                keyboardType="number-pad"
                maxLength={max}
                ltr
              />
            </View>
          ))}
        </View>
        {(message('dob') ?? message('belowMinAge')) ? (
          <Text className="text-[13px] text-error">{message('dob') ?? message('belowMinAge')}</Text>
        ) : (
          <Text className="text-[13px] text-on-surface-variant">{t('onboarding.dobHint')}</Text>
        )}
      </View>

      <View className="flex-row gap-3">
        <SelectField
          label={t('onboarding.city')}
          placeholder={t('onboarding.chooseCity')}
          options={cities.map((c) => ({ value: String(c.id), label: pick(c.name) }))}
          value={draft.cityId === null ? null : String(draft.cityId)}
          onChange={(v) => update({ cityId: Number(v), neighborhoodId: null })}
          error={message('city')}
        />
      </View>
      {city && city.neighborhoods.length ? (
        <View className="flex-row gap-3">
          <SelectField
            label={t('onboarding.neighborhood')}
            placeholder={t('onboarding.chooseNeighborhood')}
            options={city.neighborhoods.map((n) => ({ value: String(n.id), label: pick(n.name) }))}
            value={draft.neighborhoodId === null ? null : String(draft.neighborhoodId)}
            onChange={(v) => update({ neighborhoodId: Number(v) })}
            error={message('neighborhood')}
          />
        </View>
      ) : null}

      <View className="gap-1">
        <ChoiceChips
          label={t('onboarding.position')}
          options={PLAYER_POSITIONS.map((p) => ({ value: p, label: t(`positions.${p}`) }))}
          value={draft.position}
          onChange={(position) => update({ position })}
        />
        {message('position') ? (
          <Text className="text-[13px] text-error">{message('position')}</Text>
        ) : null}
      </View>

      <ChoiceChips
        label={t('onboarding.foot')}
        options={(['right', 'left', 'both'] as const).map((f) => ({
          value: f,
          label: t(`onboarding.feet.${f}`),
        }))}
        value={draft.foot}
        onChange={(foot) => update({ foot: draft.foot === foot ? null : foot })}
      />

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Field
            label={t('onboarding.shirt')}
            value={draft.shirt}
            onChangeText={(v) => update({ shirt: westernDigits(v).slice(0, 2) })}
            keyboardType="number-pad"
            maxLength={2}
            error={message('shirtNumber')}
            ltr
          />
        </View>
        <View className="flex-[2]">
          <Field
            label={t('onboarding.handle')}
            value={draft.handle}
            onChangeText={(handle) => update({ handle })}
            placeholder={t('onboarding.handlePlaceholder')}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={21}
            error={message('handle')}
            ltr
          />
        </View>
      </View>

      {youth ? (
        <View className="rounded-xl bg-surface-container p-3 border border-border">
          <Text className="text-[15px] leading-[23px] text-on-surface-variant">
            {t('onboarding.youthVisibility')}
          </Text>
        </View>
      ) : (
        <ChoiceChips
          label={t('onboarding.visibility')}
          options={(['city', 'public', 'private'] as const).map((v) => ({
            value: v,
            label: t(`onboarding.visibilityOptions.${v}`),
          }))}
          value={draft.visibility}
          onChange={(visibility) => update({ visibility })}
        />
      )}

      <Pressable
        onPress={next}
        accessibilityRole="button"
        className="min-h-[52px] rounded-xl bg-primary-container active:bg-primary items-center justify-center"
      >
        <Text font="rubik" className="text-[17px] text-on-primary font-bold">
          {t('onboarding.continue')}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => void signOut()}
        accessibilityRole="button"
        className="min-h-[44px] items-center justify-center"
      >
        <Text className="text-[15px] text-on-surface-variant">{t('onboarding.signOut')}</Text>
      </Pressable>
    </Page>
  );
}
