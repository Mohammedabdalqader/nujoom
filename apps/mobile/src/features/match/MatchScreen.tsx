import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { keys, useCache, useMatchDay, useMe } from '@/data/api';
import type { MatchDay } from '@/data/types';
import { sfx } from '@/design/sound';
import { CheckinCard } from '@/features/match/CheckinCard';
import { ClipController } from '@/features/match/ClipController';
import { MatchDayToolkit } from '@/features/match/MatchDayToolkit';
import { MvpCard } from '@/features/match/MvpCard';
import { Scoreboard } from '@/features/match/Scoreboard';
import { Timeline } from '@/features/match/Timeline';
import { useLocale } from '@/lib/locale';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

/** Tab 3 — المباراة: live scoreboard, match tools, check-in, clip control, timeline and MVP vote. */
export function MatchScreen() {
  const me = useMe().data;
  const { data: match, isPending } = useMatchDay();
  const cache = useCache();
  if (isPending || !me) return <Screen>{null}</Screen>;
  if (!match) return <NoMatch />;

  const patch = (fn: (m: MatchDay) => MatchDay) =>
    cache.update<MatchDay | null>(keys.matchDay, (m) => (m ? fn(m) : m));

  return (
    <Screen className="pb-12">
      <Scoreboard match={match} />
      <View className="px-4 gap-4">
        <MatchDayToolkit bookingId={match.bookingId} costPerPlayer={match.costPerPlayer} />
        <CheckinCard match={match} />
        <View className="mb-2">
          <ClipController
            match={match}
            // R4: sends the trigger to the recording phone over the match's Realtime channel.
            onClip={() => {}}
          />
        </View>
        <Timeline match={match} />
        <MvpCard
          match={match}
          meId={me.id}
          onVote={(playerId) => patch((m) => ({ ...m, myVote: playerId }))}
          onNotify={() => {}}
        />
        <FooterBanner />
      </View>
    </Screen>
  );
}

function FooterBanner() {
  const { t } = useLocale();
  return (
    <View className="mt-4 p-4 rounded-xl bg-surface-container-lowest items-center overflow-hidden border border-border/40">
      <View className="flex-row items-center gap-1.5 mb-1">
        <Icon name="crown" size={18} className="text-primary" />
        <Text font="rubik" className="text-[12px] text-primary font-bold">
          {t('match.footerTitle')}
        </Text>
      </View>
      <Text className="text-[11px] leading-[18px] text-on-surface-variant max-w-xs text-center">
        {t('match.footerBody')}
      </Text>
    </View>
  );
}

function NoMatch() {
  const { t } = useLocale();
  const router = useRouter();
  return (
    <Screen className="px-4 pt-4">
      <View className="rounded-2xl bg-surface-container-low p-5 items-center gap-3 border border-border/60">
        <View className="w-14 h-14 rounded-xl bg-surface-container-high items-center justify-center">
          <Icon name="sports_soccer" size={30} className="text-primary" />
        </View>
        <Text font="rubik" className="text-[18px] text-on-surface font-bold">
          {t('match.none.title')}
        </Text>
        <Text className="text-[12px] text-on-surface-variant text-center">
          {t('match.none.body')}
        </Text>
        <Pressable
          onPress={() => {
            sfx.clipBeep();
            router.navigate('/pitches');
          }}
          className="px-5 h-11 rounded-lg bg-primary-container active:bg-primary flex-row items-center gap-2"
        >
          <Icon name="bolt" size={20} className="text-on-primary" />
          <Text font="rubik" className="text-[16px] text-on-primary font-bold">
            {t('match.none.cta')}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
