import { useRouter, type Href } from 'expo-router';
import { Pressable, View } from 'react-native';

import { sfx } from '@/design/sound';
import { useLocale } from '@/lib/locale';
import { Icon, type IconName } from '@/ui/Icon';
import { Text } from '@/ui/Text';

/** The match tab's larger toolkit card ("أدوات يوم المباراة الذكية"). */
export function MatchDayToolkit({
  bookingId,
  costPerPlayer,
}: {
  bookingId: string;
  costPerPlayer: number | null;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const tools: {
    href: Href;
    icon: IconName;
    tile: string;
    icon2: string;
    title: string;
    sub: string;
    subColor: string;
  }[] = [
    {
      href: { pathname: '/tools/squad', params: { bookingId } },
      icon: 'balance',
      tile: 'bg-team-blue-deep/20',
      icon2: 'text-team-blue-light',
      title: t('home.tools.squad'),
      sub: t('match.tools.squadSub'),
      subColor: 'text-primary',
    },
    {
      href: { pathname: '/tools/gear', params: { bookingId } },
      icon: 'sports_soccer',
      tile: 'bg-secondary-container/20',
      icon2: 'text-secondary',
      title: t('home.tools.gear'),
      sub: t('match.tools.gearSub'),
      subColor: 'text-secondary',
    },
    {
      href: { pathname: '/tools/cost', params: { bookingId } },
      icon: 'payments',
      tile: 'bg-primary-container/20',
      icon2: 'text-primary',
      title: t('home.tools.cost'),
      sub:
        costPerPlayer !== null
          ? t('match.tools.costSub', { price: costPerPlayer.toFixed(2) })
          : t('match.tools.costSubEmpty'),
      subColor: 'text-primary',
    },
  ];

  return (
    <View className="rounded-2xl bg-gradient-to-br from-surface-container to-surface-container-low p-3.5 shadow-xl border border-primary/20 overflow-hidden">
      <View className="flex-row items-center justify-between mb-3 gap-2">
        <View className="flex-row items-center gap-2 flex-1">
          <View className="w-8 h-8 rounded-lg bg-primary-container/20 items-center justify-center border border-primary-container/30">
            <Icon name="sports" size={20} className="text-primary" />
          </View>
          <View className="flex-1">
            <Text font="rubik" className="text-[15px] leading-[19px] text-on-surface font-bold">
              {t('match.tools.title')}
            </Text>
            <Text className="text-[11px] text-on-surface-variant">{t('match.tools.sub')}</Text>
          </View>
        </View>
        <View className="px-2 py-0.5 rounded-full bg-primary-container/20 border border-primary-container/30">
          <Text font="grotesk" className="text-[10px] text-primary font-bold">
            {t('match.tools.count')}
          </Text>
        </View>
      </View>

      <View className="flex-row gap-2">
        {tools.map((tool) => (
          <Pressable
            key={tool.title}
            onPress={() => {
              sfx.clipBeep();
              router.push(tool.href);
            }}
            className="flex-1 items-center justify-center p-2.5 rounded-xl bg-surface-container-high active:bg-surface-container-highest border border-surface-bright active:scale-95 shadow-sm"
          >
            <View
              className={`w-10 h-10 rounded-xl items-center justify-center mb-1.5 ${tool.tile}`}
            >
              <Icon name={tool.icon} size={22} className={tool.icon2} />
            </View>
            <Text
              font="rubik"
              className="text-[12px] leading-[15px] text-on-surface font-bold text-center"
            >
              {tool.title}
            </Text>
            <Text className={`text-[10px] mt-0.5 text-center ${tool.subColor}`}>{tool.sub}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
