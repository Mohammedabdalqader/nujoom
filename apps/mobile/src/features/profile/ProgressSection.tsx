import { bestScoringMonth, formatDateTime, goalsPerMatch, goalTrend } from '@nujoom/shared';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import type { MonthProgress } from '@/data/types';
import { sfx } from '@/design/sound';
import { useTheme } from '@/design/theme';
import { useLocale } from '@/lib/locale';
import { ProgressChart } from '@/ui/charts/ProgressChart';
import { Icon } from '@/ui/Icon';
import { RichText } from '@/ui/RichText';
import { SectionHeader } from '@/ui/SectionHeader';
import { Text } from '@/ui/Text';

type ChartView = 'xp' | 'goals' | 'combined';

function Tooltip({ children, border }: { children: React.ReactNode; border: string }) {
  return (
    <View className={`bg-surface-container p-3 rounded-xl border shadow-2xl min-w-44 ${border}`}>
      {children}
    </View>
  );
}

function TipRow({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass: string;
}) {
  return (
    <View className="flex-row items-center justify-between gap-4">
      <Text className="text-[11px] text-on-surface-variant">{label}</Text>
      <Text font="grotesk" className={`text-[14px] font-bold ${valueClass}`}>
        {value}
      </Text>
    </View>
  );
}

/** "تطور المستوى والأهداف عبر الزمن": XP and goals charts with the three quick metrics and an insight. */
export function ProgressSection({ months, xp }: { months: MonthProgress[]; xp: number }) {
  const { t, locale, number } = useLocale();
  const { color } = useTheme();
  const [view, setView] = useState<ChartView>('xp');

  const monthName = (m: string) =>
    formatDateTime(`${m}-15T12:00:00+03:00`, locale, { month: 'long' });
  const labels = months.map((m) => monthName(m.month));
  const last = months[months.length - 1];
  const prev = months[months.length - 2];
  const trend = goalTrend(months);
  const best = bestScoringMonth(months);
  const rising = (trend ?? 0) > 0;

  const insight =
    trend === null
      ? t('profile.charts.insightNone')
      : trend > 2
        ? t('profile.charts.insightUp', { value: trend })
        : trend < -2
          ? t('profile.charts.insightDown', { value: Math.abs(trend) })
          : t('profile.charts.insightFlat');

  const tabs: { id: ChartView; label: string; active: string }[] = [
    { id: 'xp', label: t('profile.charts.xpTab'), active: 'bg-secondary-container shadow-md' },
    { id: 'goals', label: t('profile.charts.goalsTab'), active: 'bg-primary-container shadow-md' },
    {
      id: 'combined',
      label: t('profile.charts.combinedTab'),
      active: 'bg-surface-bright shadow-md',
    },
  ];
  const tabText: Record<ChartView, string> = {
    xp: 'text-on-secondary-container',
    goals: 'text-on-primary',
    combined: 'text-primary',
  };

  return (
    <View className="gap-3">
      <SectionHeader
        icon="monitoring"
        iconClassName="text-secondary"
        iconSize={22}
        title={t('profile.charts.title')}
        trailing={
          <View className="px-2 py-0.5 rounded bg-surface-container-high">
            <Text font="grotesk" className="text-[11px] text-secondary font-bold">
              {rising ? t('profile.charts.rising') : t('profile.charts.steady')}
            </Text>
          </View>
        }
      />

      <View className="flex-row bg-surface-container p-1 rounded-xl border border-border">
        {tabs.map((tab) => {
          const active = tab.id === view;
          return (
            <Pressable
              key={tab.id}
              onPress={() => {
                sfx.clipBeep();
                setView(tab.id);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              className={`flex-1 py-1.5 px-2 rounded-lg items-center ${active ? tab.active : ''}`}
            >
              <Text
                font="rubik"
                className={`text-[13px] font-bold ${active ? tabText[tab.id] : 'text-on-surface-variant'}`}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="flex-row gap-2">
        <View className="flex-1 bg-surface-container p-2.5 rounded-xl border border-border items-center">
          <Text font="grotesk" className="text-[10px] text-on-surface-variant">
            {t('profile.charts.currentXp')}
          </Text>
          <Text font="grotesk" className="text-[18px] text-secondary font-black">
            {number(xp)}
          </Text>
          {last && prev ? (
            <Text className="text-[10px] text-secondary font-bold">
              {t('profile.charts.xpThisMonth', { value: `+${number(last.xp - prev.xp)}` })}
            </Text>
          ) : null}
        </View>
        <View className="flex-1 bg-surface-container p-2.5 rounded-xl border border-border items-center">
          <Text font="grotesk" className="text-[10px] text-on-surface-variant">
            {t('profile.charts.goalRate')}
          </Text>
          <Text font="grotesk" className="text-[18px] text-primary font-black">
            {goalsPerMatch(months).toFixed(2)}
          </Text>
          <Text className="text-[10px] text-on-surface-variant">
            {t('profile.charts.perMatch')}
          </Text>
        </View>
        <View className="flex-1 bg-surface-container p-2.5 rounded-xl border border-border items-center">
          <Text font="grotesk" className="text-[10px] text-on-surface-variant">
            {t('profile.charts.bestMonth')}
          </Text>
          <Text font="grotesk" className="text-[18px] text-on-surface font-black">
            {best?.goals ?? 0}
          </Text>
          {best ? (
            <Text className="text-[10px] text-primary">
              {best === last
                ? t('profile.charts.current', { month: monthName(best.month) })
                : monthName(best.month)}
            </Text>
          ) : null}
        </View>
      </View>

      <View className="bg-surface-container p-4 rounded-xl border border-border shadow-xl overflow-hidden">
        <View className="flex-row items-center justify-between mb-3 gap-2">
          <View className="flex-1">
            <Text font="rubik" className="text-[15px] font-bold text-on-surface">
              {t(
                view === 'xp'
                  ? 'profile.charts.xpTitle'
                  : view === 'goals'
                    ? 'profile.charts.goalsTitle'
                    : 'profile.charts.combinedTitle',
              )}
            </Text>
            <Text className="text-[11px] text-on-surface-variant">
              {t('profile.charts.source', { count: months.length })}
            </Text>
          </View>
          {view === 'xp' ? (
            <View className="flex-row items-center gap-1.5">
              <View className="w-2.5 h-2.5 rounded-full bg-secondary" />
              <Text font="grotesk" className="text-[11px] text-secondary">
                XP
              </Text>
            </View>
          ) : view === 'goals' ? (
            <View className="flex-row items-center gap-2">
              <View className="flex-row items-center gap-1">
                <View className="w-2.5 h-2.5 rounded-sm bg-primary" />
                <Text font="grotesk" className="text-[11px] text-primary">
                  {t('profile.charts.legendGoals')}
                </Text>
              </View>
              <View className="flex-row items-center gap-1">
                <View className="w-2.5 h-2.5 rounded-sm bg-secondary" />
                <Text font="grotesk" className="text-[11px] text-secondary">
                  {t('profile.charts.legendAssists')}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        <ProgressChart
          key={view}
          emptyLabel={t('profile.charts.empty')}
          kind={view === 'goals' ? 'bars' : 'area'}
          labels={labels}
          series={
            view === 'xp'
              ? [{ key: 'xp', values: months.map((m) => m.xp), color: color('secondary') }]
              : view === 'goals'
                ? [
                    { key: 'goals', values: months.map((m) => m.goals), color: color('primary') },
                    {
                      key: 'assists',
                      values: months.map((m) => m.assists),
                      color: color('secondary'),
                    },
                  ]
                : [{ key: 'goals', values: months.map((m) => m.goals), color: color('primary') }]
          }
          renderTooltip={(i) => {
            const m = months[i]!;
            return (
              <Tooltip border={view === 'xp' ? 'border-secondary/40' : 'border-primary/40'}>
                <Text font="rubik" className="text-[13px] font-bold text-on-surface mb-1">
                  {t('profile.charts.tipMonth', { month: monthName(m.month) })}
                </Text>
                {view !== 'goals' ? (
                  <TipRow
                    label={t('profile.charts.tipXp')}
                    value={number(m.xp)}
                    valueClass="text-secondary"
                  />
                ) : null}
                {view !== 'xp' ? (
                  <TipRow
                    label={t('profile.charts.tipGoals')}
                    value={t('profile.charts.tipGoalsValue', { count: m.goals })}
                    valueClass="text-primary"
                  />
                ) : null}
                {view === 'goals' ? (
                  <TipRow
                    label={t('profile.charts.tipAssists')}
                    value={t('profile.charts.tipAssistsValue', { count: m.assists })}
                    valueClass="text-secondary"
                  />
                ) : null}
                <TipRow
                  label={t('profile.charts.tipMatches')}
                  value={t('profile.charts.tipMatchesValue', { count: m.matches })}
                  valueClass="text-on-surface"
                />
              </Tooltip>
            );
          }}
        />

        <View className="mt-3 pt-2.5 border-t border-border flex-row items-center gap-2">
          <Icon name="insights" size={18} className="text-secondary" />
          <RichText
            className="text-[11px] leading-[18px] text-on-surface-variant flex-1"
            boldClassName="text-secondary font-bold"
          >
            {insight}
          </RichText>
        </View>
      </View>
    </View>
  );
}
