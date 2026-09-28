import { Pressable, View } from 'react-native';

import { sfx } from '@/design/sound';
import { useTheme } from '@/design/theme';
import type { ThemeName } from '@/design/tokens';
import { useLocale } from '@/lib/locale';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';

/** "مظهر وإضاءة التطبيق": pick the floodlit night theme or the daylight theme. */
export function ThemeCard() {
  const { t } = useLocale();
  const { theme, setTheme } = useTheme();
  const options: { id: ThemeName; icon: 'dark_mode' | 'light_mode'; label: string }[] = [
    { id: 'dark', icon: 'dark_mode', label: t('profile.theme.dark') },
    { id: 'light', icon: 'light_mode', label: t('profile.theme.light') },
  ];
  return (
    <View className="rounded-xl bg-surface-container p-3.5 border border-border shadow-md gap-2.5">
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-row items-center gap-2 flex-1">
          <Icon name="palette" size={20} className="text-primary" />
          <View className="flex-1">
            <Text font="rubik" className="text-[14px] leading-[18px] text-on-surface font-bold">
              {t('profile.theme.title')}
            </Text>
            <Text className="text-[11px] text-on-surface-variant">{t('profile.theme.sub')}</Text>
          </View>
        </View>
        <View className="bg-primary-container/15 px-2 py-0.5 rounded-full border border-primary-container/30">
          <Text font="grotesk" className="text-[11px] font-bold text-primary">
            {theme === 'dark' ? t('profile.theme.darkChip') : t('profile.theme.lightChip')}
          </Text>
        </View>
      </View>
      <View className="flex-row gap-2 pt-1">
        {options.map((option) => {
          const active = theme === option.id;
          const lightActive = active && option.id === 'light';
          return (
            <Pressable
              key={option.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              onPress={() => {
                sfx.clipBeep();
                setTheme(option.id);
              }}
              className={`flex-1 p-2.5 rounded-xl border flex-row items-center justify-center gap-2 ${
                active
                  ? lightActive
                    ? 'bg-white border-primary-container shadow-md'
                    : 'bg-surface border-primary shadow-md'
                  : 'bg-surface-container-high border-transparent'
              }`}
            >
              <Icon
                name={option.icon}
                size={18}
                className={
                  active
                    ? lightActive
                      ? 'text-amber-dark'
                      : 'text-primary'
                    : 'text-on-surface-variant'
                }
              />
              <Text
                font="rubik"
                className={`text-[13px] ${
                  active
                    ? lightActive
                      ? 'text-amber-dark font-bold'
                      : 'text-primary font-bold'
                    : 'text-on-surface-variant'
                }`}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
