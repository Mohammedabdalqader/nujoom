import { initials } from '@nujoom/shared';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import type { LeaderboardRow } from '@/data/types';
import { useLocale } from '@/lib/locale';
import { Avatar } from '@/ui/Avatar';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';

const RANK_COLOR = ['text-primary', 'text-on-surface', 'text-outline'];

/** One "Top Ballers" row: rank and trend, player, position, matches, key stat, Elo and confidence. */
export function LeaderRow({ row }: { row: LeaderboardRow }) {
  const { t, pick, number } = useLocale();
  const router = useRouter();

  const key =
    row.keyStat.kind === 'goals'
      ? { text: t('rankings.keyGoals', { count: row.keyStat.value }), color: 'text-primary' }
      : row.keyStat.kind === 'assists'
        ? { text: t('rankings.keyAssists', { count: row.keyStat.value }), color: 'text-secondary' }
        : row.keyStat.kind === 'clean_sheets'
          ? {
              text: t('rankings.keyCleanSheets', { count: row.keyStat.value }),
              color: 'text-secondary',
            }
          : {
              text: t('rankings.keySavesPct', { value: row.keyStat.value }),
              color: 'text-secondary',
            };

  const top = row.rank <= 3;
  const highConfidence = row.confidence >= 85;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/player/[id]', params: { id: row.player.id } })}
      className="flex-row items-center justify-between p-2.5 bg-surface-container rounded-xl shadow-sm active:bg-surface-container-high border border-border/60"
    >
      <View className="flex-row items-center gap-2.5 flex-1 min-w-0">
        <View className="items-center justify-center w-7">
          <Text
            font="rubik"
            className={`text-[22px] leading-[24px] font-black ${RANK_COLOR[row.rank - 1] ?? 'text-on-surface-variant'}`}
          >
            {row.rank}
          </Text>
          <Icon
            name={
              row.trend === 'up'
                ? 'arrow_drop_up'
                : row.trend === 'down'
                  ? 'arrow_drop_down'
                  : 'equal'
            }
            size={14}
            className={row.trend === 'down' ? 'text-error' : 'text-secondary'}
          />
        </View>
        <View>
          <Avatar
            uri={row.player.avatarUrl}
            initials={initials(row.player.name)}
            size="w-12 h-12"
          />
          <View className="absolute bottom-0 start-0 w-3 h-3 bg-secondary rounded-full border-2 border-surface" />
        </View>
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-1">
            <Text
              font="rubik"
              className="text-[16px] text-on-surface font-bold shrink"
              numberOfLines={1}
            >
              {row.player.name}
            </Text>
            {row.rank === 1 ? (
              <Icon name="star" filled size={16} className="text-primary" />
            ) : (
              <View className="bg-surface-bright px-1.5 rounded">
                <Text font="grotesk" className="text-[10px] text-on-surface">
                  {pick(row.neighborhood)}
                </Text>
              </View>
            )}
          </View>
          <View className="flex-row items-center gap-1.5 flex-wrap">
            <Text className="text-[12px] text-on-surface-variant">
              {t(`positions.${row.position}`)}
            </Text>
            <Text className="text-[12px] text-on-surface-variant">•</Text>
            <Text className="text-[12px] text-on-surface-variant">
              {t('rankings.matches', { count: row.matches })}
            </Text>
            <Text className="text-[12px] text-on-surface-variant">•</Text>
            <Text className={`text-[12px] font-bold ${key.color}`}>{key.text}</Text>
          </View>
        </View>
      </View>
      <View className="items-end ps-1">
        <Text
          font="grotesk"
          className={`text-[24px] leading-[28px] font-black ${top && row.rank === 1 ? 'text-primary' : 'text-on-surface'}`}
        >
          {number(row.elo)}
        </Text>
        <View
          className={`px-1.5 py-0.5 rounded ${highConfidence ? 'bg-secondary/10' : 'bg-surface-bright'}`}
        >
          <Text
            font="grotesk"
            className={`text-[11px] font-semibold ${highConfidence ? 'text-secondary' : 'text-on-surface-variant'}`}
          >
            {t('rankings.confidence', { value: row.confidence })}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
