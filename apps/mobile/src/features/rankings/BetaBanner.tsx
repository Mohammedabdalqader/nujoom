import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { useConfig } from '@/data/config';
import { sfx } from '@/design/sound';
import { useLocale } from '@/lib/locale';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';

/**
 * "تصنيف نجوم الحارة BETA" with the formula explainer. The tiles show the live rating settings
 * (K-factor, MVP bonus, trust weights) rather than marketing numbers.
 */
export function BetaBanner() {
  const { t } = useLocale();
  const config = useConfig();
  const [open, setOpen] = useState(false);
  const weights = Object.values(config.trust_weights);

  return (
    <View className="overflow-hidden rounded-xl bg-surface-container-high p-3.5 shadow-md border border-primary/20">
      <View className="absolute -top-12 -end-12 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
      <View className="flex-row items-start justify-between gap-2">
        <View className="flex-row items-start gap-3 flex-1">
          <View className="w-10 h-10 rounded-lg bg-surface-container-highest items-center justify-center shadow-sm">
            <Icon name="verified" size={24} className="text-primary" />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-1.5">
              <Text font="rubik" className="text-[18px] text-on-surface font-bold">
                {t('rankings.title')}
              </Text>
              <View className="px-2 py-0.5 rounded-full bg-primary">
                <Text font="grotesk" className="text-[11px] text-on-primary font-bold">
                  {t('rankings.beta')}
                </Text>
              </View>
            </View>
            <Text className="text-[12px] leading-[19px] text-on-surface-variant mt-0.5">
              {t('rankings.intro')}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => {
            sfx.clipBeep();
            setOpen((v) => !v);
          }}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={t('rankings.explain')}
          className="p-1"
        >
          <Icon
            name="info"
            size={20}
            className={open ? 'text-primary' : 'text-on-surface-variant'}
          />
        </Pressable>
      </View>

      {open ? (
        <View className="mt-3 bg-surface-container rounded-lg p-2.5 border border-surface-container-highest">
          <View className="flex-row items-center justify-between">
            <Text className="text-[12px] text-on-surface-variant">{t('rankings.formula')}</Text>
            <Text font="grotesk" className="text-[11px] text-secondary font-bold">
              {t('rankings.qualify', { count: config.ranking.min_counted_matches })}
            </Text>
          </View>
          <View className="flex-row gap-1.5 mt-2">
            {[
              {
                label: t('rankings.resultTile'),
                value: t('rankings.resultValue', { k: config.rating.k_factor }),
                color: 'text-primary',
              },
              {
                label: t('rankings.mvpTile'),
                value: t('rankings.mvpValue', { bonus: config.rating.mvp_max_bonus }),
                color: 'text-secondary',
              },
              {
                label: t('rankings.trustTile'),
                value: t('rankings.trustValue', {
                  min: Math.min(...weights),
                  max: Math.max(...weights),
                }),
                color: 'text-on-surface',
              },
            ].map((tile) => (
              <View
                key={tile.label}
                className="flex-1 bg-surface-container-highest p-1.5 rounded items-center"
              >
                <Text font="grotesk" className="text-[11px] text-on-surface-variant text-center">
                  {tile.label}
                </Text>
                <Text font="grotesk" className={`text-[16px] font-bold ${tile.color}`}>
                  {tile.value}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}
