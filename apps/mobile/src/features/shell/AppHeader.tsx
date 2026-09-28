import { initials } from '@nujoom/shared';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFriends, useMe, useNotifications } from '@/data/api';
import { sfx } from '@/design/sound';
import { useTheme } from '@/design/theme';
import { Chrome } from '@/features/shell/Chrome';
import type { TabKey } from '@/features/shell/tabs';
import { useLocale } from '@/lib/locale';
import { Avatar } from '@/ui/Avatar';
import { Icon } from '@/ui/Icon';
import { PingDot } from '@/ui/PingDot';
import { Text } from '@/ui/Text';

/** The prototype's fixed header: brand, city chip, tab subtitle and the four action buttons. */
export function AppHeader({ tab }: { tab: TabKey }) {
  const { t, pick } = useLocale();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const me = useMe().data;
  const unread = useNotifications().data?.filter((n) => n.unread).length ?? 0;
  const online = useFriends().data?.filter((f) => f.presence === 'online').length ?? 0;

  return (
    <Chrome className="absolute top-0 inset-x-0 z-50 shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
      <View style={{ paddingTop: insets.top }}>
        <View className="h-16 px-3 flex-row items-center justify-between gap-2 w-full max-w-lg self-center">
          <View className="flex-row items-center gap-2 flex-1 min-w-0">
            <Image
              source={require('../../../assets/images/logo.png')}
              style={{ width: 32, height: 32 }}
              contentFit="contain"
              accessibilityLabel={t('header.logo')}
            />
            <View className="flex-1 min-w-0">
              <View className="flex-row items-center gap-1">
                <Text
                  font="rubik"
                  className="text-[18px] leading-[22px] text-primary font-bold"
                  numberOfLines={1}
                >
                  {t('app.name')}
                </Text>
                {me ? (
                  <View className="bg-surface-container-high px-1.5 py-0.5 rounded-full">
                    <Text font="grotesk" className="text-[11px] text-secondary font-bold uppercase">
                      {pick(me.city)}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text
                font="grotesk"
                className="text-[11px] text-on-surface-variant tracking-wider uppercase"
                numberOfLines={1}
                ellipsizeMode="head"
              >
                {t(`header.subtitle.${tab}`)}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center gap-1.5">
            <Pressable
              onPress={toggleTheme}
              accessibilityRole="button"
              accessibilityLabel={theme === 'dark' ? t('header.lightMode') : t('header.darkMode')}
              className="w-10 h-10 items-center justify-center rounded-full bg-surface-container border border-border active:scale-95"
            >
              <Icon
                name={theme === 'dark' ? 'light_mode' : 'dark_mode'}
                size={20}
                className={theme === 'dark' ? 'text-primary' : 'text-primary-container'}
              />
            </Pressable>

            <Pressable
              onPress={() => {
                sfx.clipBeep();
                router.push('/friends');
              }}
              accessibilityRole="button"
              accessibilityLabel={t('header.friends')}
              className="w-11 h-11 items-center justify-center rounded-full bg-surface-container"
            >
              <Icon name="group" size={21} className="text-on-surface" />
              {online > 0 ? (
                <View className="absolute -top-1 -end-1 h-4 min-w-4 px-1 items-center justify-center rounded-full bg-secondary-container border border-surface">
                  <Text
                    font="grotesk"
                    className="text-[9px] leading-[11px] text-on-secondary-container font-black"
                  >
                    {online}
                  </Text>
                </View>
              ) : null}
            </Pressable>

            <Pressable
              onPress={() => router.push('/notifications')}
              accessibilityRole="button"
              accessibilityLabel={t('header.notifications')}
              className="w-11 h-11 items-center justify-center rounded-full bg-surface-container"
            >
              <Icon name="notifications" size={22} className="text-on-surface" />
              {unread > 0 ? (
                <View className="absolute top-2 start-2">
                  <PingDot color="bg-live" size="h-2.5 w-2.5" className="border-2 border-surface" />
                </View>
              ) : null}
            </Pressable>

            <Pressable
              onPress={() => {
                sfx.clipBeep();
                router.navigate('/profile');
              }}
              accessibilityRole="button"
              accessibilityLabel={t('header.profile')}
              className="p-0.5"
            >
              <Avatar
                uri={me?.avatarUrl}
                initials={me ? initials(me.name) : ''}
                size="w-8 h-8"
                className="border-2 border-primary/60"
              />
              <View className="absolute bottom-0 end-0 w-2.5 h-2.5 rounded-full bg-secondary border-2 border-surface" />
            </Pressable>
          </View>
        </View>
      </View>
    </Chrome>
  );
}
