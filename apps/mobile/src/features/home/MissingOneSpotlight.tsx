import { initials } from '@nujoom/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import type { MissingOne } from '@/data/types';
import { sfx } from '@/design/sound';
import { useLocale } from '@/lib/locale';
import { shareToWhatsApp } from '@/lib/share';
import { describeKickoff } from '@/lib/when';
import { Icon } from '@/ui/Icon';
import { SectionHeader } from '@/ui/SectionHeader';
import { Text } from '@/ui/Text';
import { useToast } from '@/ui/Toast';

const AVATAR_TILES = [
  'bg-surface-bright',
  'bg-surface-container-highest',
  'bg-surface-container-high',
];

/**
 * "ناقصنا واحد الآن": the nearest open spot with pitch, time, per-player share, wanted position and
 * roster. The chat button shares the invite to WhatsApp; it never contacts the organizer, because
 * the product has no messaging (spec §7).
 */
export function MissingOneSpotlight({ items }: { items: MissingOne[] }) {
  const { t, locale, pick, jod } = useLocale();
  const router = useRouter();
  const toast = useToast();
  const [joined, setJoined] = useState(false);
  const spot = items[0];
  if (!spot) return null;

  const when = describeKickoff(spot.startsAt, locale, t);
  const position = spot.wantedPosition ? t(`positions.${spot.wantedPosition}`) : null;

  const join = () => {
    sfx.success();
    setJoined(true);
    setTimeout(() => router.push({ pathname: '/missing-one', params: { id: spot.id } }), 400);
  };

  const share = async () => {
    sfx.clipBeep();
    const text = t('home.missing.shareText', {
      position: position ?? t('home.missing.anyPosition'),
      pitch: pick(spot.pitchName),
      when,
      price: jod(spot.sharePerPlayer),
      url: spot.shareUrl,
    });
    if ((await shareToWhatsApp(text)) === 'copied') toast.show(t('common.copied'));
  };

  return (
    <View className="gap-2">
      <SectionHeader
        className="px-4"
        icon="person_alert"
        iconClassName="text-tertiary"
        title={t('home.missing.title')}
        trailing={
          <Pressable onPress={() => router.push('/missing-one')} hitSlop={8}>
            <Text font="grotesk" className="text-[11px] text-primary font-bold">
              {t('home.missing.viewAll', { count: items.length })}
            </Text>
          </Pressable>
        }
      />

      <View className="px-4">
        <View className="bg-surface-container-low rounded-xl p-4 shadow-lg gap-3 overflow-hidden border border-border">
          <View className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-tertiary via-primary-container to-secondary" />

          <View className="flex-row items-start justify-between gap-3 pt-1">
            <View className="flex-row items-center gap-3 flex-1 min-w-0">
              <View className="w-12 h-12 rounded-xl bg-surface-container-high items-center justify-center">
                <Icon name="groups" size={26} className="text-secondary" />
              </View>
              <View className="flex-1 min-w-0">
                <View className="flex-row items-center gap-1.5">
                  <Text
                    font="rubik"
                    className="text-[18px] text-on-surface font-bold shrink"
                    numberOfLines={1}
                  >
                    {pick(spot.pitchName)}
                  </Text>
                  <View className="bg-surface-bright px-1.5 py-0.5 rounded">
                    <Text font="grotesk" className="text-[11px] text-on-surface-variant">
                      {t('common.size', { n: spot.size })}
                    </Text>
                  </View>
                </View>
                <Text className="text-[12px] text-on-surface-variant" numberOfLines={1}>
                  {when}
                </Text>
              </View>
            </View>
            <View className="items-end">
              <Text font="grotesk" className="text-[16px] text-secondary font-bold">
                {jod(spot.sharePerPlayer)}
              </Text>
              <Text font="grotesk" className="text-[11px] text-on-surface-variant">
                {t('home.missing.perPlayer')}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between bg-surface-container px-3 py-2 rounded-lg">
            <View className="bg-error-container/40 px-2 py-0.5 rounded">
              <Text font="grotesk" className="text-[11px] text-tertiary font-bold">
                {position ? t('home.missing.wanted', { position }) : t('home.missing.wantedAny')}
              </Text>
            </View>
            <View className="flex-row items-center">
              {spot.roster.slice(0, 3).map((p, i) => (
                <View
                  key={p.id}
                  className={`w-7 h-7 rounded-full items-center justify-center border-2 border-surface-container ${
                    AVATAR_TILES[i]
                  } ${i > 0 ? '-ms-2' : ''}`}
                >
                  <Text className="text-[10px] font-bold text-on-surface">{initials(p.name)}</Text>
                </View>
              ))}
              <View
                className={`w-7 h-7 rounded-full bg-primary-container items-center justify-center border-2 border-surface-container ${
                  spot.roster.length ? '-ms-2' : ''
                }`}
              >
                <Text className="text-[11px] text-on-primary-container font-black">
                  +{spot.openSpots}
                </Text>
              </View>
            </View>
          </View>

          <View className="flex-row items-center gap-2 pt-1">
            <Pressable
              onPress={join}
              disabled={joined}
              className="flex-1 h-11 bg-secondary active:bg-secondary-container rounded-lg flex-row items-center justify-center gap-2 shadow-[0_2px_12px_rgba(78,222,163,0.2)] active:scale-95"
            >
              <Icon name="sports_handball" size={18} className="text-on-secondary" />
              <Text font="rubik" className="text-[18px] text-on-secondary font-bold">
                {joined ? t('home.missing.joined') : t('home.missing.join')}
              </Text>
            </Pressable>
            <Pressable
              onPress={share}
              accessibilityRole="button"
              accessibilityLabel={t('home.missing.shareInvite')}
              className="h-11 w-11 bg-surface-container-high active:bg-surface-bright rounded-lg items-center justify-center"
            >
              <Icon name="chat" size={20} className="text-secondary" />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
