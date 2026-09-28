import { initials } from '@nujoom/shared';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import type { PlayerOfWeek } from '@/data/types';
import { useLocale } from '@/lib/locale';
import { Text } from '@/ui/Text';

const TILES = [
  { key: 'pac', color: 'text-on-surface' },
  { key: 'sho', color: 'text-primary' },
  { key: 'dri', color: 'text-on-surface' },
  { key: 'phy', color: 'text-secondary' },
] as const;

/** "هداف الحارة الأسبوعي": the week's top scorer as a mini FIFA card strip. */
export function PlayerOfWeekCard({ pow }: { pow: PlayerOfWeek }) {
  const { t, pick } = useLocale();
  const router = useRouter();
  return (
    <View className="rounded-2xl bg-surface-container overflow-hidden p-3.5 shadow-lg border border-border">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-1.5">
          <View className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse" />
          <Text font="rubik" className="text-[18px] text-on-surface font-bold">
            {t('rankings.playerOfWeek')}
          </Text>
        </View>
        <Text
          font="grotesk"
          className="text-[11px] text-primary uppercase font-bold tracking-wider"
        >
          {t('rankings.starCard')}
        </Text>
      </View>

      <Pressable
        onPress={() => router.push({ pathname: '/player/[id]', params: { id: pow.player.id } })}
        className="flex-row items-center gap-3 bg-surface-container-low rounded-xl p-2.5 border border-primary/30 active:border-primary"
      >
        <View className="w-20 h-24 rounded-lg overflow-hidden bg-surface-container-highest">
          {pow.player.avatarUrl ? (
            <Image
              source={{ uri: pow.player.avatarUrl }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              contentPosition="top"
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Text font="grotesk" className="text-[20px] text-primary font-bold">
                {initials(pow.player.name)}
              </Text>
            </View>
          )}
          <View className="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-surface-container-lowest to-transparent" />
          <View className="absolute top-1 start-1 bg-primary px-1 rounded">
            <Text font="grotesk" className="text-[9px] text-on-primary font-black">
              {pow.positionTag}
            </Text>
          </View>
        </View>
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center justify-between gap-2">
            <Text
              font="rubik"
              className="text-[22px] leading-[28px] text-primary font-black shrink"
              numberOfLines={1}
            >
              {pow.player.name}
            </Text>
            <Text font="grotesk" className="text-[24px] leading-[28px] text-secondary font-black">
              {pow.ovr}
            </Text>
          </View>
          <Text className="text-[12px] text-on-surface-variant">
            {pow.player.handle ? `@${pow.player.handle} • ` : ''}
            {pick(pow.neighborhood)}
          </Text>
          <View className="flex-row gap-1 mt-2">
            {TILES.map((tile) => (
              <View
                key={tile.key}
                className="flex-1 bg-surface-container-high rounded p-1 items-center"
              >
                <Text font="grotesk" className="text-[10px] text-on-surface-variant">
                  {t(`attributes.${tile.key}`)}
                </Text>
                <Text font="grotesk" className={`text-[13px] font-bold ${tile.color}`}>
                  {pow.attributes[tile.key]}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </Pressable>
    </View>
  );
}
