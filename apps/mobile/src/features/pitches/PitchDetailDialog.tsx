import { errorKey } from '@nujoom/shared';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { useCatalogPitch, useFavoritePitches, useSetPitchFavorite } from '@/data/api';
import type { CatalogDetail, Localized } from '@/data/catalog';
import { BookingSection } from '@/features/pitches/BookingSection';
import { useLocale } from '@/lib/locale';
import { Dialog, DialogLoading } from '@/ui/Dialog';
import { Icon, type IconName } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { useToast } from '@/ui/Toast';

/** Codes to translation keys (keys ending in "_other" would read as plural forms). */
const key = (code: string) => code.replace(/_(\w)/g, (_, c: string) => c.toUpperCase());

/**
 * One field's page (docs/DESIGN.md G1 "Detail", D-077): name and badge first, access and how sure
 * the location is; rights-cleared photos with their credit; only evidenced facts, with unknown
 * amenities told apart from "checked, none"; the venue's other fields with their own badges;
 * where the facts came from and when they were last reviewed. A not-verified field says it can't
 * be booked in the app; directions (never a reservation) only for checked locations.
 */
export function PitchDetailDialog({ pitchId }: { pitchId: string }) {
  const { data, isLoading } = useCatalogPitch(pitchId);
  if (isLoading) return <DialogLoading />;
  return data ? <Detail item={data} /> : <Missing />;
}

function Header({ title, action }: { title: string; action?: ReactNode }) {
  const { t } = useLocale();
  const router = useRouter();
  return (
    <View className="flex-row items-center justify-between gap-3 border-b border-border pb-3">
      <Text font="rubik" className="flex-1 text-[18px] text-on-surface font-bold" numberOfLines={2}>
        {title}
      </Text>
      {action}
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel={t('common.close')}
        className="w-8 h-8 rounded-full bg-surface-container-high active:bg-surface-container-highest items-center justify-center"
      >
        <Icon name="close" size={18} className="text-on-surface" />
      </Pressable>
    </View>
  );
}

function Missing() {
  const { t } = useLocale();
  return (
    <Dialog>
      <Header title={t('catalog.title')} />
      <Text className="text-[14px] text-on-surface-variant text-center py-6">
        {t('catalog.detail.missing')}
      </Text>
    </Dialog>
  );
}

/**
 * The favourite heart (D-086/D-091): only verified fields can be added (spec §5), and a favourite
 * that lost its badge can still be removed. It shows the state it's being set to while the
 * server answers, then the server's list decides.
 */
function FavoriteButton({ pitchId, verified }: { pitchId: string; verified: boolean }) {
  const { t } = useLocale();
  const toast = useToast();
  const favorites = useFavoritePitches();
  const set = useSetPitchFavorite();
  const saved = favorites.data?.some((f) => f.pitchId === pitchId) ?? false;
  const on = set.isPending ? set.variables.favorite : saved;
  if (!favorites.isSuccess || (!verified && !saved)) return null;
  return (
    <Pressable
      onPress={() =>
        set.mutate(
          { pitchId, favorite: !on },
          {
            onSuccess: (now) =>
              toast.show(now ? t('catalog.favorite.added') : t('catalog.favorite.removed')),
            onError: (error) => toast.show(t(errorKey(error))),
          },
        )
      }
      disabled={set.isPending}
      accessibilityRole="button"
      accessibilityState={{ selected: on, busy: set.isPending }}
      accessibilityLabel={on ? t('catalog.favorite.remove') : t('catalog.favorite.add')}
      className="w-8 h-8 rounded-full bg-surface-container-high active:bg-surface-container-highest items-center justify-center"
    >
      <Icon
        name={on ? 'favorite' : 'favorite_border'}
        filled={on}
        size={18}
        className={on ? 'text-error' : 'text-on-surface'}
      />
    </Pressable>
  );
}

function Row({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <View className="flex-row items-start gap-2 py-1.5">
      <Icon name={icon} size={16} className="text-on-surface-variant mt-0.5" />
      <Text className="text-[12px] text-on-surface-variant w-28">{label}</Text>
      <Text className="flex-1 text-[13px] text-on-surface">{value}</Text>
    </View>
  );
}

function Detail({ item }: { item: CatalogDetail }) {
  const { t, locale, jod, pick, date } = useLocale();
  const router = useRouter();
  const name = (l: Localized | null) =>
    l ? ((locale === 'ar' ? (l.ar ?? l.en) : (l.en ?? l.ar)) ?? '') : '';
  const title = [name(item.facilityName), name(item.label)].filter(Boolean).join(' · ');
  const verified = item.badge === 'verified';
  const place = [
    item.neighborhood ? pick(item.neighborhood) : null,
    item.city ? pick(item.city) : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const directions =
    item.location && item.location.confidence !== 'approximate' ? item.location : null;
  const unknown = t('catalog.detail.unknown');
  const yesNo = (v: boolean | null, yes: string, no: string) =>
    v === null ? unknown : v ? yes : no;

  return (
    <Dialog scroll>
      <Header
        title={title}
        action={<FavoriteButton pitchId={item.pitchId} verified={verified} />}
      />

      <View className="gap-2">
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
            {verified ? t('catalog.badgeVerified') : t('catalog.badgeNotVerified')}
          </Text>
        </View>
        {place ? <Text className="text-[13px] text-on-surface-variant">{place}</Text> : null}
        {item.address ? (
          <Text className="text-[12px] text-on-surface-variant">{name(item.address)}</Text>
        ) : null}
      </View>

      {item.photos.length ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2"
        >
          {item.photos.map((photo) =>
            photo.url ? (
              <View key={photo.path} className="gap-1">
                <Image
                  source={{ uri: photo.url }}
                  style={{ width: 220, height: 140, borderRadius: 10 }}
                  contentFit="cover"
                  accessibilityLabel={title}
                />
                {photo.attribution ? (
                  <Text className="text-[10px] text-on-surface-variant w-[220px]">
                    {photo.attribution}
                  </Text>
                ) : null}
              </View>
            ) : null,
          )}
        </ScrollView>
      ) : null}

      {/* Booking truth: a price only from a verified field; otherwise say it plainly. */}
      <View className="bg-surface-container-low rounded-xl border border-border p-3 gap-1">
        {verified && item.operations ? (
          <>
            <Text font="grotesk" className="text-[15px] text-primary font-black">
              {t('catalog.perHour', { price: jod(item.operations.pricePerHour) })}
            </Text>
            <Text className="text-[12px] text-on-surface-variant">
              {t('catalog.detail.slotLength', { n: item.operations.slotMinutes })}
            </Text>
            {item.operations.bookable ? null : (
              <Text className="text-[12px] text-on-surface-variant">{t('catalog.paused')}</Text>
            )}
          </>
        ) : (
          <Text className="text-[13px] text-on-surface-variant">
            {t('catalog.detail.notBookableLong')}
          </Text>
        )}
      </View>

      {verified && item.operations?.bookable ? <BookingSection pitchId={item.pitchId} /> : null}

      <View>
        <Text font="rubik" className="text-[14px] text-on-surface font-bold mb-1">
          {t('catalog.detail.facts')}
        </Text>
        <Row
          icon="groups"
          label={t('catalog.detail.size')}
          value={item.playersPerSide ? t('catalog.size', { n: item.playersPerSide }) : unknown}
        />
        <Row
          icon="grass"
          label={t('catalog.detail.surface')}
          value={item.surface ? t(`catalog.surfaces.${key(item.surface)}`) : unknown}
        />
        <Row
          icon="apartment"
          label={t('catalog.detail.cover')}
          value={yesNo(item.indoor, t('catalog.indoor'), t('catalog.outdoor'))}
        />
        <Row
          icon="flare"
          label={t('catalog.detail.lights')}
          value={yesNo(item.lights, t('catalog.detail.yes'), t('catalog.detail.no'))}
        />
        <Row
          icon="sports_soccer"
          label={t('catalog.detail.futsal')}
          value={yesNo(item.futsal, t('catalog.detail.yes'), t('catalog.detail.no'))}
        />
        <Row
          icon="aspect_ratio"
          label={t('catalog.detail.dimensions')}
          value={
            item.dimensions?.lengthM && item.dimensions.widthM
              ? t('catalog.detail.metres', {
                  l: item.dimensions.lengthM,
                  w: item.dimensions.widthM,
                })
              : unknown
          }
        />
        <Row
          icon="checklist"
          label={t('catalog.detail.amenities')}
          value={
            item.amenities === null
              ? unknown
              : item.amenities.length === 0
                ? t('catalog.detail.noAmenities')
                : item.amenities.map((a) => t(`catalog.amenities.${key(a)}`)).join('، ')
          }
        />
      </View>

      <View className="gap-2">
        <Row
          icon="location_on"
          label={t('catalog.detail.location')}
          value={
            item.location === null
              ? t('catalog.locationUnconfirmed')
              : item.location.confidence === 'approximate'
                ? t('catalog.locationApprox')
                : t('catalog.detail.locationChecked')
          }
        />
        {directions ? (
          <Pressable
            onPress={() =>
              void Linking.openURL(
                `https://www.google.com/maps/dir/?api=1&destination=${directions.lat},${directions.lng}`,
              )
            }
            accessibilityRole="link"
            className="self-start flex-row items-center gap-1 px-3 py-2 rounded-lg bg-surface-container-high active:bg-surface-container-highest"
          >
            <Icon name="explore" size={16} className="text-primary" />
            <Text font="rubik" className="text-[13px] text-primary font-bold">
              {t('catalog.detail.directions')}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {item.siblings.length ? (
        <View className="gap-2">
          <Text font="rubik" className="text-[14px] text-on-surface font-bold">
            {t('catalog.detail.otherFields')}
          </Text>
          {item.siblings.map((s) => (
            <Pressable
              key={s.pitchId}
              onPress={() => router.replace({ pathname: '/pitch/[id]', params: { id: s.pitchId } })}
              accessibilityRole="button"
              className="flex-row items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 active:bg-surface-container-high"
            >
              <Text className="text-[13px] text-on-surface">
                {name(s.label) || t('catalog.detail.field')}
              </Text>
              <Text className="text-[11px] text-on-surface-variant">
                {s.badge === 'verified'
                  ? t('catalog.badgeVerified')
                  : t('catalog.badgeNotVerified')}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View className="gap-1 border-t border-border pt-3">
        {item.sources.length ? (
          <Text className="text-[11px] text-on-surface-variant">
            {t('catalog.detail.sources', {
              list: item.sources.map((s) => t(`catalog.sourceNames.${key(s)}`)).join('، '),
            })}
          </Text>
        ) : null}
        {item.lastReviewedAt ? (
          <Text className="text-[11px] text-on-surface-variant">
            {t('catalog.detail.reviewed', { date: date(item.lastReviewedAt) })}
          </Text>
        ) : null}
        {item.attribution ? (
          <Text className="text-[10px] text-on-surface-variant">{item.attribution}</Text>
        ) : null}
      </View>
    </Dialog>
  );
}
