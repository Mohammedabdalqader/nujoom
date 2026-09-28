import { formatMatchClock } from '@nujoom/shared';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import type { Clip } from '@/data/types';
import { useLocale } from '@/lib/locale';
import { shareToWhatsApp } from '@/lib/share';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { useToast } from '@/ui/Toast';

/** Tall 4:5 clip card from the Home carousel (thumbnail, tag, player, share, likes and views). */
export function ClipCard({ clip }: { clip: Clip }) {
  const { t, pick, compact, ago } = useLocale();
  const router = useRouter();
  const toast = useToast();
  const open = () => router.push({ pathname: '/clip/[id]', params: { id: clip.id } });

  const share = async () => {
    const text = t('home.clips.shareText', {
      player: clip.player.name,
      app: t('app.name'),
      title: clip.title,
      url: clip.shareUrl,
    });
    if ((await shareToWhatsApp(text)) === 'copied') toast.show(t('common.copied'));
  };

  return (
    <View className="w-64 rounded-xl bg-surface-container-low overflow-hidden shadow-lg border border-border/60">
      <Pressable
        onPress={open}
        className="relative w-full h-80"
        accessibilityLabel={t('home.clips.play')}
      >
        <Image
          source={{ uri: clip.thumbnailUrl }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
        />
        <View className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-black/40" />

        <View className="absolute top-3 inset-x-3 flex-row items-center justify-between">
          <View className="bg-surface/80 px-2 py-0.5 rounded-full">
            <Text font="grotesk" className="text-[11px] text-on-surface">
              {formatMatchClock(clip.durationSec * 1000)}
            </Text>
          </View>
          <View
            className={`px-2 py-0.5 rounded-full ${clip.type === 'save' ? 'bg-secondary/90' : 'bg-primary/90'}`}
          >
            <Text
              font="grotesk"
              className={`text-[11px] font-bold ${
                clip.type === 'save' ? 'text-on-secondary' : 'text-on-primary-fixed'
              }`}
            >
              {t(`clipTypes.${clip.type}`)}
            </Text>
          </View>
        </View>

        <View className="absolute inset-0 items-center justify-center">
          <View className="w-12 h-12 rounded-full bg-primary-container/90 items-center justify-center shadow-lg">
            <Icon name="play_arrow" filled size={28} className="text-on-primary-container" />
          </View>
        </View>

        <View className="absolute bottom-3 inset-x-3 flex-row items-end justify-between">
          <View className="flex-1 me-2">
            <Text
              font="rubik"
              className="text-[18px] leading-[22px] text-on-surface font-bold"
              numberOfLines={1}
            >
              {clip.player.name}
            </Text>
            <Text className="text-[12px] text-on-surface-variant font-medium" numberOfLines={1}>
              {clip.player.handle ? `@${clip.player.handle} • ` : ''}
              {pick(clip.pitchName)}
            </Text>
          </View>
          <Pressable
            onPress={share}
            accessibilityRole="button"
            accessibilityLabel={t('common.shareWhatsApp')}
            className="w-10 h-10 rounded-full bg-secondary-container items-center justify-center shadow-md active:scale-90"
          >
            <Icon name="share" size={20} className="text-on-secondary-container" />
          </Pressable>
        </View>
      </Pressable>

      <View className="p-3 bg-surface-container-low flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <View className="flex-row items-center gap-1">
            <Icon name="favorite" size={16} className="text-tertiary" />
            <Text font="grotesk" className="text-[11px] text-on-surface-variant">
              {compact(clip.likes)}
            </Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Icon name="visibility" size={16} className="text-on-surface-variant" />
            <Text font="grotesk" className="text-[11px] text-on-surface-variant">
              {compact(clip.views)}
            </Text>
          </View>
        </View>
        <Text font="grotesk" className="text-[11px] text-primary font-medium">
          {ago(clip.createdAt)}
        </Text>
      </View>
    </View>
  );
}
