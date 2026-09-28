import { useRouter, type Href } from 'expo-router';
import { Pressable, View } from 'react-native';

import type { Clip } from '@/data/types';
import { sfx } from '@/design/sound';
import { useLocale } from '@/lib/locale';
import { Icon, type IconName } from '@/ui/Icon';
import { PingDot } from '@/ui/PingDot';
import { Text } from '@/ui/Text';

type TileProps = {
  icon: IconName;
  iconTile: string;
  iconColor: string;
  title: string;
  sub: string;
  tall?: boolean;
  urgent?: boolean;
  badge?: React.ReactNode;
  onPress: () => void;
};

function Tile({ icon, iconTile, iconColor, title, sub, tall, urgent, badge, onPress }: TileProps) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 overflow-hidden bg-surface-container-low active:bg-surface-container p-3.5 rounded-xl shadow-md justify-between border ${
        tall ? 'h-32' : 'h-28'
      } ${urgent ? 'border-error-container/30' : 'border-border/40'}`}
    >
      <View className="flex-row items-start justify-between w-full">
        <View
          className={`${tall ? 'w-10 h-10' : 'w-9 h-9'} rounded-lg items-center justify-center ${iconTile}`}
        >
          <Icon name={icon} size={tall ? 24 : 22} className={iconColor} />
        </View>
        {badge}
      </View>
      <View>
        <View className="flex-row items-center gap-1">
          <Text font="rubik" className="text-[18px] leading-[24px] text-on-surface font-bold">
            {title}
          </Text>
          {urgent ? <Text className="text-tertiary text-xs font-black">!</Text> : null}
        </View>
        <Text className="text-[12px] text-on-surface-variant" numberOfLines={1}>
          {sub}
        </Text>
      </View>
    </Pressable>
  );
}

/** The 2×2 bento of quick actions under the toolkit. */
export function QuickActions({
  city,
  missingCount,
  firstClip,
}: {
  city: string;
  missingCount: number;
  firstClip: Clip | undefined;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const go = (href: Href) => {
    sfx.clipBeep();
    router.navigate(href);
  };

  return (
    <View className="gap-2">
      <View className="flex-row gap-2">
        <Tile
          tall
          icon="sports_soccer"
          iconTile="bg-surface-container-high"
          iconColor="text-primary"
          title={t('home.quick.book')}
          sub={t('home.quick.bookSub')}
          onPress={() => go('/pitches')}
          badge={
            <View className="bg-surface-bright px-2 py-0.5 rounded-full">
              <Text font="grotesk" className="text-[11px] text-primary font-bold">
                {city}
              </Text>
            </View>
          }
        />
        <Tile
          tall
          urgent
          icon="person_add"
          iconTile="bg-error-container/50"
          iconColor="text-tertiary"
          title={t('home.quick.missing')}
          sub={t('home.quick.missingSub')}
          onPress={() => go('/missing-one')}
          badge={
            missingCount > 0 ? (
              <View className="flex-row items-center gap-1 bg-error-container/40 px-2 py-0.5 rounded-full">
                <PingDot color="bg-error" size="h-1.5 w-1.5" />
                <Text font="grotesk" className="text-[11px] text-tertiary font-bold">
                  {t('home.quick.needed', { count: missingCount })}
                </Text>
              </View>
            ) : null
          }
        />
      </View>
      <View className="flex-row gap-2">
        <Tile
          icon="videocam"
          iconTile="bg-surface-container-high"
          iconColor="text-secondary"
          title={t('home.quick.record')}
          sub={t('home.quick.recordSub')}
          onPress={() => go('/match')}
        />
        <Tile
          icon="play_circle"
          iconTile="bg-surface-container-high"
          iconColor="text-primary-fixed-dim"
          title={t('home.quick.highlights')}
          sub={t('home.quick.highlightsSub')}
          onPress={() =>
            firstClip ? go({ pathname: '/clip/[id]', params: { id: firstClip.id } }) : go('/match')
          }
        />
      </View>
    </View>
  );
}
