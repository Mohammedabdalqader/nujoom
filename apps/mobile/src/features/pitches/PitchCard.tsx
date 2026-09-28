import { dateInAmman } from '@nujoom/shared';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { keys, useCache } from '@/data/api';
import type { Pitch } from '@/data/types';
import { sfx } from '@/design/sound';
import { cardSlots, pitchBadge, type DaySlot } from '@/features/pitches/logic';
import { useLocale } from '@/lib/locale';
import { shareToWhatsApp } from '@/lib/share';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { useToast } from '@/ui/Toast';

export type PitchCardVariant = 'hero' | 'compact' | 'urgent';

const PHOTO_HEIGHT: Record<PitchCardVariant, string> = {
  hero: 'h-44',
  compact: 'h-40',
  urgent: 'h-36',
};

/**
 * One pitch in the list, in the design's three shapes: the hero card (slot grid and the big
 * book button), the compact card (slot pills and quick book) and the "players wanted" card.
 */
export function PitchCard({
  pitch,
  date,
  variant,
}: {
  pitch: Pitch;
  date: string;
  variant: PitchCardVariant;
}) {
  const { t, pick, time, day } = useLocale();
  const router = useRouter();
  const cache = useCache();
  const toast = useToast();
  const [selected, setSelected] = useState<string | null>(null);
  const isToday = date === dateInAmman(new Date());

  const slots = cardSlots(pitch, date, {
    limit: variant === 'hero' ? 4 : 2,
    includeBusy: variant === 'hero',
  });
  const freeSlots = slots.filter((s) => s.state === 'free');
  const chosen = selected ?? freeSlots[Math.min(1, freeSlots.length - 1)]?.startsAt ?? null;

  const book = (slot: string | null = chosen) => {
    sfx.success();
    router.push({
      pathname: '/book/[pitchId]',
      params: { pitchId: pitch.id, date, ...(slot ? { slot } : {}) },
    });
  };

  const toggleFavorite = () => {
    sfx.clipBeep();
    cache.update<Pitch[]>(keys.pitches, (all) =>
      all.map((p) => (p.id === pitch.id ? { ...p, favorite: !p.favorite } : p)),
    );
  };

  const share = async () => {
    const text = t('pitches.shareText', {
      pitch: pick(pitch.name),
      day: isToday ? t('home.missing.tonight') : day(`${date}T12:00:00+03:00`),
      time: chosen ? time(chosen) : '',
      url: `https://nujoom.app/p/${pitch.id}`,
    });
    if ((await shareToWhatsApp(text)) === 'copied') toast.show(t('common.copied'));
  };

  const badge = pitchBadge(pitch);

  return (
    <View
      className={`bg-surface-container rounded-xl overflow-hidden border border-border ${
        variant === 'hero' ? 'shadow-xl' : 'shadow-lg'
      }`}
    >
      <View
        className={`relative w-full ${PHOTO_HEIGHT[variant]} bg-surface-container-high overflow-hidden`}
      >
        {pitch.photoUrl ? (
          <Image
            source={{ uri: pitch.photoUrl }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Icon name="stadium" size={56} className="text-surface-bright" />
          </View>
        )}

        <View className="absolute top-2.5 inset-x-2.5 flex-row items-center justify-between">
          {variant === 'urgent' ? (
            <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-full bg-error-container shadow-sm">
              <Icon name="campaign" size={13} className="text-on-error-container" />
              <Text font="grotesk" className="text-[11px] text-on-error-container font-bold">
                {t('pitches.badgeWanted')}
              </Text>
            </View>
          ) : badge ? (
            <View className="flex-row items-center gap-1 px-2.5 py-1 rounded-full bg-surface/85 shadow-sm">
              <Icon
                name={badge === 'elite' ? 'verified' : 'videocam'}
                size={badge === 'elite' ? 13 : 14}
                className={badge === 'elite' ? 'text-primary' : 'text-secondary'}
              />
              <Text
                font="grotesk"
                className={`text-[11px] font-bold ${badge === 'elite' ? 'text-primary' : 'text-secondary'}`}
              >
                {badge === 'verified'
                  ? t('pitches.badgeVerified')
                  : badge === 'dock'
                    ? t('pitches.badgeDock')
                    : t('pitches.badgeElite', { size: pitch.size })}
              </Text>
            </View>
          ) : (
            <View />
          )}

          {variant === 'urgent' ? (
            <View className="bg-surface/80 px-2 py-0.5 rounded">
              <Text font="grotesk" className="text-[10px] text-on-surface">
                {t('pitches.badgeCage', { size: pitch.size })}
              </Text>
            </View>
          ) : (
            <Pressable
              onPress={toggleFavorite}
              accessibilityRole="button"
              accessibilityLabel={pitch.favorite ? t('pitches.unfavorite') : t('pitches.favorite')}
              className="w-8 h-8 rounded-full bg-surface/75 items-center justify-center"
            >
              <Icon
                name="favorite"
                filled={pitch.favorite}
                size={18}
                className={pitch.favorite ? 'text-primary' : 'text-on-surface'}
              />
            </Pressable>
          )}
        </View>

        <View
          className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-surface-container via-surface-container/60 to-transparent p-3 ${
            variant === 'hero' ? 'pt-8' : 'pt-6'
          } flex-row items-end justify-between`}
        >
          <View className="flex-1 me-2">
            <Text
              font="grotesk"
              className={`text-[10px] font-bold ${
                variant === 'hero'
                  ? 'text-primary-fixed tracking-wider uppercase'
                  : 'text-on-surface-variant'
              }`}
            >
              {pick(pitch.area)}
            </Text>
            <Text
              font="rubik"
              className={
                variant === 'hero'
                  ? 'text-[18px] text-on-surface font-black'
                  : 'text-[16px] text-on-surface font-bold'
              }
              numberOfLines={1}
            >
              {pick(pitch.name)}
            </Text>
          </View>
          <View className="items-end">
            <View className="flex-row items-baseline gap-0.5">
              <Text font="grotesk" className="text-[24px] leading-[28px] text-primary font-black">
                {pitch.pricePerHour}
              </Text>
              <Text className="text-[12px] text-primary font-bold">{t('pitches.perHour')}</Text>
            </View>
            {variant === 'hero' && pitch.priceNote ? (
              <Text font="grotesk" className="text-[9px] text-on-surface-variant">
                {pick(pitch.priceNote)}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      {variant === 'hero' ? (
        <HeroBody
          pitch={pitch}
          slots={slots}
          chosen={chosen}
          isToday={isToday}
          onSelect={(iso) => {
            sfx.clipBeep();
            setSelected(iso);
          }}
          onBook={() => book()}
          onShare={share}
        />
      ) : variant === 'compact' ? (
        <View className="p-3 gap-2.5">
          <Meta pitch={pitch} compact />
          <View className="flex-row items-center gap-2">
            {freeSlots.map((slot) => (
              <Pressable
                key={slot.startsAt}
                onPress={() => {
                  sfx.clipBeep();
                  setSelected(slot.startsAt);
                }}
                className={`flex-1 py-1.5 rounded-lg items-center ${
                  chosen === slot.startsAt
                    ? 'bg-secondary-container border border-secondary'
                    : 'bg-surface-container-high active:bg-surface-container-highest'
                }`}
              >
                <Text
                  font="grotesk"
                  className={`text-[11px] font-bold ${
                    chosen === slot.startsAt ? 'text-on-secondary-container' : 'text-secondary'
                  }`}
                >
                  {t('pitches.slotPill', { time: time(slot.startsAt) })}
                </Text>
              </Pressable>
            ))}
            {freeSlots.length === 0 ? (
              <Text className="flex-1 text-[12px] text-on-surface-variant">
                {t('pitches.noSlots')}
              </Text>
            ) : null}
            <Pressable
              onPress={() => book()}
              disabled={!freeSlots.length}
              className="py-1.5 px-3 rounded-lg bg-primary active:bg-primary-container shadow-sm disabled:opacity-50"
            >
              <Text font="rubik" className="text-[13px] text-on-primary font-bold">
                {t('pitches.quickBook')}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View className="p-3 gap-2">
          <View className="flex-row items-center justify-between">
            <Rating pitch={pitch} />
            {pitch.pricePerHour <= 15 ? (
              <Text className="text-[14px] text-secondary font-bold">{t('pitches.cheap')}</Text>
            ) : null}
          </View>
          <View className="flex-row items-center justify-between gap-2 pt-1">
            <Text font="grotesk" className="text-[11px] text-on-surface-variant flex-1">
              {freeSlots.length
                ? t('pitches.availableTimes', {
                    times: freeSlots.map((s) => time(s.startsAt)).join(' ، '),
                  })
                : t('pitches.noSlots')}
            </Text>
            <Pressable
              onPress={() => book()}
              className="py-1.5 px-3 rounded-lg bg-surface-container-high active:bg-primary-container"
            >
              <Text font="rubik" className="text-[13px] text-primary font-bold">
                {t('pitches.details')}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

function Rating({ pitch, compact = false }: { pitch: Pitch; compact?: boolean }) {
  const { t } = useLocale();
  if (pitch.rating === null) {
    return (
      <View className="bg-primary-container/15 px-2 py-0.5 rounded">
        <Text font="grotesk" className="text-[11px] text-primary font-bold">
          {t('pitches.newPitch')}
        </Text>
      </View>
    );
  }
  return (
    <View className="flex-row items-center gap-1">
      <Icon name="star" size={compact ? 15 : 16} className="text-primary" />
      <Text
        font="grotesk"
        className={`${compact ? 'text-[13px]' : 'text-[16px]'} text-on-surface font-bold`}
      >
        {pitch.rating.toFixed(1)}
      </Text>
      <Text font="grotesk" className="text-[10px] text-on-surface-variant">
        {compact ? `(${pitch.ratingCount})` : t('pitches.ratings', { count: pitch.ratingCount })}
      </Text>
    </View>
  );
}

function Meta({ pitch, compact = false }: { pitch: Pitch; compact?: boolean }) {
  const { t } = useLocale();
  if (compact) {
    return (
      <View className="flex-row items-center gap-3 flex-wrap">
        <Rating pitch={pitch} compact />
        <Text className="text-[14px] text-on-surface-variant">
          • {t('common.size', { n: pitch.size })}
        </Text>
        {pitch.amenities.includes('parking') ? (
          <Text className="text-[14px] text-on-surface-variant">
            • {t('pitches.amenities.parking')}
          </Text>
        ) : null}
      </View>
    );
  }
  return (
    <View className="flex-row items-center gap-3 flex-wrap">
      <Rating pitch={pitch} />
      <View className="flex-row items-center gap-1">
        <Icon name="aspect_ratio" size={16} className="text-secondary" />
        <Text className="text-[14px] text-on-surface-variant">
          {t('common.size', { n: pitch.size })}
        </Text>
      </View>
      <View className="flex-row items-center gap-1">
        <Icon name="grass" size={16} className="text-on-surface-variant" />
        <Text className="text-[14px] text-on-surface-variant">
          {t(`pitches.surfaces.${pitch.surface}`)}
        </Text>
      </View>
    </View>
  );
}

function HeroBody({
  pitch,
  slots,
  chosen,
  isToday,
  onSelect,
  onBook,
  onShare,
}: {
  pitch: Pitch;
  slots: DaySlot[];
  chosen: string | null;
  isToday: boolean;
  onSelect: (iso: string) => void;
  onBook: () => void;
  onShare: () => void;
}) {
  const { t, time } = useLocale();
  const anyFree = slots.some((s) => s.state === 'free');
  return (
    <View className="p-3 gap-3">
      <View className="flex-row items-center justify-between pb-1 gap-2">
        <View className="flex-1">
          <Meta pitch={pitch} />
        </View>
        <View className="px-2 py-0.5 rounded bg-surface-container-high">
          <Text
            font="grotesk"
            className={`text-[11px] ${anyFree ? 'text-secondary' : 'text-error'}`}
          >
            {anyFree
              ? isToday
                ? t('pitches.availableTonight')
                : t('pitches.available')
              : t('pitches.fullyBooked')}
          </Text>
        </View>
      </View>

      <View className="gap-1.5">
        <Text font="grotesk" className="text-[11px] text-on-surface-variant">
          {t('pitches.pickSlot')}
        </Text>
        {slots.length ? (
          <View className="flex-row gap-1.5">
            {slots.map((slot) => {
              const busy = slot.state === 'busy';
              const isChosen = !busy && chosen === slot.startsAt;
              return (
                <Pressable
                  key={slot.startsAt}
                  disabled={busy}
                  onPress={() => onSelect(slot.startsAt)}
                  accessibilityState={{ selected: isChosen, disabled: busy }}
                  className={`flex-1 items-center justify-center py-2 px-1 rounded-lg ${
                    busy
                      ? 'bg-surface-container-low opacity-50'
                      : isChosen
                        ? 'bg-secondary-container shadow-md border-2 border-secondary'
                        : 'bg-surface-container-high active:bg-surface-container-highest'
                  }`}
                >
                  <Text
                    font="grotesk"
                    className={`text-[13px] font-bold ${
                      busy
                        ? 'text-on-surface-variant line-through'
                        : isChosen
                          ? 'text-on-secondary-container'
                          : 'text-secondary'
                    }`}
                  >
                    {time(slot.startsAt)}
                  </Text>
                  <Text
                    font="grotesk"
                    className={`text-[9px] font-bold ${
                      busy
                        ? 'text-on-surface-variant'
                        : isChosen
                          ? 'text-on-secondary-container'
                          : 'text-secondary'
                    }`}
                  >
                    {busy
                      ? t('pitches.slotBooked')
                      : isChosen
                        ? t('pitches.slotSelected')
                        : t('pitches.slotFree')}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Text className="text-[12px] text-on-surface-variant">{t('pitches.noSlots')}</Text>
        )}
      </View>

      <View className="flex-row items-center gap-2 pt-1">
        <Pressable
          onPress={onBook}
          disabled={!anyFree}
          className="flex-1 py-3 px-4 rounded-xl bg-primary-container active:bg-primary shadow-[0_4px_16px_rgba(245,158,11,0.25)] flex-row items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
        >
          <Icon name="bolt" size={20} className="text-on-primary" />
          <Text font="rubik" className="text-[15px] text-on-primary font-bold">
            {t('pitches.book')}
          </Text>
        </Pressable>
        <Pressable
          onPress={onShare}
          accessibilityRole="button"
          accessibilityLabel={t('common.shareWhatsApp')}
          className="w-12 h-12 rounded-xl bg-secondary-container/20 active:bg-secondary-container items-center justify-center"
        >
          <Icon name="share" size={22} className="text-secondary" />
        </Pressable>
      </View>
    </View>
  );
}
