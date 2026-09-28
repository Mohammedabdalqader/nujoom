import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { useProfileExtras } from '@/data/api';
import { useLocale } from '@/lib/locale';
import { Dialog } from '@/ui/Dialog';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';

/** "سجل معاملات محفظة نجوم": every stars award, newest first (stars are only earned, D-006.1). */
export function WalletHistoryDialog() {
  const { t, number, ago } = useLocale();
  const router = useRouter();
  const wallet = useProfileExtras().data?.wallet;

  return (
    <Dialog className="bg-surface-container border border-primary/40 p-4 gap-3 max-h-[85%]">
      <View className="flex-row items-center justify-between border-b border-border pb-3">
        <View className="flex-row items-center gap-2">
          <Icon name="receipt_long" size={22} className="text-primary" />
          <Text font="rubik" className="text-[18px] text-on-surface font-bold">
            {t('profile.wallet.historyTitle')}
          </Text>
        </View>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          className="w-8 h-8 rounded-full bg-surface-container-high items-center justify-center"
        >
          <Icon name="close" size={18} className="text-on-surface" />
        </Pressable>
      </View>

      <View className="bg-surface-container-low p-3 rounded-xl border border-border flex-row items-center justify-between">
        <Text className="text-[12px] text-on-surface-variant">{t('profile.wallet.available')}</Text>
        <Text font="grotesk" className="text-[18px] text-primary font-black">
          {`${number(wallet?.balance ?? 0)} ⭐`}
        </Text>
      </View>

      <ScrollView
        className="shrink"
        contentContainerClassName="gap-2 py-1"
        showsVerticalScrollIndicator={false}
      >
        {wallet?.transactions.length ? (
          wallet.transactions.map((tx) => (
            <View
              key={tx.id}
              className="p-2.5 rounded-xl bg-surface-container-low border border-border flex-row items-center justify-between gap-2"
            >
              <View className="flex-row items-center gap-2.5 flex-1 min-w-0">
                <View className="w-8 h-8 rounded-lg bg-secondary-container/20 items-center justify-center">
                  <Text className="text-sm">⭐</Text>
                </View>
                <View className="flex-1 min-w-0">
                  <Text
                    font="rubik"
                    className="text-[13px] text-on-surface font-bold"
                    numberOfLines={1}
                  >
                    {t(`profile.wallet.reason.${tx.reason}`, { context: tx.context ?? '' })}
                  </Text>
                  <Text font="grotesk" className="text-[10px] text-on-surface-variant">
                    {ago(tx.at)}
                  </Text>
                </View>
              </View>
              <View className="items-end">
                <Text font="grotesk" className="text-[14px] font-black text-secondary">
                  {`+${tx.amount} ⭐`}
                </Text>
                <Text className="text-[10px] text-on-surface-variant">
                  {t('profile.wallet.earned')}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text className="text-[12px] text-on-surface-variant text-center py-4">
            {t('profile.wallet.empty')}
          </Text>
        )}
      </ScrollView>

      <Pressable
        onPress={() => router.back()}
        className="w-full py-2.5 rounded-xl bg-surface-container-high active:bg-surface-container-highest items-center"
      >
        <Text font="rubik" className="text-[14px] text-on-surface font-bold">
          {t('profile.wallet.closeHistory')}
        </Text>
      </Pressable>
    </Dialog>
  );
}
