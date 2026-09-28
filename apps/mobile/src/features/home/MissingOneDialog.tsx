import { initials } from '@nujoom/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { keys, useCache, useHomeFeed } from '@/data/api';
import type { HomeFeed, MissingOne } from '@/data/types';
import { sfx } from '@/design/sound';
import { useLocale } from '@/lib/locale';
import { shareToWhatsApp } from '@/lib/share';
import { describeKickoff } from '@/lib/when';
import { Avatar } from '@/ui/Avatar';
import { Dialog, DialogLoading } from '@/ui/Dialog';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { useToast } from '@/ui/Toast';

const JOIN_CLOSE_MS = 1200;

/**
 * "ناقصنا واحد (طلب عاجل)": one open spot with a one-tap join, or every open spot near you when
 * opened from "view all". The prototype's free-text captain quote became the organizer's name
 * and the squad count: requests carry no messages (spec §7). R2: the first to accept joins.
 */
export function MissingOneDialog({ id }: { id: string | undefined }) {
  const feed = useHomeFeed();
  const [selected, setSelected] = useState(id);
  if (feed.isPending) return <DialogLoading />;
  const items = feed.data?.missingOne ?? [];
  const spot = selected ? items.find((m) => m.id === selected) : undefined;
  if (selected) return <Spot spot={spot} />;
  return <SpotList items={items} onOpen={setSelected} />;
}

function Header({ title }: { title: string }) {
  const { t } = useLocale();
  const router = useRouter();
  return (
    <View className="flex-row items-center justify-between border-b border-surface-container-high pb-3">
      <View className="flex-row items-center gap-2 flex-1">
        <Icon name="person_add" size={22} className="text-error" />
        <Text font="rubik" className="text-[18px] text-on-surface font-bold shrink">
          {title}
        </Text>
      </View>
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

function useShareSpot() {
  const { t, locale, pick, jod } = useLocale();
  const toast = useToast();
  return async (spot: MissingOne) => {
    sfx.clipBeep();
    const text = t('home.missing.shareText', {
      position: spot.wantedPosition
        ? t(`positions.${spot.wantedPosition}`)
        : t('home.missing.anyPosition'),
      pitch: pick(spot.pitchName),
      when: describeKickoff(spot.startsAt, locale, t),
      price: jod(spot.sharePerPlayer),
      url: spot.shareUrl,
    });
    if ((await shareToWhatsApp(text)) === 'copied') toast.show(t('common.copied'));
  };
}

function SpotFacts({ spot }: { spot: MissingOne }) {
  const { t, pick, ago, number } = useLocale();
  return (
    <View className="bg-surface-container-low p-3 rounded-xl border border-error-container/40 gap-2">
      <View className="flex-row items-center justify-between gap-2">
        <Text font="rubik" className="text-[16px] text-on-surface font-bold shrink">
          {pick(spot.pitchName)}
        </Text>
        <View className="bg-error-container/30 px-2 py-0.5 rounded-full">
          <Text font="grotesk" className="text-[12px] text-error font-bold">
            {t('missingOne.starts', { relative: ago(spot.startsAt) })}
          </Text>
        </View>
      </View>
      <Text className="text-[12px] text-on-surface-variant">
        {t('missingOne.position', {
          position: spot.wantedPosition
            ? t(`positions.${spot.wantedPosition}`)
            : t('missingOne.anyPosition'),
        })}
      </Text>
      <View className="flex-row items-center justify-between">
        <Text className="text-[12px] text-on-surface-variant">{t('missingOne.share')}</Text>
        <Text font="grotesk" className="text-[15px] text-secondary font-bold">
          {t('missingOne.jodLong', { value: number(spot.sharePerPlayer) })}
        </Text>
      </View>
      <View className="p-2 rounded-lg bg-surface-container-high flex-row items-center justify-between gap-2">
        <View className="flex-row items-center gap-2 shrink">
          <Avatar
            uri={spot.organizer.avatarUrl}
            initials={initials(spot.organizer.name)}
            size="w-6 h-6"
            textClassName="text-[8px] text-on-surface"
          />
          <Text className="text-[11px] text-on-surface-variant shrink" numberOfLines={1}>
            {t('missingOne.captain', { name: spot.organizer.name })}
          </Text>
        </View>
        <Text className="text-[11px] text-on-surface-variant">
          {`${t('common.players', { count: spot.roster.length })} • ${t('missingOne.spots', { count: spot.openSpots })}`}
        </Text>
      </View>
    </View>
  );
}

function Spot({ spot }: { spot: MissingOne | undefined }) {
  const { t } = useLocale();
  const router = useRouter();
  const toast = useToast();
  const cache = useCache();
  const share = useShareSpot();
  const [joined, setJoined] = useState(false);

  if (!spot) {
    return (
      <Dialog className="bg-surface-container border border-error/40 p-4 gap-4">
        <Header title={t('missingOne.title')} />
        <Text className="py-4 text-center text-[13px] text-on-surface-variant">
          {t('missingOne.gone')}
        </Text>
      </Dialog>
    );
  }

  const join = () => {
    // R2: an RPC takes the spot atomically, so two players can't fill the same one.
    sfx.success();
    setJoined(true);
    setTimeout(() => {
      cache.update<HomeFeed>(keys.home, (feed) => ({
        ...feed,
        missingOne: feed.missingOne.filter((m) => m.id !== spot.id),
      }));
      toast.show(t('missingOne.joinedToast'));
      router.back();
    }, JOIN_CLOSE_MS);
  };

  return (
    <Dialog className="bg-surface-container border border-error/40 p-4 gap-4">
      <Header title={t('missingOne.title')} />
      <SpotFacts spot={spot} />
      <View className="gap-2 pt-1">
        <Pressable
          onPress={join}
          disabled={joined}
          className="w-full py-3 rounded-xl bg-secondary active:bg-secondary-container shadow-lg items-center active:scale-95"
        >
          <Text font="rubik" className="text-[16px] text-on-secondary font-bold">
            {joined ? t('missingOne.joined') : t('missingOne.join')}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => void share(spot)}
          className="w-full py-2.5 rounded-xl bg-surface-container-high active:bg-surface-container-highest border border-surface-container-highest flex-row items-center justify-center gap-2"
        >
          <Icon name="share" size={18} className="text-on-surface" />
          <Text font="rubik" className="text-[14px] text-on-surface">
            {t('missingOne.shareButton')}
          </Text>
        </Pressable>
      </View>
    </Dialog>
  );
}

function SpotList({ items, onOpen }: { items: MissingOne[]; onOpen: (id: string) => void }) {
  const { t } = useLocale();
  return (
    <Dialog className="bg-surface-container border border-error/40 p-4 gap-3 max-h-[88%]">
      <Header title={t('missingOne.listTitle')} />
      <ScrollView
        className="shrink"
        contentContainerClassName="gap-3 py-1"
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? (
          <Text className="py-6 text-center text-[13px] text-on-surface-variant">
            {t('missingOne.empty')}
          </Text>
        ) : (
          items.map((spot) => (
            <Pressable
              key={spot.id}
              onPress={() => {
                sfx.clipBeep();
                onOpen(spot.id);
              }}
              accessibilityRole="button"
              accessibilityHint={t('missingOne.details')}
            >
              <SpotFacts spot={spot} />
            </Pressable>
          ))
        )}
      </ScrollView>
    </Dialog>
  );
}
