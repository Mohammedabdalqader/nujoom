import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { useCatalogCityCounts, useCatalogSearch, useMe } from '@/data/api';
import { catalogListState, type CatalogBadge } from '@/data/catalog';
import { CatalogCard } from '@/features/pitches/CatalogCard';
import { useLocale } from '@/lib/locale';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';

type BadgeFilter = 'all' | CatalogBadge;

/**
 * The pitch directory on the Pitches tab (docs/DESIGN.md G1, D-076): the player's city from
 * Nujoom's reviewed catalog, both badges, a badge filter, and empty states that say why a list
 * is empty (D-075). No live map or third-party search. Works the same on the demo's sample city.
 */
export function CatalogSection() {
  const { t, pick } = useLocale();
  const me = useMe().data;
  const [badge, setBadge] = useState<BadgeFilter>('all');
  const cityId = me?.cityId ?? undefined;
  const search = useCatalogSearch({ cityId, badge, limit: 50 });
  const counts = useCatalogCityCounts(cityId ?? 0);
  const items = search.data?.items ?? [];
  const city = me ? pick(me.city) : '';
  const state = catalogListState(counts.data, items.length, badge);

  const filters: { value: BadgeFilter; label: string }[] = [
    { value: 'all', label: t('catalog.filterAll') },
    { value: 'verified', label: t('catalog.filterVerified') },
    { value: 'not_verified', label: t('catalog.filterNotVerified') },
  ];

  return (
    <View className="gap-3">
      <View className="gap-1 pt-1">
        <View className="flex-row items-center gap-2">
          <Icon name="map" size={20} className="text-primary" />
          <Text font="rubik" className="text-[20px] text-on-surface font-extrabold tracking-tight">
            {t('catalog.title')}
          </Text>
        </View>
        <Text className="text-[12px] text-on-surface-variant">
          {t('catalog.subtitle', { city })}
        </Text>
      </View>

      <View className="flex-row flex-wrap gap-2" accessibilityRole="radiogroup">
        {filters.map((f) => (
          <Pressable
            key={f.value}
            onPress={() => setBadge(f.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: badge === f.value }}
            className={`min-h-[36px] px-3 rounded-full border justify-center ${badge === f.value ? 'bg-primary-container border-primary-container' : 'border-border-strong'}`}
          >
            <Text
              font="rubik"
              className={`text-[12px] font-bold ${badge === f.value ? 'text-on-primary' : 'text-on-surface'}`}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {search.isError ? (
        <View className="bg-surface-container-low rounded-xl p-5 items-center gap-3 border border-border/60">
          <Icon name="wifi_off" size={32} className="text-surface-bright" />
          <Text className="text-[14px] text-on-surface-variant text-center">
            {t('catalog.error')}
          </Text>
          <Pressable
            onPress={() => void search.refetch()}
            className="px-4 py-2 rounded-lg bg-surface-container-high active:bg-surface-container-highest"
          >
            <Text font="rubik" className="text-[13px] text-primary font-bold">
              {t('errors.retry')}
            </Text>
          </Pressable>
        </View>
      ) : search.isLoading ? null : state === 'results' ? (
        items.map((item) => <CatalogCard key={item.pitchId} item={item} />)
      ) : (
        <View className="bg-surface-container-low rounded-xl p-5 items-center gap-3 border border-border/60">
          <Icon name="stadium" size={36} className="text-surface-bright" />
          <Text className="text-[14px] text-on-surface-variant text-center">
            {state === 'none_in_city'
              ? t('catalog.noneInCity', { city })
              : state === 'none_verified'
                ? t('catalog.noneVerified', { city })
                : t('catalog.noMatch')}
          </Text>
          {state === 'none_in_city' ? null : (
            <Pressable
              onPress={() => setBadge('all')}
              className="px-4 py-2 rounded-lg bg-surface-container-high active:bg-surface-container-highest"
            >
              <Text font="rubik" className="text-[13px] text-primary font-bold">
                {t('catalog.showAll')}
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}
