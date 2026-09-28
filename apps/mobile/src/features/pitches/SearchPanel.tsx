import { dateInAmman, formatDateTime, nextDates } from '@nujoom/shared';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import type { Area } from '@/data/types';
import { sfx } from '@/design/sound';
import type { FormatFilter } from '@/features/pitches/logic';
import { useLocale } from '@/lib/locale';
import { Icon } from '@/ui/Icon';
import { SelectSheet } from '@/ui/SelectSheet';
import { Text } from '@/ui/Text';

/** Booking horizon (spec §6.5). */
const DAYS_AHEAD = 14;

type SearchPanelProps = {
  cityName: string;
  cityCode: string;
  areas: Area[];
  area: string;
  onArea: (slug: string) => void;
  date: string;
  onDate: (date: string) => void;
  format: FormatFilter;
  onFormat: (format: FormatFilter) => void;
  totalCount: number;
  mapOpen: boolean;
  onToggleMap: (() => void) | null;
};

/** The search card: area select, map toggle, 14-day date strip and format pills. */
export function SearchPanel(props: SearchPanelProps) {
  const { t, locale, pick } = useLocale();
  const [picking, setPicking] = useState(false);
  const today = dateInAmman(new Date());
  const dates = useMemo(() => nextDates(today, DAYS_AHEAD), [today]);

  const areaOptions = [
    { value: 'all', label: t('pitches.allAreas', { city: props.cityName }) },
    ...props.areas.map((a) => ({ value: a.slug, label: pick(a.name) })),
  ];
  const areaLabel = areaOptions.find((o) => o.value === props.area)?.label ?? areaOptions[0]!.label;

  const dayLabel = (d: string, i: number) =>
    i === 0
      ? t('pitches.today')
      : i === 1
        ? t('pitches.tomorrow')
        : formatDateTime(`${d}T12:00:00+03:00`, locale, { weekday: 'long' });
  const dateLabel = (d: string) =>
    formatDateTime(`${d}T12:00:00+03:00`, locale, { day: 'numeric', month: 'long' });

  const formats: { id: FormatFilter; label: string }[] = [
    { id: 'all', label: t('pitches.all', { count: props.totalCount }) },
    { id: '5', label: t('common.size', { n: 5 }) },
    { id: '6', label: t('common.size', { n: 6 }) },
    { id: '7', label: t('common.size', { n: 7 }) },
    { id: 'indoor', label: t('pitches.indoor') },
  ];

  return (
    <View className="gap-2 bg-surface-container rounded-xl p-3 shadow-md border border-border/60">
      <View className="flex-row items-center justify-between gap-2">
        <Pressable
          onPress={() => setPicking(true)}
          accessibilityRole="button"
          accessibilityLabel={t('pitches.chooseArea')}
          className="flex-row items-center gap-1.5 flex-1 bg-surface-container-low rounded-lg px-3 py-2 border border-border/40"
        >
          <Icon name="location_on" size={20} className="text-primary" />
          <View className="flex-1 min-w-0">
            <Text font="grotesk" className="text-[11px] leading-[13px] text-on-surface-variant">
              {t('pitches.areaLabel', { city: props.cityCode })}
            </Text>
            <View className="flex-row items-center gap-1">
              <Text
                font="rubik"
                className="text-[15px] text-on-surface font-bold shrink"
                numberOfLines={1}
              >
                {areaLabel}
              </Text>
              <Icon name="expand_more" size={18} className="text-on-surface-variant" />
            </View>
          </View>
        </Pressable>

        {props.onToggleMap ? (
          <Pressable
            onPress={() => {
              sfx.clipBeep();
              props.onToggleMap?.();
            }}
            className={`flex-row items-center gap-1.5 px-3 py-2.5 rounded-lg shadow-sm ${
              props.mapOpen
                ? 'bg-secondary-container'
                : 'bg-surface-container-high active:bg-surface-container-highest'
            }`}
          >
            <Icon name="map" size={20} className="text-secondary" />
            <Text
              font="grotesk"
              className={`text-[11px] font-bold ${
                props.mapOpen ? 'text-on-secondary-container' : 'text-on-surface'
              }`}
            >
              {props.mapOpen ? t('pitches.closeMap') : t('pitches.map')}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 py-1"
      >
        {dates.map((d, i) => {
          const selected = d === props.date;
          return (
            <Pressable
              key={d}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => {
                sfx.clipBeep();
                props.onDate(d);
              }}
              className={`min-w-[76px] items-center justify-center py-1.5 px-2 rounded-lg shadow-sm active:scale-95 ${
                selected
                  ? 'bg-primary-container'
                  : 'bg-surface-container-low active:bg-surface-container-high'
              }`}
            >
              <Text
                font="grotesk"
                className={`text-[10px] uppercase tracking-wider font-bold ${
                  selected ? 'text-on-primary opacity-90' : 'text-on-surface-variant'
                }`}
              >
                {dayLabel(d, i)}
              </Text>
              <Text
                font="grotesk"
                className={`text-[16px] font-bold ${selected ? 'text-on-primary' : 'text-on-surface-variant'}`}
              >
                {dateLabel(d)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-1.5 pt-1"
      >
        {formats.map((f) => {
          const selected = f.id === props.format;
          return (
            <Pressable
              key={f.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => props.onFormat(f.id)}
              className={`px-3 py-1 rounded-full shadow-sm ${
                selected
                  ? 'bg-secondary-container'
                  : 'bg-surface-container-low active:bg-surface-container-high'
              }`}
            >
              <Text
                font="grotesk"
                className={`text-[11px] font-bold ${
                  selected ? 'text-on-secondary-container' : 'text-on-surface-variant'
                }`}
              >
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <SelectSheet
        visible={picking}
        title={t('pitches.chooseArea')}
        options={areaOptions}
        value={props.area}
        onSelect={props.onArea}
        onClose={() => setPicking(false)}
      />
    </View>
  );
}
