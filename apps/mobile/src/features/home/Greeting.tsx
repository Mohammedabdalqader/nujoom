import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import type { Me } from '@/data/types';
import { sfx } from '@/design/sound';
import { useLocale } from '@/lib/locale';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';

/** "أهلاً يا كابتن …" with the waving hand and the Beta rating badge. */
export function Greeting({ me }: { me: Me }) {
  const { t } = useLocale();
  const router = useRouter();
  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-1">
        <View className="flex-row items-center gap-1.5">
          <Text
            font="rubik"
            className="text-[22px] leading-[30px] text-on-surface font-extrabold tracking-tight"
          >
            {t('home.greeting', { name: me.firstName })}
          </Text>
          <Text className="text-xl animate-bounce">👋</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <View className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
          <Text className="text-[12px] text-on-surface-variant">{t('home.ready')}</Text>
        </View>
      </View>

      <Pressable
        onPress={() => {
          sfx.clipBeep();
          router.navigate('/profile');
        }}
        className="bg-surface-container-high active:bg-surface-bright px-3 py-1.5 rounded-xl flex-row items-center gap-2 shadow-sm"
      >
        <Icon name="military_tech" filled size={20} className="text-primary" />
        <View>
          <Text
            font="grotesk"
            className="text-[11px] text-on-surface-variant uppercase font-semibold"
          >
            {t('home.betaRating')}
          </Text>
          <Text font="grotesk" className="text-[16px] leading-[18px] text-primary font-bold">
            {me.form.toFixed(1)}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}
