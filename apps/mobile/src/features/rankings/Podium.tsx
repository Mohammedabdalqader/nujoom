import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import type { NeighborhoodStanding } from '@/data/types';
import { useLocale } from '@/lib/locale';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';

function Crest({ standing, size }: { standing: NeighborhoodStanding; size: number }) {
  return standing.crestUrl ? (
    <Image
      source={{ uri: standing.crestUrl }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      contentFit="cover"
    />
  ) : (
    <View
      style={{ width: size, height: size }}
      className="rounded-full bg-surface-container items-center justify-center"
    >
      <Icon name="shield" size={size * 0.5} className="text-primary" />
    </View>
  );
}

function Step({ standing }: { standing: NeighborhoodStanding }) {
  const { t, pick, number } = useLocale();
  const first = standing.rank === 1;
  return (
    <View className={`flex-1 items-center ${first ? '-mt-4' : ''}`}>
      <View className="mb-2">
        {first ? (
          <View className="w-18 h-18 rounded-full bg-gradient-to-br from-primary via-primary-container to-amber-dark p-1 items-center justify-center shadow-[0_0_24px_rgba(245,158,11,0.45)]">
            <Crest standing={standing} size={64} />
          </View>
        ) : (
          <View className="w-14 h-14 rounded-full bg-surface-container-highest p-1 items-center justify-center shadow-md">
            <Crest standing={standing} size={48} />
          </View>
        )}
        <View
          className={`absolute ${first ? '-top-3' : '-top-2'} inset-x-0 items-center ${first ? 'animate-bounce' : ''}`}
        >
          <Icon
            name={first ? 'crown' : 'workspace_premium'}
            filled
            size={first ? 28 : 20}
            className={
              first
                ? 'text-primary'
                : standing.rank === 2
                  ? 'text-on-surface-variant'
                  : 'text-outline'
            }
          />
        </View>
        <View
          className={`absolute -bottom-1 -start-1 rounded-full items-center justify-center ${
            first ? 'w-6 h-6 bg-primary shadow-md' : 'w-5 h-5 bg-surface-bright'
          }`}
        >
          <Text
            font="grotesk"
            className={`text-[11px] ${first ? 'text-on-primary font-black' : 'text-on-surface font-bold'}`}
          >
            {standing.rank}
          </Text>
        </View>
      </View>

      <Text
        font="rubik"
        className={
          first
            ? 'text-[22px] leading-[28px] text-primary font-black text-center'
            : 'text-[18px] text-on-surface font-bold text-center'
        }
        numberOfLines={1}
      >
        {pick(standing.name)}
      </Text>
      <Text
        font="grotesk"
        className={
          first
            ? 'text-[24px] leading-[28px] text-primary font-black mt-0.5'
            : 'text-[16px] text-on-surface-variant font-bold mt-0.5'
        }
      >
        {number(standing.points)}
      </Text>
      {first ? (
        <View className="flex-row items-center gap-0.5">
          <Icon
            name={standing.weeklyChange >= 0 ? 'arrow_upward' : 'arrow_drop_down'}
            size={12}
            className="text-secondary"
          />
          <Text font="grotesk" className="text-[11px] text-secondary font-bold">
            {t('rankings.pointsChange', {
              value: `${standing.weeklyChange >= 0 ? '+' : ''}${standing.weeklyChange}`,
            })}
          </Text>
        </View>
      ) : null}

      {first ? (
        <View className="w-full h-28 mt-2 bg-gradient-to-t from-primary/20 via-surface-container-highest to-surface-container-high rounded-t-xl items-center justify-center border-t-2 border-primary">
          <Icon name="local_fire_department" size={28} className="text-primary mb-1" />
          <Text font="rubik" className="text-[32px] leading-[34px] text-primary font-black">
            1
          </Text>
        </View>
      ) : (
        <View
          className={`w-full ${standing.rank === 2 ? 'h-20' : 'h-16'} mt-2 bg-gradient-to-t from-surface-container-highest to-surface-container rounded-t-lg items-center justify-center border-t border-surface-bright`}
        >
          <Text font="rubik" className="text-[28px] text-on-surface-variant/40 font-black">
            {standing.rank}
          </Text>
        </View>
      )}
    </View>
  );
}

/** "صدارة حارات …": the top three neighborhoods on a floodlit podium (spec §6.10). */
export function Podium({ standings, city }: { standings: NeighborhoodStanding[]; city: string }) {
  const { t } = useLocale();
  const byRank = (r: number) => standings.find((s) => s.rank === r);
  const order = [byRank(2), byRank(1), byRank(3)].filter(Boolean) as NeighborhoodStanding[];
  if (!order.length) return null;

  return (
    <View className="overflow-hidden rounded-2xl bg-surface-container-low p-4 shadow-xl border border-border">
      <Image
        source={require('../../../assets/images/podium-bg.jpg')}
        style={[StyleSheet.absoluteFill, { opacity: 0.2 }]}
        contentFit="cover"
      />
      <View className="flex-row items-center justify-between w-full mb-3">
        <View className="flex-row items-center gap-1.5">
          <Icon name="military_tech" filled size={22} className="text-primary" />
          <Text font="rubik" className="text-[22px] leading-[30px] text-on-surface font-bold">
            {t('rankings.podiumTitle', { city })}
          </Text>
        </View>
        <Text
          font="grotesk"
          className="text-[11px] text-on-surface-variant tracking-wider uppercase"
        >
          {t('rankings.liveUpdate')}
        </Text>
      </View>
      <View className="flex-row gap-2 w-full items-end pt-4 pb-2">
        {order.map((s) => (
          <Step key={s.rank} standing={s} />
        ))}
      </View>
    </View>
  );
}
