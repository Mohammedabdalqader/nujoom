import { formatMatchClock } from '@nujoom/shared';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import type { Clip } from '@/data/types';
import { sfx } from '@/design/sound';
import { useLocale } from '@/lib/locale';
import { Icon } from '@/ui/Icon';
import { SectionHeader } from '@/ui/SectionHeader';
import { Text } from '@/ui/Text';

function ClipRow({ clip, first }: { clip: Clip; first: boolean }) {
  const { t, pick, compact } = useLocale();
  const router = useRouter();
  const goal = clip.type === 'goal';
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/clip/[id]', params: { id: clip.id } })}
      className="rounded-xl bg-surface-container overflow-hidden p-3 flex-row gap-3.5 items-center active:bg-surface-container-high border border-border"
    >
      <View className="w-28 h-20 rounded-lg overflow-hidden shadow">
        <Image
          source={{ uri: clip.thumbnailUrl }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
        />
        <View className="absolute inset-0 bg-black/40 items-center justify-center">
          <View
            className={`w-8 h-8 rounded-full items-center justify-center shadow-lg ${
              first ? 'bg-primary-container' : 'bg-surface-container-highest'
            }`}
          >
            <Icon
              name="play_arrow"
              filled
              size={20}
              className={first ? 'text-on-primary-container' : 'text-on-surface'}
            />
          </View>
        </View>
        <View className="absolute bottom-1 start-1 px-1.5 py-0.5 rounded bg-surface-container-lowest/80">
          <Text font="grotesk" className="text-[9px] text-on-surface">
            {formatMatchClock(clip.durationSec * 1000)}
          </Text>
        </View>
      </View>
      <View className="flex-1 min-w-0 justify-between">
        <View>
          <View className="flex-row items-center gap-1.5">
            <View className={`px-1.5 py-0.5 rounded ${goal ? 'bg-primary/20' : 'bg-secondary/20'}`}>
              <Text
                font="grotesk"
                className={`text-[10px] font-bold ${goal ? 'text-primary' : 'text-secondary'}`}
              >
                {goal && clip.verified
                  ? t('profile.clips.verifiedGoal')
                  : goal
                    ? t('clipTypes.goal')
                    : t('profile.clips.assist')}
              </Text>
            </View>
            <Text className="text-[11px] text-on-surface-variant shrink" numberOfLines={1}>
              {pick(clip.pitchName)}
            </Text>
          </View>
          <Text
            font="rubik"
            className="text-[15px] text-on-surface font-bold mt-1"
            numberOfLines={1}
          >
            {clip.title}
          </Text>
        </View>
        <View className="flex-row items-center gap-3 mt-1">
          <View className="flex-row items-center gap-1">
            <Icon name="visibility" size={14} className="text-primary" />
            <Text className="text-[12px] text-on-surface-variant">{compact(clip.views)}</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Icon name="favorite" size={14} className="text-tertiary" />
            <Text className="text-[12px] text-on-surface-variant">{compact(clip.likes)}</Text>
          </View>
          {clip.context ? (
            <Text className="text-[11px] text-secondary font-medium shrink" numberOfLines={1}>
              {clip.context}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

/** "أبرز أهدافي ولقطاتي": latest clips of the player, and how to get more. */
export function HighlightsSection({ clips, total }: { clips: Clip[]; total: number }) {
  const { t } = useLocale();
  const router = useRouter();
  return (
    <View className="gap-3">
      <SectionHeader
        icon="video_library"
        iconSize={22}
        title={t('profile.clips.title')}
        accessory={
          <View className="px-2 py-0.5 rounded-full bg-surface-container-high">
            <Text font="grotesk" className="text-[11px] text-on-surface-variant">
              {t('profile.clips.count', { count: total })}
            </Text>
          </View>
        }
        trailing={
          <Pressable
            onPress={() =>
              clips[0] && router.push({ pathname: '/clip/[id]', params: { id: clips[0].id } })
            }
            hitSlop={8}
          >
            <Text font="grotesk" className="text-[11px] text-primary font-bold">
              {t('profile.clips.all')}
            </Text>
          </Pressable>
        }
      />
      {clips.length ? (
        clips.slice(0, 2).map((clip, i) => <ClipRow key={clip.id} clip={clip} first={i === 0} />)
      ) : (
        <Text className="text-[12px] text-on-surface-variant">{t('profile.clips.empty')}</Text>
      )}

      <View className="rounded-xl bg-gradient-to-r from-surface-container-high to-surface-container p-3.5 flex-row items-center justify-between border border-primary/20 gap-2">
        <View className="flex-row items-center gap-3 flex-1">
          <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center">
            <Icon name="videocam" size={22} className="text-primary" />
          </View>
          <View className="flex-1">
            <Text font="rubik" className="text-[16px] text-on-surface font-bold">
              {t('profile.clips.promptTitle')}
            </Text>
            <Text className="text-[12px] text-on-surface-variant">
              {t('profile.clips.promptBody')}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => {
            sfx.clipBeep();
            router.navigate('/match');
          }}
          className="px-3 py-2 rounded-lg bg-surface-bright active:bg-surface-container-highest"
        >
          <Text font="grotesk" className="text-[11px] text-on-surface font-bold">
            {t('profile.clips.promptCta')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
