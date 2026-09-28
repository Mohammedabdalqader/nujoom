import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import type { MatchDay, MatchEvent } from '@/data/types';
import { useLocale } from '@/lib/locale';
import { Icon } from '@/ui/Icon';
import { SectionHeader } from '@/ui/SectionHeader';
import { Text } from '@/ui/Text';

const ACCENT = {
  goal: {
    bar: 'bg-primary',
    tile: 'bg-primary-container/20',
    text: 'text-primary',
    card: 'bg-surface-container border-border',
  },
  save: {
    bar: 'bg-secondary',
    tile: 'bg-secondary-container/20',
    text: 'text-secondary',
    card: 'bg-surface-container-low border-border/60',
  },
  sub: {
    bar: 'bg-outline-variant',
    tile: 'bg-surface-container',
    text: 'text-on-surface',
    card: 'bg-surface-container-low border-border/60',
  },
} as const;

function EventRow({ event, match }: { event: MatchEvent; match: MatchDay }) {
  const { t } = useLocale();
  const router = useRouter();
  const accent = ACCENT[event.kind];
  const team = match.teams.find((tm) => tm.side === event.team)!;

  let title: string;
  let body: string;
  let tag: string;
  if (event.kind === 'goal') {
    title = event.note
      ? t('match.timeline.goalNote', { note: event.note })
      : t('match.timeline.goal');
    body = event.assist
      ? t('match.timeline.assist', { scorer: event.scorer, assist: event.assist })
      : event.scorer;
    tag = team.name;
  } else if (event.kind === 'save') {
    title = t('match.timeline.save');
    body = event.note
      ? t('match.timeline.saveBody', { keeper: event.keeper, note: event.note })
      : t('match.timeline.saveBodyPlain', { keeper: event.keeper });
    tag = t('match.timeline.keeperOf', { team: t(`kitsShort.${team.kit}`) });
  } else {
    title = t('match.timeline.sub');
    body = t('match.timeline.subBody', { in: event.playerIn, out: event.playerOut });
    tag = team.name;
  }

  return (
    <View
      className={`flex-row items-start gap-3 p-3 rounded-xl shadow-sm overflow-hidden border ${accent.card}`}
    >
      <View className={`absolute start-0 top-0 bottom-0 w-1 ${accent.bar}`} />
      <View className={`w-10 h-10 rounded-lg items-center justify-center ${accent.tile}`}>
        <Text
          font="grotesk"
          className={`text-[16px] font-bold ${event.kind === 'sub' ? 'text-on-surface-variant' : accent.text}`}
        >
          {`${event.minute}'`}
        </Text>
      </View>
      <View className="flex-1 min-w-0">
        <View className="flex-row items-center justify-between gap-1">
          <Text
            font="rubik"
            className={`text-[14px] font-bold shrink ${accent.text}`}
            numberOfLines={1}
          >
            {title}
          </Text>
          <View
            className={`px-1.5 py-0.5 rounded ${event.kind === 'sub' ? 'bg-surface-container' : 'bg-surface-container-high'}`}
          >
            <Text
              font="grotesk"
              className={`text-[11px] ${event.kind === 'goal' && event.team === 'A' ? 'text-secondary' : 'text-on-surface-variant'}`}
            >
              {tag}
            </Text>
          </View>
        </View>
        <Text
          className={`text-[12px] mt-0.5 ${
            event.kind === 'sub'
              ? 'text-on-surface-variant'
              : event.kind === 'goal'
                ? 'text-on-surface font-bold'
                : 'text-on-surface'
          }`}
        >
          {body}
        </Text>
        {event.kind === 'goal' && event.clip ? (
          <View className="mt-2 flex-row items-center gap-2">
            <Pressable
              onPress={() =>
                router.push({ pathname: '/clip/[id]', params: { id: event.clip!.id } })
              }
              className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container-highest active:bg-surface-bright active:scale-95 shadow"
            >
              <Icon name="play_circle" size={16} className="text-primary" />
              <Text className="text-[12px] text-on-surface">
                {t('match.timeline.watch', {
                  duration: `0:${String(event.clip.durationSec).padStart(2, '0')}`,
                })}
              </Text>
            </Pressable>
            <View className="flex-row items-center gap-1">
              <Icon name="local_fire_department" size={14} className="text-error" />
              <Text font="grotesk" className="text-[11px] text-on-surface-variant">
                {t('match.timeline.reactions', { count: event.clip.likes })}
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** "مجريات المباراة المباشرة": goals (with their clips), saves and substitutions, newest first. */
export function Timeline({ match }: { match: MatchDay }) {
  const { t } = useLocale();
  return (
    <View className="gap-2">
      <SectionHeader
        icon="reorder"
        title={t('match.timeline.title')}
        trailing={
          <View className="bg-surface-container px-2 py-0.5 rounded-full border border-border">
            <Text font="grotesk" className="text-[11px] text-on-surface-variant">
              {t('match.timeline.live')}
            </Text>
          </View>
        }
      />
      {match.events.length ? (
        [...match.events]
          .sort((a, b) => b.minute - a.minute)
          .map((event) => <EventRow key={event.id} event={event} match={match} />)
      ) : (
        <Text className="text-[12px] text-on-surface-variant">{t('match.timeline.empty')}</Text>
      )}
    </View>
  );
}
