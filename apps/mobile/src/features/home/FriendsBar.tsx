import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { sfx } from '@/design/sound';
import { useLocale } from '@/lib/locale';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';

/** "شلة الحارة والأصدقاء": the squad presence bar that opens the friends dialog. */
export function FriendsBar({ online }: { online: number }) {
  const { t } = useLocale();
  const router = useRouter();
  return (
    <Pressable
      onPress={() => {
        sfx.clipBeep();
        router.push('/friends');
      }}
      className="overflow-hidden bg-gradient-to-r from-surface-container to-surface-container-low p-3.5 rounded-xl border border-border active:border-secondary/40 shadow-md flex-row items-center justify-between"
    >
      <View className="flex-row items-center gap-3 flex-1">
        <View className="w-10 h-10 rounded-xl bg-secondary-container/20 border border-secondary-container/30 items-center justify-center">
          <Icon name="group" size={22} className="text-secondary" />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center gap-2 flex-wrap">
            <Text font="rubik" className="text-[15px] font-bold text-on-surface">
              {t('home.friends.title')}
            </Text>
            <View className="flex-row items-center gap-1 bg-secondary-container/20 px-2 py-0.5 rounded-full">
              <View className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
              <Text font="grotesk" className="text-[11px] text-secondary font-bold">
                {t('home.friends.online', { count: online })}
              </Text>
            </View>
          </View>
          <Text className="text-[12px] text-on-surface-variant mt-0.5">
            {t('home.friends.sub')}
          </Text>
        </View>
      </View>
      <View className="flex-row items-center gap-1">
        <Icon name="arrow_back" size={18} directional className="text-primary" />
      </View>
    </Pressable>
  );
}
