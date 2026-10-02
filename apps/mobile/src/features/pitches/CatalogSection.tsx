import { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { useCatalogCityCounts, useCatalogSearch, useFavoritePitches, useMe } from '@/data/api';
import { catalogListState, type CatalogBadge, type CatalogListing } from '@/data/catalog';
import { useTheme } from '@/design/theme';
import { CatalogCard } from '@/features/pitches/CatalogCard';
import { mergeCatalogPages } from '@/features/pitches/catalogPagination';
import { filterSavedCatalog } from '@/features/pitches/catalogSaved';
import { useLocale } from '@/lib/locale';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';

type BadgeFilter = 'all' | CatalogBadge;

/**
 * The pitch directory on the Pitches tab (docs/DESIGN.md G1, D-076): the player's city from
 * Nujoom's reviewed catalog, both badges, a badge filter, and empty states that say why a list
 * is empty (D-075). No live map or third-party search. Works the same on the demo's sample city.
 */
export function CatalogSection({
  saved,
  onSavedChange,
}: {
  saved: boolean;
  onSavedChange: (saved: boolean) => void;
}) {
  const { t, pick } = useLocale();
  const { color } = useTheme();
  const me = useMe().data;
  const [badge, setBadge] = useState<BadgeFilter>('all');
  const [query, setQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [size, setSize] = useState<number | null>(null);
  const [pagination, setPagination] = useState<{
    key: string;
    cursor: number;
    items: CatalogListing[];
  }>({ key: '', cursor: 0, items: [] });
  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);
  const cityId = me?.cityId ?? undefined;
  const searchKey = JSON.stringify([cityId, badge, searchTerm, size]);
  const cursor = pagination.key === searchKey ? pagination.cursor : 0;
  const search = useCatalogSearch({
    cityId,
    badge,
    q: searchTerm || undefined,
    playersPerSide: size === null ? undefined : [size],
    limit: 50,
    cursor,
  });
  const counts = useCatalogCityCounts(cityId);
  const favorites = useFavoritePitches();
  const savedItems = filterSavedCatalog(favorites.data ?? [], searchTerm, size);
  const items =
    cursor === 0
      ? (search.data?.items ?? [])
      : mergeCatalogPages(pagination.items, search.data?.items ?? [], cursor);
  const city = me ? pick(me.city) : '';
  const state =
    cityId === undefined
      ? items.length
        ? 'results'
        : 'no_match'
      : catalogListState(counts.data, items.length, badge);
  const clearFilters = () => {
    setPagination({ key: '', cursor: 0, items: [] });
    setBadge('all');
    setSize(null);
    setQuery('');
    setSearchTerm('');
  };
  const showDirectory = () => {
    clearFilters();
    onSavedChange(false);
  };

  const filters: { value: BadgeFilter; label: string }[] = [
    { value: 'all', label: t('catalog.filterAll') },
    { value: 'verified', label: t('catalog.filterVerified') },
    { value: 'not_verified', label: t('catalog.filterNotVerified') },
  ];

  return (
    <View className="gap-3">
      <View className="gap-1 pt-1">
        <View className="flex-row items-center gap-2">
          <Icon name={saved ? 'favorite' : 'map'} size={20} className="text-primary" />
          <Text font="rubik" className="text-[20px] text-on-surface font-extrabold tracking-tight">
            {saved ? t('catalog.savedTitle') : t('catalog.title')}
          </Text>
        </View>
        <Text className="text-[12px] text-on-surface-variant">
          {saved
            ? t('catalog.savedSubtitle')
            : cityId === undefined
              ? t('catalog.subtitleAll')
              : t('catalog.subtitle', { city })}
        </Text>
      </View>

      <View
        className="flex-row gap-1 p-1 rounded-lg bg-surface-container-low"
        accessibilityRole="radiogroup"
      >
        {([false, true] as const).map((isSaved) => (
          <Pressable
            key={String(isSaved)}
            onPress={() => onSavedChange(isSaved)}
            accessibilityRole="radio"
            accessibilityState={{ checked: saved === isSaved }}
            className={`flex-1 min-h-[44px] rounded-md items-center justify-center ${saved === isSaved ? 'bg-primary-container' : ''}`}
          >
            <Text
              font="rubik"
              className={`text-[13px] font-bold ${saved === isSaved ? 'text-on-primary' : 'text-on-surface-variant'}`}
            >
              {isSaved ? t('catalog.filterSaved') : t('catalog.viewDirectory')}
            </Text>
          </Pressable>
        ))}
      </View>

      <View className="flex-row items-center gap-2 min-h-[48px] px-3 border border-border-strong rounded-lg bg-surface-container">
        <Icon name="search" size={20} className="text-on-surface-variant" />
        <TextInput
          value={query}
          onChangeText={(value) => {
            setPagination({ key: '', cursor: 0, items: [] });
            setQuery(value);
          }}
          placeholder={saved ? t('catalog.savedSearchPlaceholder') : t('catalog.searchPlaceholder')}
          placeholderTextColor={color('muted')}
          accessibilityLabel={saved ? t('catalog.savedSearchLabel') : t('catalog.searchLabel')}
          autoCapitalize="none"
          returnKeyType="search"
          className="flex-1 min-w-0 text-[16px] text-on-surface"
        />
        {query ? (
          <Pressable
            onPress={() => {
              setPagination({ key: '', cursor: 0, items: [] });
              setQuery('');
              setSearchTerm('');
            }}
            accessibilityRole="button"
            accessibilityLabel={t('catalog.clearSearch')}
            className="min-w-[44px] min-h-[44px] items-center justify-center"
          >
            <Icon name="close" size={20} className="text-on-surface" />
          </Pressable>
        ) : null}
      </View>

      <View className="flex-row flex-wrap gap-2" accessibilityRole="radiogroup">
        {[null, 5, 6, 7, 11].map((n) => (
          <Pressable
            key={n ?? 'any'}
            onPress={() => {
              setPagination({ key: '', cursor: 0, items: [] });
              setSize(n);
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: size === n }}
            className={`min-h-[44px] px-3 rounded-lg border justify-center ${size === n ? 'bg-secondary-container border-secondary-container' : 'border-border-strong'}`}
          >
            <Text
              font="rubik"
              className={`text-[13px] font-bold ${size === n ? 'text-on-secondary-container' : 'text-on-surface'}`}
            >
              {n === null ? t('catalog.anySize') : t('catalog.size', { n })}
            </Text>
          </Pressable>
        ))}
      </View>

      {!saved ? (
        <View className="flex-row flex-wrap gap-2" accessibilityRole="radiogroup">
          {filters.map((f) => (
            <Pressable
              key={f.value}
              onPress={() => {
                setPagination({ key: '', cursor: 0, items: [] });
                setBadge(f.value);
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: badge === f.value }}
              className={`min-h-[44px] px-3 rounded-full border justify-center ${badge === f.value ? 'bg-primary-container border-primary-container' : 'border-border-strong'}`}
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
      ) : null}

      {saved && favorites.isError ? (
        <View className="bg-surface-container-low rounded-xl p-5 items-center gap-3 border border-border/60">
          <Icon name="wifi_off" size={32} className="text-surface-bright" />
          <Text className="text-[14px] text-on-surface-variant text-center">
            {t('catalog.savedError')}
          </Text>
          <Pressable
            onPress={() => void favorites.refetch()}
            accessibilityRole="button"
            className="min-h-[44px] px-4 justify-center rounded-lg bg-surface-container-high active:bg-surface-container-highest"
          >
            <Text font="rubik" className="text-[13px] text-primary font-bold">
              {t('errors.retry')}
            </Text>
          </Pressable>
        </View>
      ) : saved && favorites.isLoading ? (
        <Text accessibilityRole="alert" className="text-[14px] text-on-surface-variant py-4">
          {t('catalog.savedLoading')}
        </Text>
      ) : saved && savedItems.length ? (
        savedItems.map((item) => <CatalogCard key={item.pitchId} item={item} />)
      ) : saved ? (
        <View className="bg-surface-container-low rounded-xl p-5 items-center gap-3 border border-border/60">
          <Icon name="favorite_border" size={36} className="text-surface-bright" />
          <Text className="text-[14px] text-on-surface-variant text-center">
            {favorites.data?.length ? t('catalog.noMatch') : t('catalog.savedEmpty')}
          </Text>
          <Pressable
            onPress={showDirectory}
            accessibilityRole="button"
            className="min-h-[44px] px-4 justify-center rounded-lg bg-surface-container-high active:bg-surface-container-highest"
          >
            <Text font="rubik" className="text-[13px] text-primary font-bold">
              {t('catalog.showAll')}
            </Text>
          </Pressable>
        </View>
      ) : (search.isError && cursor === 0) || counts.isError ? (
        <View className="bg-surface-container-low rounded-xl p-5 items-center gap-3 border border-border/60">
          <Icon name="wifi_off" size={32} className="text-surface-bright" />
          <Text className="text-[14px] text-on-surface-variant text-center">
            {t('catalog.error')}
          </Text>
          <Pressable
            onPress={() => {
              void search.refetch();
              if (cityId !== undefined) void counts.refetch();
            }}
            accessibilityRole="button"
            className="min-h-[44px] px-4 justify-center rounded-lg bg-surface-container-high active:bg-surface-container-highest"
          >
            <Text font="rubik" className="text-[13px] text-primary font-bold">
              {t('errors.retry')}
            </Text>
          </Pressable>
        </View>
      ) : (search.isLoading && cursor === 0) || counts.isLoading ? (
        <Text accessibilityRole="alert" className="text-[14px] text-on-surface-variant py-4">
          {t('catalog.loading')}
        </Text>
      ) : state === 'results' ? (
        <>
          {items.map((item) => (
            <CatalogCard key={item.pitchId} item={item} />
          ))}
          {cursor > 0 && search.isError ? (
            <Pressable
              onPress={() => void search.refetch()}
              accessibilityRole="button"
              className="min-h-[44px] px-4 justify-center rounded-lg bg-surface-container-high"
            >
              <Text font="rubik" className="text-[13px] text-primary font-bold text-center">
                {t('catalog.moreFailed')}
              </Text>
            </Pressable>
          ) : cursor > 0 && search.isLoading ? (
            <Text accessibilityRole="alert" className="text-[14px] text-on-surface-variant py-4">
              {t('catalog.loading')}
            </Text>
          ) : search.data?.nextCursor != null ? (
            <Pressable
              onPress={() =>
                setPagination({ key: searchKey, cursor: search.data!.nextCursor!, items })
              }
              accessibilityRole="button"
              className="min-h-[44px] px-4 justify-center rounded-lg bg-surface-container-high"
            >
              <Text font="rubik" className="text-[13px] text-primary font-bold text-center">
                {t('catalog.loadMore')}
              </Text>
            </Pressable>
          ) : null}
        </>
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
              onPress={clearFilters}
              accessibilityRole="button"
              className="min-h-[44px] px-4 justify-center rounded-lg bg-surface-container-high active:bg-surface-container-highest"
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
