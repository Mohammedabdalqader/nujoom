import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import type { ClipType, MatchDay } from '@/data/types';
import { haptics } from '@/design/haptics';
import { sfx } from '@/design/sound';
import { clipBlocker } from '@/features/match/rules';
import { useLocale } from '@/lib/locale';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { useToast } from '@/ui/Toast';

/**
 * The big "سجّل اللقطة!" button and the goal/skill chips (spec §6.8). A tap marks a clip window
 * (30 s before, 5 s after) on the recording phone. Only checked-in players can clip, and only
 * while the match is live with a recording phone picked.
 */
export function ClipController({
  match,
  onClip,
}: {
  match: MatchDay;
  onClip: (type: ClipType) => void;
}) {
  const { t } = useLocale();
  const toast = useToast();
  const [saved, setSaved] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trigger = (type: ClipType, message: string) => {
    const blocker = clipBlocker(match);
    if (blocker) {
      toast.show(t(`match.clip.${blocker}`));
      return;
    }
    sfx.clipBeep();
    haptics.clip();
    onClip(type);
    setSaved(message);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setSaved(null), 3500);
  };

  return (
    <View className="rounded-2xl bg-gradient-to-b from-surface-container-high to-surface-container p-4 shadow-2xl overflow-hidden items-center border border-error/20">
      <View className="absolute -top-16 inset-x-0 h-40 bg-gradient-to-b from-error-container/25 via-primary-container/15 to-transparent" />

      <View className="flex-row items-center justify-between w-full mb-4">
        <View className="flex-row items-center gap-1.5">
          <Icon name="emergency_recording" size={20} className="text-error animate-pulse" />
          <Text font="rubik" className="text-[18px] text-on-surface font-bold">
            {t('match.clip.title')}
          </Text>
        </View>
        <View className="bg-primary-container/20 px-2 py-0.5 rounded-full">
          <Text font="grotesk" className="text-[11px] text-primary font-bold">
            {t('match.clip.quality')}
          </Text>
        </View>
      </View>

      <View className="my-2 items-center justify-center w-44 h-44">
        <View className="absolute w-36 h-36 rounded-full bg-error-container/30 animate-ping" />
        <View className="absolute w-44 h-44 rounded-full bg-primary-container/10" />
        <Pressable
          onPress={() => trigger('moment', t('match.clip.savedMoment'))}
          accessibilityRole="button"
          accessibilityLabel={t('match.clip.button')}
          className="w-32 h-32 rounded-full bg-gradient-to-tr from-crimson-deep via-crimson to-team-orange shadow-[0_0_35px_rgba(239,68,68,0.55)] items-center justify-center p-2 active:scale-90"
        >
          <View className="w-24 h-24 rounded-full bg-surface/20 items-center justify-center p-1">
            <Icon
              name="slow_motion_video"
              size={38}
              className="text-white text-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
            />
            <Text
              font="rubik"
              className="text-[20px] leading-[24px] text-white font-extrabold tracking-tight mt-0.5 text-center"
            >
              {t('match.clip.button')}
            </Text>
          </View>
        </Pressable>
      </View>

      <View className="mt-4 items-center">
        <Text font="rubik" className="text-[18px] text-primary font-bold">
          {t('match.clip.tagline')}
        </Text>
        <Text className="text-[12px] text-on-surface-variant max-w-xs mt-0.5 text-center">
          {t('match.clip.hint')}
        </Text>
      </View>

      <View className="flex-row gap-2 w-full mt-4 pt-1">
        <Pressable
          onPress={() => trigger('goal', t('match.clip.savedGoal'))}
          className="flex-1 flex-row items-center justify-center gap-2 py-3 px-3 rounded-xl bg-amber-dark/20 active:bg-amber-dark/30 active:scale-95 shadow-md border border-amber-dark/40"
        >
          <Icon name="sports_soccer" size={20} className="text-primary" />
          <Text font="rubik" className="text-[14px] text-primary font-bold">
            {t('match.clip.goal')}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => trigger('skill', t('match.clip.savedSkill'))}
          className="flex-1 flex-row items-center justify-center gap-2 py-3 px-3 rounded-xl bg-surface-container-highest active:bg-surface-bright active:scale-95 shadow-md border border-secondary/30"
        >
          <Icon name="flare" size={20} className="text-secondary" />
          <Text font="rubik" className="text-[14px] text-secondary font-bold">
            {t('match.clip.skill')}
          </Text>
        </Pressable>
      </View>

      {saved ? (
        <View
          accessibilityLiveRegion="polite"
          className="absolute inset-x-4 bottom-4 p-3 rounded-xl bg-error-container shadow-2xl flex-row items-center justify-between border border-error animate-bounce"
        >
          <View className="flex-row items-center gap-2 flex-1">
            <Icon name="check_circle" size={22} className="text-on-error-container" />
            <Text className="text-[14px] text-on-error-container font-bold flex-1">{saved}</Text>
          </View>
          <View className="bg-surface/40 px-2 py-0.5 rounded">
            <Text
              font="grotesk"
              className="text-[11px] text-on-error-container uppercase font-bold"
            >
              {t('match.clip.done')}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}
