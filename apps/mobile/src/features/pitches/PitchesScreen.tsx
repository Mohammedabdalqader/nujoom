import { dateInAmman } from '@nujoom/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { useAreas, useHomeFeed, useMe, usePitches } from '@/data/api';
import { useFlags } from '@/data/flags';
import type { Pitch } from '@/data/types';
import { sfx } from '@/design/sound';
import { filterPitches, type FormatFilter } from '@/features/pitches/logic';
import { MapDrawer } from '@/features/pitches/MapDrawer';
import { PitchCard, type PitchCardVariant } from '@/features/pitches/PitchCard';
import { SearchPanel } from '@/features/pitches/SearchPanel';
import { UrgentBanner } from '@/features/pitches/UrgentBanner';
import { useLocale } from '@/lib/locale';
import { Icon, type IconName } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

function variantFor(pitch: Pitch, index: number): PitchCardVariant {
  if (pitch.openSpot) return 'urgent';
  return index === 0 ? 'hero' : 'compact';
}

/** Tab 2 — الملاعب: search, open-spot alert, the pitch list and the perks bar. */
export function PitchesScreen() {
  const { t, pick, day } = useLocale();
  const router = useRouter();
  const flags = useFlags();
  const me = useMe().data;
  const pitches = usePitches().data ?? [];
  const areas = useAreas().data ?? [];
  const urgent = useHomeFeed().data?.missingOne[0];
  const [area, setArea] = useState<string>('all');
  const [format, setFormat] = useState<FormatFilter>('all');
  const [date, setDate] = useState(() => dateInAmman(new Date()));
  const [mapOpen, setMapOpen] = useState(false);

  const list = filterPitches(pitches, { area, format });
  const isToday = date === dateInAmman(new Date());
  const openBooking = (pitch: Pitch) =>
    router.push({ pathname: '/book/[pitchId]', params: { pitchId: pitch.id, date } });
  const openSpot = (id: string) => router.push({ pathname: '/missing-one', params: { id } });

  return (
    <Screen className="px-4 gap-4 pb-8">
      <SearchPanel
        cityName={me ? pick(me.city) : ''}
        cityCode={me ? me.city.en.toUpperCase() : ''}
        areas={areas}
        area={area}
        onArea={setArea}
        date={date}
        onDate={setDate}
        format={format}
        onFormat={setFormat}
        totalCount={filterPitches(pitches, { area, format: 'all' }).length}
        mapOpen={mapOpen}
        // The schematic map works without a Maps key; tiles come with `map_enabled` (spec §6.4).
        onToggleMap={() => setMapOpen((v) => !v)}
      />

      {mapOpen ? (
        <MapDrawer
          pitches={list}
          onClose={() => setMapOpen(false)}
          onPitch={openBooking}
          onUrgent={(pitch) => pitch.openSpot && openSpot(pitch.openSpot.id)}
        />
      ) : null}

      {flags.missing_one_enabled && urgent ? (
        <UrgentBanner
          spot={urgent}
          onJoin={() => {
            sfx.success();
            openSpot(urgent.id);
          }}
        />
      ) : null}

      <View className="flex-row items-center justify-between pt-1">
        <View className="flex-row items-center gap-2 flex-1">
          <Icon name="sports_soccer" size={20} className="text-primary" />
          <Text
            font="rubik"
            className="text-[22px] leading-[30px] text-on-surface font-extrabold tracking-tight"
          >
            {isToday
              ? t('pitches.titleTonight')
              : t('pitches.titleDay', { day: day(`${date}T12:00:00+03:00`) })}
          </Text>
        </View>
        {list.some((p) => p.amenities.includes('lights')) ? (
          <View className="bg-surface-container px-2 py-0.5 rounded-md border border-border">
            <Text font="grotesk" className="text-[11px] text-primary-fixed-dim">
              {t('pitches.floodlit')}
            </Text>
          </View>
        ) : null}
      </View>

      {list.length ? (
        list.map((pitch, index) => (
          <PitchCard key={pitch.id} pitch={pitch} date={date} variant={variantFor(pitch, index)} />
        ))
      ) : (
        <View className="bg-surface-container-low rounded-xl p-5 items-center gap-3 border border-border/60">
          <Icon name="stadium" size={40} className="text-surface-bright" />
          <Text className="text-[14px] text-on-surface-variant text-center">
            {/* No bookable pitches at all is honest news, not a filter problem (docs/DESIGN.md). */}
            {pitches.length === 0 ? t('pitches.noneBookable') : t('pitches.empty')}
          </Text>
          {pitches.length === 0 ? null : (
            <Pressable
              onPress={() => {
                setArea('all');
                setFormat('all');
              }}
              className="px-4 py-2 rounded-lg bg-surface-container-high active:bg-surface-container-highest"
            >
              <Text font="rubik" className="text-[13px] text-primary font-bold">
                {t('pitches.emptyCta')}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      <PerksBar />
    </Screen>
  );
}

function PerksBar() {
  const { t } = useLocale();
  const perks: { icon: IconName; color: string; title: string; sub: string }[] = [
    {
      icon: 'qr_code_scanner',
      color: 'text-primary',
      title: t('pitches.perkQr'),
      sub: t('pitches.perkQrSub'),
    },
    {
      icon: 'toll',
      color: 'text-secondary',
      title: t('pitches.perkFree'),
      sub: t('pitches.perkFreeSub'),
    },
    {
      icon: 'videocam',
      color: 'text-primary',
      title: t('pitches.perkRecord'),
      sub: t('pitches.perkRecordSub'),
    },
  ];
  return (
    <View className="flex-row gap-2 pt-1">
      {perks.map((perk) => (
        <View
          key={perk.title}
          className="flex-1 items-center p-2.5 rounded-lg bg-surface-container-low border border-border/60"
        >
          <Icon name={perk.icon} size={22} className={`${perk.color} mb-1`} />
          <Text font="rubik" className="text-[13px] font-bold text-on-surface text-center">
            {perk.title}
          </Text>
          <Text font="grotesk" className="text-[10px] text-on-surface-variant text-center">
            {perk.sub}
          </Text>
        </View>
      ))}
    </View>
  );
}
