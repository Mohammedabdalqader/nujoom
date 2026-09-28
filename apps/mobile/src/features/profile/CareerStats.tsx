import { formSummary } from '@nujoom/shared';
import { View } from 'react-native';

import type { Me } from '@/data/types';
import { useLocale } from '@/lib/locale';
import { Icon, type IconName } from '@/ui/Icon';
import { SectionHeader } from '@/ui/SectionHeader';
import { Text } from '@/ui/Text';

function Counter({
  label,
  icon,
  iconColor,
  value,
  valueColor,
  unit,
  filled,
}: {
  label: string;
  icon: IconName;
  iconColor: string;
  value: number;
  valueColor: string;
  unit: string;
  filled?: boolean;
}) {
  return (
    <View className="flex-1 rounded-xl bg-surface-container p-3.5 justify-between border border-border">
      <View className="flex-row items-center justify-between">
        <Text className="text-[12px] text-on-surface-variant font-medium">{label}</Text>
        <Icon name={icon} filled={filled} size={20} className={iconColor} />
      </View>
      <View className="mt-2 flex-row items-baseline gap-1.5">
        <Text font="grotesk" className={`text-[24px] leading-[28px] font-bold ${valueColor}`}>
          {value}
        </Text>
        <Text className="text-[12px] text-on-surface-variant">{unit}</Text>
      </View>
    </View>
  );
}

const FORM_STYLE = {
  W: 'bg-secondary-container text-on-secondary-container',
  D: 'bg-surface-container-highest text-on-surface',
  L: 'bg-error-container text-on-error-container',
} as const;

/** "إحصائيات المسيرة والهيبة": form rating with confidence, four counters and the last five. */
export function CareerStats({ me }: { me: Me }) {
  const { t } = useLocale();
  const level =
    me.formConfidence >= 80 ? 'levelHigh' : me.formConfidence >= 50 ? 'levelMedium' : 'levelLow';
  const summary = formSummary(me.lastFive);
  const up = me.formChange30d >= 0;

  return (
    <View className="gap-3">
      <SectionHeader
        icon="analytics"
        iconSize={22}
        title={t('profile.career.title')}
        trailing={
          <View className="px-2 py-0.5 rounded bg-surface-container-high">
            <Text font="grotesk" className="text-[11px] text-primary font-bold">
              {t('profile.career.season', { season: me.season })}
            </Text>
          </View>
        }
      />

      <View className="rounded-xl bg-surface-container p-3.5 flex-row items-center justify-between shadow-md border border-border">
        <View className="flex-row items-center gap-3.5 flex-1">
          <View className="w-16 h-16 rounded-xl bg-gradient-to-tr from-surface-container-lowest to-surface-container-high items-center justify-center border border-primary/20">
            <Text font="grotesk" className="text-[24px] leading-[26px] text-primary font-black">
              {me.form.toFixed(1)}
            </Text>
            <Text
              font="grotesk"
              className="text-[9px] text-on-surface-variant uppercase tracking-wider mt-1"
            >
              {t('profile.career.betaRating')}
            </Text>
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-1.5">
              <Text font="rubik" className="text-[18px] text-on-surface font-bold">
                {t('profile.career.hara')}
              </Text>
              <View className="w-2 h-2 rounded-full bg-secondary" />
            </View>
            <Text className="text-[12px] text-on-surface-variant mt-0.5">
              {t('profile.career.confidence', {
                level: t(`profile.career.${level}`),
                value: me.formConfidence,
                count: me.stats.matches,
              })}
            </Text>
          </View>
        </View>
        <View className="items-end">
          <View className="flex-row items-center gap-1">
            <Icon
              name={up ? 'trending_up' : 'arrow_drop_down'}
              size={18}
              className={up ? 'text-secondary' : 'text-error'}
            />
            <Text
              font="grotesk"
              className={`text-[16px] font-bold ${up ? 'text-secondary' : 'text-error'}`}
            >
              {`${up ? '+' : ''}${me.formChange30d.toFixed(1)}`}
            </Text>
          </View>
          <Text className="text-[11px] text-on-surface-variant">{t('profile.career.last30')}</Text>
        </View>
      </View>

      <View className="gap-2">
        <View className="flex-row gap-2">
          <Counter
            label={t('profile.career.matches')}
            icon="sports_soccer"
            iconColor="text-primary"
            value={me.stats.matches}
            valueColor="text-on-surface"
            unit={t('profile.career.matchesUnit')}
          />
          <Counter
            label={t('profile.career.goals')}
            icon="sports_score"
            iconColor="text-primary-container"
            value={me.stats.goals}
            valueColor="text-primary"
            unit={t('profile.career.goalsUnit')}
          />
        </View>
        <View className="flex-row gap-2">
          <Counter
            label={t('profile.career.assists')}
            icon="handshake"
            iconColor="text-secondary"
            value={me.stats.assists}
            valueColor="text-secondary"
            unit={t('profile.career.assistsUnit')}
          />
          <Counter
            label={t('profile.career.mvps')}
            icon="military_tech"
            filled
            iconColor="text-primary"
            value={me.stats.mvps}
            valueColor="text-primary"
            unit={t('profile.career.mvpsUnit')}
          />
        </View>
      </View>

      <View className="rounded-xl bg-surface-container p-3.5 gap-2 border border-border">
        <View className="flex-row items-center justify-between">
          <Text font="rubik" className="text-[18px] text-on-surface font-bold">
            {t('profile.form.title')}
          </Text>
          {me.lastFive.length ? (
            <Text className="text-[12px] text-secondary font-bold">
              {t('profile.form.summary', { w: summary.W, d: summary.D, l: summary.L })}
            </Text>
          ) : null}
        </View>
        {me.lastFive.length ? (
          <View className="flex-row items-center justify-between pt-1">
            {me.lastFive.map((r, i) => (
              <View key={i} className="items-center gap-1">
                {r.mvp ? (
                  <View
                    accessibilityLabel={t('profile.form.mvp')}
                    className="absolute -top-2 z-10 w-4 h-4 rounded-full bg-primary-container items-center justify-center shadow"
                  >
                    <Text className="text-[10px] leading-[12px] text-on-primary-container">★</Text>
                  </View>
                ) : null}
                <View
                  className={`w-10 h-10 rounded-lg items-center justify-center shadow-md ${FORM_STYLE[r.result]} ${
                    r.mvp ? 'shadow-[0_0_12px_rgba(0,165,114,0.4)]' : ''
                  }`}
                >
                  <Text
                    font="rubik"
                    className={`text-[18px] font-black ${FORM_STYLE[r.result].split(' ')[1]}`}
                  >
                    {r.result}
                  </Text>
                </View>
                <Text
                  font="grotesk"
                  className={`text-[10px] ${r.mvp ? 'text-primary font-bold' : 'text-on-surface-variant'}`}
                >
                  {`${r.scoreFor}-${r.scoreAgainst}`}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text className="text-[12px] text-on-surface-variant">{t('profile.form.empty')}</Text>
        )}
      </View>
    </View>
  );
}
