import { useState } from 'react';
import { View } from 'react-native';

import { useLeaderboard, useMe } from '@/data/api';
import type { AgeBand, RankPeriod, RankScope } from '@/data/types';
import { BetaBanner } from '@/features/rankings/BetaBanner';
import { Filters } from '@/features/rankings/Filters';
import { LeaderRow } from '@/features/rankings/LeaderRow';
import { MyRankBar } from '@/features/rankings/MyRankBar';
import { PlayerOfWeekCard } from '@/features/rankings/PlayerOfWeekCard';
import { Podium } from '@/features/rankings/Podium';
import { useLocale } from '@/lib/locale';
import { Screen } from '@/ui/Screen';
import { SectionHeader } from '@/ui/SectionHeader';
import { Text } from '@/ui/Text';

/**
 * Tab 4 — المتصدرين (beta): neighborhood podium, player of the week and the Top Ballers list for
 * a scope, age group and period (spec §6.10). The tournament filter stays hidden until M12
 * (D-006.7); the derby prediction was removed (D-006.6).
 */
export function RankingsScreen() {
  const { t, pick } = useLocale();
  const me = useMe().data;
  const [scope, setScope] = useState<RankScope>('city');
  // Youth start on their own age board; adults never see youth on the adult board (spec §7).
  const [age, setAge] = useState<AgeBand>(me?.isYouth ? 'U18' : 'ADULT');
  const [period, setPeriod] = useState<RankPeriod>('month');
  const board = useLeaderboard(scope, age, period).data;

  if (!me) return <Screen>{null}</Screen>;

  return (
    <View className="flex-1 bg-surface">
      <Screen className="px-3 gap-4 pb-24">
        <BetaBanner />
        <Filters
          names={{
            hara: me.neighborhood ? pick(me.neighborhood) : pick(me.city),
            city: pick(me.city),
            country: pick(me.country),
          }}
          scope={scope}
          onScope={setScope}
          age={age}
          onAge={setAge}
          period={period}
          onPeriod={setPeriod}
        />
        {board ? (
          <>
            <Podium standings={board.standings} city={pick(me.city)} />
            {board.playerOfWeek ? <PlayerOfWeekCard pow={board.playerOfWeek} /> : null}
            <View className="gap-1.5">
              <SectionHeader
                className="pb-1 px-1"
                icon="sports_soccer"
                title={t('rankings.listTitle')}
                trailing={
                  <Text className="text-[12px] text-on-surface-variant">
                    {t('rankings.sortedBy')}
                  </Text>
                }
              />
              {board.rows.length ? (
                board.rows.map((row) => <LeaderRow key={row.player.id} row={row} />)
              ) : (
                <Text className="text-[12px] text-on-surface-variant px-1">
                  {t('rankings.empty')}
                </Text>
              )}
              {age !== 'ADULT' ? (
                <Text className="text-[11px] text-on-surface-variant px-1 pt-1">
                  {t('rankings.youthNote')}
                </Text>
              ) : null}
            </View>
          </>
        ) : null}
      </Screen>
      {board?.me ? <MyRankBar me={me} rank={board.me} /> : null}
    </View>
  );
}
