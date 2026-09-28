import { formatRelativeTime } from '@nujoom/shared';
import { Pressable, View } from 'react-native';

import type { MissingOne } from '@/data/types';
import { useLocale } from '@/lib/locale';
import { Icon } from '@/ui/Icon';
import { PingDot } from '@/ui/PingDot';
import { Text } from '@/ui/Text';

/** "مباراة عاجلة": the soonest open spot nearby, with a quick-join button. */
export function UrgentBanner({ spot, onJoin }: { spot: MissingOne; onJoin: () => void }) {
  const { t, locale, pick } = useLocale();
  return (
    <View className="overflow-hidden rounded-xl bg-gradient-to-l from-error-container/40 via-surface-container to-surface-container p-3 flex-row items-center justify-between gap-3 shadow-md border border-error-container/40">
      <View className="flex-row items-center gap-3 flex-1 min-w-0">
        <View className="w-10 h-10 rounded-full bg-error/20 items-center justify-center">
          <Icon name="group_add" size={22} className="text-error animate-pulse" />
        </View>
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-1.5">
            <Text
              font="rubik"
              className="text-[14px] text-error font-bold shrink"
              numberOfLines={1}
            >
              {t('pitches.urgentTitle', { count: spot.openSpots })}
            </Text>
            <PingDot color="bg-error" size="w-2 h-2" />
          </View>
          <Text className="text-[12px] text-on-surface-variant" numberOfLines={1}>
            {t('pitches.urgentBody', {
              pitch: pick(spot.pitchName),
              relative: formatRelativeTime(spot.startsAt, locale),
            })}
          </Text>
        </View>
      </View>
      <Pressable
        onPress={onJoin}
        className="px-3 py-1.5 rounded-lg bg-error-container active:bg-crimson shadow-md active:scale-95"
      >
        <Text font="grotesk" className="text-[11px] text-on-error-container font-bold">
          {t('pitches.urgentJoin')}
        </Text>
      </Pressable>
    </View>
  );
}
