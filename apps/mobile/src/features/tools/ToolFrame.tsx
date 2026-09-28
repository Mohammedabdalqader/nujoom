import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { useLocale } from '@/lib/locale';
import { Dialog } from '@/ui/Dialog';
import { Icon, type IconName } from '@/ui/Icon';
import { Text } from '@/ui/Text';

type ToolFrameProps = {
  icon: IconName;
  /** Icon tile classes, e.g. `bg-primary-container/20 border-primary-container/30`. */
  tile: string;
  iconClassName: string;
  title: string;
  badge: string;
  /** Badge pill classes: background and border. */
  badgeClassName: string;
  badgeTextClassName: string;
  sub: string;
  shareLabel: string;
  onShare: () => void;
  children: ReactNode;
};

/**
 * The match tools' shared sheet (squad, gear, kitty): gradient header with icon tile and badge,
 * a scrolling body, and the close + "share to the WhatsApp group" action bar.
 */
export function ToolFrame({
  icon,
  tile,
  iconClassName,
  title,
  badge,
  badgeClassName,
  badgeTextClassName,
  sub,
  shareLabel,
  onShare,
  children,
}: ToolFrameProps) {
  const { t } = useLocale();
  const router = useRouter();
  return (
    <Dialog
      width="lg"
      className="bg-surface-container-low border border-border max-h-full overflow-hidden"
    >
      <View className="p-4 bg-gradient-to-r from-surface-container to-surface-container-low border-b border-border flex-row items-center justify-between gap-2">
        <View className="flex-row items-center gap-2.5 flex-1">
          <View className={`w-10 h-10 rounded-xl border items-center justify-center ${tile}`}>
            <Icon name={icon} size={24} className={iconClassName} />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text font="rubik" className="text-[18px] text-on-surface font-bold shrink">
                {title}
              </Text>
              <View className={`px-2 py-0.5 rounded-full border max-w-[40%] ${badgeClassName}`}>
                <Text font="grotesk" className={`text-[10px] font-bold ${badgeTextClassName}`}>
                  {badge}
                </Text>
              </View>
            </View>
            <Text className="text-[11px] text-on-surface-variant">{sub}</Text>
          </View>
        </View>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          className="w-8 h-8 rounded-full bg-surface-container-high active:bg-surface-container-highest items-center justify-center"
        >
          <Icon name="close" size={20} className="text-on-surface-variant" />
        </Pressable>
      </View>

      <ScrollView
        className="shrink"
        contentContainerClassName="p-4 gap-4"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>

      <View className="p-3 bg-surface-container border-t border-border flex-row items-center gap-2">
        <Pressable
          onPress={() => router.back()}
          className="px-4 py-2.5 rounded-xl bg-surface-container-high active:bg-surface-container-highest"
        >
          <Text font="rubik" className="text-[13px] text-on-surface-variant font-bold">
            {t('tools.close')}
          </Text>
        </Pressable>
        <Pressable
          onPress={onShare}
          className="flex-1 py-2.5 px-4 rounded-xl bg-whatsapp active:bg-whatsapp-dark active:scale-95 flex-row items-center justify-center gap-2 shadow-lg"
        >
          <Icon name="share" size={18} className="text-emerald-dark" />
          <Text
            font="rubik"
            className="text-[13px] text-emerald-dark font-extrabold shrink text-center"
          >
            {shareLabel}
          </Text>
        </Pressable>
      </View>
    </Dialog>
  );
}
