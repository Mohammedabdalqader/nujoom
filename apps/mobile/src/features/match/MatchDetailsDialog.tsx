import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { useMatchDetails } from '@/data/api';
import type { LineupPlayer, MatchDetails, Team } from '@/data/types';
import { sfx } from '@/design/sound';
import { useLocale } from '@/lib/locale';
import { shareToWhatsApp } from '@/lib/share';
import { describeKickoff } from '@/lib/when';
import { Dialog, DialogLoading } from '@/ui/Dialog';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { useToast } from '@/ui/Toast';

/**
 * "تشكيلة وتفاصيل المباراة": both line-ups with bibs and form, the pitch, time, size and who
 * films it (or that it isn't filmed). Players not in a team yet are listed below the line-ups.
 * Only the booking's players can open it (booking_details). Sharing needs the join link.
 */
export function MatchDetailsDialog({ bookingId }: { bookingId: string }) {
  const query = useMatchDetails(bookingId);
  if (query.isPending) return <DialogLoading />;
  if (!query.data) return <NotFound />;
  return <Details match={query.data} />;
}

function Header() {
  const { t } = useLocale();
  const router = useRouter();
  return (
    <View className="flex-row items-center justify-between border-b border-surface-container-high pb-3">
      <View className="flex-row items-center gap-2 flex-1">
        <Icon name="sports_soccer" size={22} className="text-primary" />
        <Text font="rubik" className="text-[18px] text-on-surface font-bold shrink">
          {t('matchDetails.title')}
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

function NotFound() {
  const { t } = useLocale();
  return (
    <Dialog width="md">
      <Header />
      <Text className="py-6 text-center text-[13px] text-on-surface-variant">
        {t('matchDetails.notFound')}
      </Text>
    </Dialog>
  );
}

function Details({ match }: { match: MatchDetails }) {
  const { t, locale, pick, number } = useLocale();
  const toast = useToast();
  const [teamA, teamB] = match.teams;
  const when = describeKickoff(match.startsAt, locale, t);
  const minutes = Math.round(
    (new Date(match.endsAt).getTime() - new Date(match.startsAt).getTime()) / 60_000,
  );
  const nameOf = (p: LineupPlayer) =>
    p.captain ? t('matchDetails.captain', { name: p.name }) : p.name;

  const share = async () => {
    sfx.success();
    const list = (players: LineupPlayer[]) =>
      players.map((p) => `${p.bib ?? '-'}. ${nameOf(p)}`).join('\n');
    const text = t('matchDetails.shareText', {
      when,
      teamA: teamA.name,
      teamB: teamB.name,
      pitch: pick(match.pitchName),
      listA: list(match.lineups[0]),
      listB: list(match.lineups[1]),
      app: t('app.name'),
      url: match.shareUrl,
    });
    if ((await shareToWhatsApp(text)) === 'copied') toast.show(t('common.copied'));
  };

  return (
    <Dialog
      width="md"
      scroll
      className="bg-surface-container border border-primary/40 p-4 max-h-[90%]"
    >
      <Header />

      <View className="bg-surface-container-low p-3 rounded-xl border border-surface-container-high items-center gap-2">
        <Text font="grotesk" className="text-[11px] text-secondary font-bold text-center">
          {t('matchDetails.meta', { pitch: pick(match.pitchName), when })}
        </Text>
        <View className="flex-row items-center justify-center gap-3">
          <Text font="rubik" className="text-[16px] text-primary font-black shrink text-center">
            {teamA.name}
          </Text>
          <Text className="text-on-surface-variant font-bold">VS</Text>
          <Text font="rubik" className="text-[16px] text-secondary font-black shrink text-center">
            {teamB.name}
          </Text>
        </View>
        <View className="flex-row flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-1">
          <Text className="text-[12px] text-on-surface-variant">
            {t('matchDetails.size', { value: number(match.size) })}
          </Text>
          <Text className="text-[12px] text-on-surface-variant">•</Text>
          <Text className="text-[12px] text-on-surface-variant">
            {t('matchDetails.duration', { value: number(minutes) })}
          </Text>
        </View>
        <Text className="text-[12px] text-on-surface-variant">
          {!match.recorded
            ? t('matchDetails.unrecorded')
            : match.recordingBy
              ? t('matchDetails.recordedBy', { name: match.recordingBy })
              : t('matchDetails.notRecorded')}
        </Text>
      </View>

      <View className="flex-row gap-2 items-start">
        <Lineup team={teamA} players={match.lineups[0]} nameOf={nameOf} />
        <Lineup team={teamB} players={match.lineups[1]} nameOf={nameOf} />
      </View>

      {match.unassigned.length ? (
        <View className="bg-surface-container-low p-3 rounded-xl border border-surface-container-high gap-1">
          <Text font="rubik" className="text-[13px] text-on-surface font-bold">
            {t('matchDetails.unassigned')}
          </Text>
          <Text className="text-[12px] text-on-surface-variant">
            {match.unassigned.map(nameOf).join('، ')}
          </Text>
        </View>
      ) : null}

      {match.shareUrl ? (
        <Pressable
          onPress={() => void share()}
          className="w-full py-3 rounded-xl bg-secondary-container active:bg-emerald flex-row items-center justify-center gap-2 shadow-lg"
        >
          <Icon name="share" size={20} className="text-on-secondary-container" />
          <Text font="rubik" className="text-[16px] text-on-secondary-container font-bold">
            {t('matchDetails.share')}
          </Text>
        </Pressable>
      ) : null}
    </Dialog>
  );
}

function Lineup({
  team,
  players,
  nameOf,
}: {
  team: Team;
  players: LineupPlayer[];
  nameOf: (p: LineupPlayer) => string;
}) {
  const { t } = useLocale();
  const blue = team.kit === 'blue';
  return (
    <View
      className={`flex-1 bg-surface-container-low p-3 rounded-xl border ${
        blue ? 'border-team-blue/30' : 'border-primary-container/30'
      }`}
    >
      <View className="flex-row items-center gap-1.5 mb-2 pb-1 border-b border-surface-container-high">
        <View
          className={`w-2.5 h-2.5 rounded-full ${blue ? 'bg-team-blue' : 'bg-primary-container'}`}
        />
        <Text font="rubik" className="text-[14px] text-on-surface font-bold shrink">
          {t('matchDetails.team', { name: team.name, kit: t(`matchDetails.kit.${team.kit}`) })}
        </Text>
      </View>
      <View className="gap-1.5">
        {players.map((p) => (
          <View key={p.id} className="flex-row items-center justify-between gap-1">
            <Text className="text-[11px] text-on-surface font-medium shrink" numberOfLines={1}>
              {nameOf(p)}
            </Text>
            {p.form !== null ? (
              <Text
                font="grotesk"
                className={`text-[11px] font-bold ${blue ? 'text-primary' : 'text-secondary'}`}
              >
                {p.form.toFixed(1)}
              </Text>
            ) : null}
          </View>
        ))}
        {players.length === 0 ? (
          <Text className="text-[11px] text-muted">{t('matchDetails.empty')}</Text>
        ) : null}
      </View>
    </View>
  );
}
