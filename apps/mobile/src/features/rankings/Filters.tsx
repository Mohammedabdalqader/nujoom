import { Pressable, ScrollView, View } from 'react-native';

import type { AgeBand, RankPeriod, RankScope } from '@/data/types';
import { sfx } from '@/design/sound';
import { useLocale } from '@/lib/locale';
import { Icon, type IconName } from '@/ui/Icon';
import { Text } from '@/ui/Text';

type FiltersProps = {
  names: { hara: string; city: string; country: string };
  scope: RankScope;
  onScope: (s: RankScope) => void;
  age: AgeBand;
  onAge: (a: AgeBand) => void;
  period: RankPeriod;
  onPeriod: (p: RankPeriod) => void;
};

function Segmented<T extends string>({
  items,
  value,
  onChange,
  activeClass,
}: {
  items: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  activeClass: string;
}) {
  return (
    <View className="flex-row p-0.5 rounded-lg bg-surface-container-low border border-border">
      {items.map((item) => {
        const active = item.id === value;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => {
              sfx.clipBeep();
              onChange(item.id);
            }}
            className={`px-2.5 py-1 rounded-md ${active ? activeClass : ''}`}
          >
            <Text
              className={`text-[12px] ${active ? (activeClass.includes('bright') ? 'text-on-surface font-bold' : 'text-primary font-semibold') : 'text-on-surface-variant'}`}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Scope chips (my hara / city / country), age groups and period (spec §6.10). */
export function Filters(props: FiltersProps) {
  const { t } = useLocale();
  const scopes: { id: RankScope; icon: IconName; filled?: boolean; label: string }[] = [
    { id: 'hara', icon: 'location_on', label: t('rankings.scopeHara', { name: props.names.hara }) },
    {
      id: 'city',
      icon: 'apartment',
      filled: true,
      label: t('rankings.scopeCity', { name: props.names.city }),
    },
    {
      id: 'country',
      icon: 'flag',
      label: t('rankings.scopeCountry', { name: props.names.country }),
    },
  ];

  return (
    <View className="gap-2">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-1.5 pb-1"
      >
        {scopes.map((s) => {
          const active = s.id === props.scope;
          return (
            <Pressable
              key={s.id}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => {
                sfx.clipBeep();
                props.onScope(s.id);
              }}
              className={`px-3.5 py-1.5 rounded-full flex-row items-center gap-1.5 ${
                active
                  ? 'bg-primary shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                  : 'bg-surface-container-high active:bg-surface-bright'
              }`}
            >
              <Icon
                name={s.icon}
                filled={active && s.filled}
                size={18}
                className={active ? 'text-on-primary' : 'text-on-surface-variant'}
              />
              <Text
                font="rubik"
                className={`text-[15px] ${active ? 'text-on-primary font-bold' : 'text-on-surface-variant'}`}
              >
                {s.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View className="flex-row items-center justify-between gap-2 flex-wrap">
        <Segmented<AgeBand>
          items={[
            { id: 'ADULT', label: t('rankings.ageAdults') },
            { id: 'U18', label: t('rankings.ageU18') },
            // 'Under 16' covers ages 13–15: U14 holds only 13-year-olds (min age 13), D-022.
            { id: 'U16', label: t('rankings.ageU16') },
          ]}
          value={props.age}
          onChange={props.onAge}
          activeClass="bg-surface-container-high"
        />
        <Segmented<RankPeriod>
          items={[
            { id: 'week', label: t('rankings.week') },
            { id: 'month', label: t('rankings.month') },
            { id: 'season', label: t('rankings.season') },
          ]}
          value={props.period}
          onChange={props.onPeriod}
          activeClass="bg-surface-bright shadow-sm"
        />
      </View>
    </View>
  );
}
