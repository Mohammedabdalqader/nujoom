import { formatCountdown, formatMatchClock } from '@nujoom/shared';
import { View } from 'react-native';

import type { MatchDay, Team } from '@/data/types';
import { useLocale } from '@/lib/locale';
import { useNow } from '@/lib/useNow';
import { Icon } from '@/ui/Icon';
import { PingDot } from '@/ui/PingDot';
import { Text } from '@/ui/Text';

function TeamSide({ team, highlight }: { team: Team; highlight: boolean }) {
  const { pick } = useLocale();
  const blue = team.kit === 'blue';
  return (
    <View className="items-center flex-1 min-w-0">
      <View
        className={`w-12 h-12 rounded-xl items-center justify-center shadow-lg mb-1.5 border ${
          blue
            ? 'bg-team-blue-deep/30 border-team-blue/30'
            : 'bg-primary-container/20 border-primary-container/30'
        }`}
      >
        <Icon name="shield" size={28} className={blue ? 'text-team-blue-light' : 'text-primary'} />
        <View
          className={`absolute -top-1 -start-1 h-3.5 w-3.5 items-center justify-center rounded-full ${
            blue ? 'bg-team-blue-strong' : 'bg-primary-container'
          }`}
        >
          <Text
            font="grotesk"
            className={`text-[9px] leading-[11px] font-bold ${blue ? 'text-white' : 'text-on-primary-container'}`}
          >
            {team.side}
          </Text>
        </View>
      </View>
      <Text
        font="rubik"
        className="text-[18px] text-on-surface font-bold text-center w-full"
        numberOfLines={1}
      >
        {team.name}
      </Text>
      <Text
        font="grotesk"
        className={`text-[11px] ${highlight ? 'text-secondary' : 'text-on-surface-variant'}`}
      >
        {pick(team.hara)}
      </Text>
    </View>
  );
}

/** Live meta bar (LIVE, pitch, clock) and the scoreboard card with referee and recording state. */
export function Scoreboard({ match }: { match: MatchDay }) {
  const { t, pick } = useLocale();
  const now = useNow();
  const [a, b] = match.teams;
  const live = match.phase === 'live';

  const clock =
    match.phase === 'upcoming'
      ? formatCountdown(Date.parse(match.startsAt) - now)
      : match.startedAt
        ? formatMatchClock(Math.min(now, Date.parse(match.endsAt)) - Date.parse(match.startedAt))
        : '00:00';

  const status =
    match.phase === 'upcoming'
      ? t('match.notStarted', { n: match.size })
      : live
        ? t('match.halfSize', {
            half: t(match.half === 1 ? 'match.half1' : 'match.half2'),
            n: match.size,
          })
        : t('match.fullTime', { n: match.size });

  return (
    <View className="px-4 pt-2 pb-4">
      <View className="absolute -top-12 inset-x-10 h-32 bg-primary-container/20 rounded-full blur-[50px]" />

      <View className="flex-row items-center justify-between gap-2 mb-2">
        <View className="flex-row items-center gap-1.5 flex-1 min-w-0">
          {live ? (
            <PingDot color="bg-error" size="h-2.5 w-2.5" className="bg-error-container" />
          ) : (
            <View className="h-2.5 w-2.5 rounded-full bg-primary-container" />
          )}
          <Text
            font="grotesk"
            className={`text-[11px] uppercase font-bold tracking-wider ${live ? 'text-error' : 'text-primary'}`}
          >
            {t(live ? 'match.live' : match.phase === 'upcoming' ? 'match.soon' : 'match.ended')}
          </Text>
          <Text font="grotesk" className="text-[11px] text-outline-variant">
            |
          </Text>
          <Text className="text-[12px] text-on-surface-variant shrink" numberOfLines={1}>
            {t('match.pitchCity', { pitch: pick(match.pitchName), city: pick(match.city) })}
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high border border-surface-container-highest">
          <Icon name="timer" size={16} className="text-primary animate-pulse" />
          <Text font="grotesk" className="text-[16px] text-primary tracking-wide font-bold">
            {clock}
          </Text>
        </View>
      </View>

      <View className="rounded-xl bg-surface-container-low shadow-xl p-4 overflow-hidden border border-border">
        <View className="absolute inset-0 bg-gradient-to-b from-surface-bright/10 via-transparent to-surface-container-lowest/80" />
        <View className="flex-row items-center justify-between gap-2">
          <TeamSide team={a} highlight />
          <View className="items-center px-4">
            <View className="flex-row items-center gap-2">
              <Text
                font="grotesk"
                className="text-[38px] leading-[42px] text-primary font-black text-shadow-[0_0_12px_rgba(255,193,116,0.35)]"
              >
                {match.score[0]}
              </Text>
              <Text font="rubik" className="text-[22px] text-outline-variant font-bold">
                :
              </Text>
              <Text
                font="grotesk"
                className="text-[38px] leading-[42px] text-on-surface font-black"
              >
                {match.score[1]}
              </Text>
            </View>
            <View className="mt-2 px-2 py-0.5 rounded-full bg-surface-container">
              <Text font="grotesk" className="text-[11px] text-on-surface-variant">
                {status}
              </Text>
            </View>
          </View>
          <TeamSide team={b} highlight={false} />
        </View>

        <View className="mt-4 pt-1 flex-row items-center justify-between gap-2 border-t border-border/60">
          <View className="flex-row items-center gap-1.5 shrink">
            <Icon name="sports_soccer" size={16} className="text-secondary" />
            <Text className="text-[12px] text-on-surface-variant" numberOfLines={1}>
              {match.referee ? t('match.referee', { name: match.referee }) : t('match.noReferee')}
            </Text>
          </View>
          <View className="flex-row items-center gap-1 shrink">
            <Icon
              name="videocam"
              size={16}
              className={match.recordingBy ? 'text-primary' : 'text-outline'}
            />
            <Text
              font="grotesk"
              className={`text-[11px] ${match.recordingBy ? 'text-primary' : 'text-outline'}`}
              numberOfLines={1}
            >
              {match.recordingBy
                ? t('match.recordingOn', { name: match.recordingBy })
                : t('match.recordingOff')}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
