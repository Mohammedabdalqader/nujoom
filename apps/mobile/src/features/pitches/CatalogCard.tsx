import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import type { CatalogListing, Localized } from '@/data/catalog';
import { useLocale } from '@/lib/locale';
import { Icon, type IconName } from '@/ui/Icon';
import { Text } from '@/ui/Text';

/**
 * One field in the pitch directory (docs/DESIGN.md G1 "Result card", D-076). The field is the
 * unit; the badge is text plus icon (never colour alone); only evidenced facts show, unknown ones
 * are left out; a price only comes from a verified field's confirmed operations. No Book button
 * here: tapping opens the field's page (D-077).
 */
export function CatalogCard({ item }: { item: CatalogListing }) {
  const { t, locale, jod, pick } = useLocale();
  const router = useRouter();
  const name = (l: Localized | null) =>
    l ? ((locale === 'ar' ? (l.ar ?? l.en) : (l.en ?? l.ar)) ?? '') : '';
  const verified = item.badge === 'verified';
  const place = [
    item.neighborhood ? pick(item.neighborhood) : null,
    item.city ? pick(item.city) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const facts: { icon: IconName; text: string }[] = [];
  if (item.playersPerSide)
    facts.push({ icon: 'groups', text: t('catalog.size', { n: item.playersPerSide }) });
  if (item.surface)
    facts.push({ icon: 'grass', text: t(`catalog.surfaces.${surfaceKey(item.surface)}`) });
  if (item.indoor !== null) {
    facts.push({
      icon: 'apartment',
      text: item.indoor ? t('catalog.indoor') : t('catalog.outdoor'),
    });
  }
  if (item.lights) facts.push({ icon: 'flare', text: t('catalog.lights') });

  const location =
    item.location === null
      ? t('catalog.locationUnconfirmed')
      : item.location.confidence === 'approximate'
        ? t('catalog.locationApprox')
        : null;
  const badge = verified ? t('catalog.badgeVerified') : t('catalog.badgeNotVerified');
  const bookingNote = !verified
    ? t('catalog.notBookable')
    : item.operations && !item.operations.bookable
      ? t('catalog.paused')
      : null;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/pitch/[id]', params: { id: item.pitchId } })}
      accessibilityRole="button"
      accessibilityLabel={[name(item.facilityName), name(item.label), badge, location, bookingNote]
        .filter(Boolean)
        .join('، ')}
      className="bg-surface-container rounded-xl border border-border p-3 gap-2 active:bg-surface-container-high"
    >
      <View className="flex-row gap-3">
        {item.photo?.url ? (
          <Image
            source={{ uri: item.photo.url }}
            style={{ width: 72, height: 60, borderRadius: 8 }}
            contentFit="cover"
          />
        ) : (
          <View className="w-[72px] h-[60px] rounded-lg bg-surface-container-high items-center justify-center">
            <Icon name="stadium" size={28} className="text-surface-bright" />
          </View>
        )}
        <View className="flex-1 min-w-0 gap-0.5">
          <Text font="rubik" className="text-[15px] text-on-surface font-bold" numberOfLines={1}>
            {name(item.facilityName)}
            {item.label ? (
              <Text className="text-on-surface-variant">{` · ${name(item.label)}`}</Text>
            ) : null}
          </Text>
          {place ? (
            <Text className="text-[12px] text-on-surface-variant" numberOfLines={1}>
              {place}
            </Text>
          ) : null}
          <View
            className={`self-start flex-row items-center gap-1 px-2 py-0.5 rounded-full border ${verified ? 'border-secondary/60' : 'border-border-strong'}`}
          >
            <Icon
              name={verified ? 'verified' : 'help'}
              size={14}
              className={verified ? 'text-secondary' : 'text-on-surface-variant'}
            />
            <Text
              font="grotesk"
              className={`text-[11px] ${verified ? 'text-secondary' : 'text-on-surface-variant'}`}
            >
              {badge}
            </Text>
          </View>
        </View>
      </View>

      {facts.length ? (
        <View className="flex-row flex-wrap gap-x-3 gap-y-1">
          {facts.map((f) => (
            <View key={f.text} className="flex-row items-center gap-1">
              <Icon name={f.icon} size={14} className="text-on-surface-variant" />
              <Text className="text-[12px] text-on-surface">{f.text}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View className="flex-row flex-wrap items-center justify-between gap-2">
        {verified && item.operations ? (
          <Text font="grotesk" className="text-[13px] text-primary font-black">
            {t('catalog.perHour', { price: jod(item.operations.pricePerHour) })}
          </Text>
        ) : null}
        {bookingNote ? (
          <Text className="text-[12px] text-on-surface-variant">{bookingNote}</Text>
        ) : null}
        {location ? (
          <View className="flex-row items-center gap-1">
            <Icon name="location_on" size={14} className="text-on-surface-variant" />
            <Text className="text-[11px] text-on-surface-variant">{location}</Text>
          </View>
        ) : null}
      </View>
      {item.photo?.attribution ? (
        <Text className="text-[10px] text-on-surface-variant">{item.photo.attribution}</Text>
      ) : null}
    </Pressable>
  );
}

/** Surface codes to translation keys (camelCase: "…_other"-style keys read as plurals). */
function surfaceKey(surface: NonNullable<CatalogListing['surface']>): string {
  return surface.replace(/_(\w)/g, (_, c: string) => c.toUpperCase());
}
