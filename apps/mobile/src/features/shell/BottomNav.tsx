import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNotifications } from '@/data/api';
import { sfx } from '@/design/sound';
import { Chrome } from '@/features/shell/Chrome';
import { TABS } from '@/features/shell/tabs';
import { useLocale } from '@/lib/locale';
import { DemoMarker } from '@/ui/DemoMarker';
import { Icon } from '@/ui/Icon';
import { PingDot } from '@/ui/PingDot';
import { Text } from '@/ui/Text';

/** The prototype's five-tab bar with the gold active glow and red unread dots. */
export function BottomNav({ state, navigation }: BottomTabBarProps) {
  const { t } = useLocale();
  const insets = useSafeAreaInsets();
  const notifications = useNotifications().data ?? [];

  return (
    <Chrome className="absolute bottom-0 inset-x-0 z-50 border-t border-border/40 shadow-[0_-4px_24px_rgba(0,0,0,0.5)]">
      <DemoMarker />
      <View
        className="h-16 flex-row items-center justify-around px-1 w-full max-w-lg self-center"
        // The prototype's pb-safe: at least 16 px under the bar.
        style={{ marginBottom: Math.max(insets.bottom, 16) }}
      >
        {TABS.map((tab, index) => {
          const active = state.index === index;
          const unread = notifications.some((n) => n.unread && n.tab === tab.key);
          return (
            <Pressable
              key={tab.name}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={t(`nav.${tab.key}`)}
              onPress={() => {
                sfx.clipBeep();
                if (!active) navigation.navigate(tab.name);
              }}
              className="min-w-[56px] h-12 items-center justify-center"
            >
              <View className={active ? 'scale-110' : ''}>
                <Icon
                  name={tab.icon}
                  size={22}
                  className={
                    active
                      ? 'text-primary text-shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                      : 'text-on-surface-variant'
                  }
                />
                {unread ? (
                  <View className="absolute -top-1 -start-1">
                    <PingDot color="bg-live" size="h-2 w-2" className="border border-surface" />
                  </View>
                ) : null}
              </View>
              <Text
                className={`text-[12px] leading-[15px] mt-0.5 ${
                  active ? 'text-primary font-bold' : 'text-on-surface-variant font-medium'
                }`}
              >
                {t(`nav.${tab.key}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Chrome>
  );
}
