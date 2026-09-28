import { formatRelativeTime, initials } from '@nujoom/shared';
import type { TFunction } from 'i18next';
import { Pressable, View } from 'react-native';

import type { MatchDay, MvpCandidate } from '@/data/types';
import { sfx } from '@/design/sound';
import { minutesLeft, voteBlocker, voteShare } from '@/features/match/rules';
import { useLocale } from '@/lib/locale';
import { useNow } from '@/lib/useNow';
import { Avatar } from '@/ui/Avatar';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { useToast } from '@/ui/Toast';

function statLine(c: MvpCandidate, t: TFunction): { text: string; color: string } {
  if (c.goals) return { text: t('match.mvp.goals', { count: c.goals }), color: 'text-primary' };
  if (c.assists)
    return { text: t('match.mvp.assists', { count: c.assists }), color: 'text-secondary' };
  return { text: t('match.mvp.saves', { count: c.saves }), color: 'text-tertiary' };
}

const BAR = ['bg-primary', 'bg-secondary', 'bg-outline'];

/**
 * "تصويت نجم الحارة": the match's top performers. While the match is live it previews the
 * candidates and offers a reminder; once voting opens a tap casts the vote; vote shares appear
 * only after voting closes, so the tally never sways the vote (spec §6.10).
 */
export function MvpCard({
  match,
  meId,
  onVote,
  onNotify,
}: {
  match: MatchDay;
  meId: string;
  onVote: (playerId: string) => void;
  onNotify: () => void;
}) {
  const { t, locale } = useLocale();
  const toast = useToast();
  const now = useNow(30_000);

  const subtitle =
    match.phase === 'voting'
      ? t('match.mvp.votingOpen')
      : match.phase === 'closed'
        ? t('match.mvp.closed')
        : t('match.mvp.opensAtWhistle');

  const chip =
    match.phase === 'voting' && match.votingClosesAt
      ? t('match.mvp.closesIn', { relative: formatRelativeTime(match.votingClosesAt, locale) })
      : match.phase === 'live'
        ? t('match.mvp.remaining', { minutes: minutesLeft(match, now) })
        : null;

  const vote = (playerId: string) => {
    const blocker = voteBlocker(match, meId, playerId);
    if (blocker === 'notOpen' || blocker === 'alreadyVoted') return;
    if (blocker) {
      toast.show(t(blocker === 'self' ? 'match.mvp.cantVoteSelf' : 'match.mvp.needCheckin'));
      return;
    }
    sfx.success();
    onVote(playerId);
    toast.show(t('match.mvp.voted'));
  };

  return (
    <View className="rounded-2xl bg-surface-container-high p-4 shadow-xl overflow-hidden border border-primary/20">
      <View className="absolute -top-10 -end-10 w-36 h-36 bg-primary-container/20 rounded-full blur-3xl" />
      <View className="flex-row items-center justify-between mb-2 gap-2">
        <View className="flex-row items-center gap-2 flex-1">
          <View className="w-8 h-8 rounded-full bg-primary-container/25 items-center justify-center shadow">
            <Icon name="workspace_premium" size={20} className="text-primary" />
          </View>
          <View className="flex-1">
            <Text font="rubik" className="text-[18px] leading-[24px] text-primary font-bold">
              {t('match.mvp.title')}
            </Text>
            <Text className="text-[11px] text-on-surface-variant">{subtitle}</Text>
          </View>
        </View>
        {chip ? (
          <View className="px-2.5 py-1 rounded-full bg-primary-container shadow-sm">
            <Text font="grotesk" className="text-[11px] text-on-primary font-bold">
              {chip}
            </Text>
          </View>
        ) : null}
      </View>

      <View className="flex-row gap-2 my-3">
        {match.candidates.map((c, index) => {
          const share = voteShare(match, c.player.id);
          const mine = match.myVote === c.player.id;
          const stat = statLine(c, t);
          return (
            <Pressable
              key={c.player.id}
              onPress={() => vote(c.player.id)}
              disabled={match.phase !== 'voting'}
              accessibilityState={{ selected: mine }}
              className={`flex-1 items-center p-2 rounded-xl shadow-sm border ${
                mine
                  ? 'bg-surface-bright border-primary scale-105'
                  : 'bg-surface-container border-surface-container-highest active:bg-surface-container-highest'
              }`}
            >
              <View className="mb-1">
                <Avatar
                  uri={c.player.avatarUrl}
                  initials={initials(c.player.name)}
                  size="w-14 h-14"
                  textClassName="text-[14px] text-on-surface"
                />
                <View className="absolute -top-1 -start-1 w-4 h-4 rounded-full items-center justify-center bg-primary">
                  <Text
                    font="grotesk"
                    className="text-[11px] leading-[13px] font-bold text-on-primary"
                  >
                    {index + 1}
                  </Text>
                </View>
              </View>
              <Text
                font="rubik"
                className="text-[12px] text-on-surface font-bold w-full text-center"
                numberOfLines={1}
              >
                {c.player.name}
              </Text>
              <Text font="grotesk" className={`text-[11px] mt-0.5 ${stat.color}`}>
                {c.form !== null
                  ? t('match.mvp.stats', { stat: stat.text, form: c.form.toFixed(1) })
                  : stat.text}
              </Text>
              <View className="w-full bg-surface rounded-full h-1.5 mt-1.5 overflow-hidden">
                {share !== null ? (
                  <View
                    className={`h-full rounded-full ${BAR[index] ?? 'bg-outline'}`}
                    style={{ width: `${share}%` }}
                  />
                ) : null}
              </View>
              <Text font="grotesk" className="text-[10px] text-on-surface-variant mt-0.5">
                {share !== null
                  ? t('match.mvp.votes', { percent: share })
                  : mine
                    ? t('match.mvp.voted')
                    : '—'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {match.phase === 'live' || match.phase === 'upcoming' ? (
        <Pressable
          onPress={() => {
            sfx.success();
            onNotify();
            toast.show(t('match.mvp.notifySet'));
          }}
          className="w-full py-2.5 mt-1 rounded-xl bg-surface-container active:bg-surface-bright flex-row items-center justify-center gap-2 active:scale-95 shadow-md border border-surface-container-highest"
        >
          <Icon name="how_to_vote" size={18} className="text-primary" />
          <Text font="rubik" className="text-[14px] text-on-surface">
            {t('match.mvp.notifyMe')}
          </Text>
        </Pressable>
      ) : match.phase === 'voting' && !match.myVote ? (
        <Text className="text-[11px] text-on-surface-variant text-center">
          {t('match.mvp.hiddenUntilClose')}
        </Text>
      ) : null}
    </View>
  );
}
