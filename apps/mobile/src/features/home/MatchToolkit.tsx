import { useRouter, type Href } from 'expo-router';
import { Pressable, View } from 'react-native';

import { sfx } from '@/design/sound';
import { useLocale } from '@/lib/locale';
import { Icon, type IconName } from '@/ui/Icon';
import { Text } from '@/ui/Text';

type Tool = {
  href: Href;
  icon: IconName;
  title: string;
  sub: string;
  tile: string;
  iconColor: string;
  subColor: string;
};

/** The three match-day tools (team draw, gear, pitch kitty) as a compact card. */
export function MatchToolkit({ bookingId }: { bookingId: string | null }) {
  const { t } = useLocale();
  const router = useRouter();
  const params = bookingId ? { bookingId } : {};
  const tools: Tool[] = [
    {
      href: { pathname: '/tools/squad', params },
      icon: 'balance',
      title: t('home.tools.squad'),
      sub: t('home.tools.squadSub'),
      tile: 'bg-team-blue-deep/20',
      iconColor: 'text-team-blue-light',
      subColor: 'text-primary',
    },
    {
      href: { pathname: '/tools/gear', params },
      icon: 'sports_soccer',
      title: t('home.tools.gear'),
      sub: t('home.tools.gearSub'),
      tile: 'bg-secondary-container/20',
      iconColor: 'text-secondary',
      subColor: 'text-secondary',
    },
    {
      href: { pathname: '/tools/cost', params },
      icon: 'payments',
      title: t('home.tools.cost'),
      sub: t('home.tools.costSub'),
      tile: 'bg-primary-container/20',
      iconColor: 'text-primary',
      subColor: 'text-primary',
    },
  ];

  return (
    <View className="rounded-2xl bg-gradient-to-r from-surface-container to-surface-container-low p-3 shadow-lg border border-primary/20">
      <View className="flex-row items-center justify-between mb-2.5">
        <View className="flex-row items-center gap-1.5">
          <Icon name="sports_and_outdoors" size={18} className="text-primary" />
          <Text font="rubik" className="text-[14px] text-on-surface font-bold">
            {t('home.tools.title')}
          </Text>
        </View>
        <View className="bg-primary-container/15 px-2 py-0.5 rounded-full">
          <Text font="grotesk" className="text-[10px] text-primary font-bold">
            {t('home.tools.count')}
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
            className="flex-1 p-2 rounded-xl bg-surface-container-high active:bg-surface-container-highest border border-surface-bright items-center active:scale-95"
          >
            <View className={`w-8 h-8 rounded-lg items-center justify-center mb-1 ${tool.tile}`}>
              <Icon name={tool.icon} size={18} className={tool.iconColor} />
            </View>
            <Text
              font="rubik"
              className="text-[11px] leading-[14px] text-on-surface font-bold text-center"
            >
              {tool.title}
            </Text>
            <Text className={`text-[9px] mt-0.5 text-center ${tool.subColor}`}>{tool.sub}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
