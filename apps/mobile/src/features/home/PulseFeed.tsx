import { View } from 'react-native';

import type { PulseItem } from '@/data/types';
import { useLocale } from '@/lib/locale';
import { RichText } from '@/ui/RichText';
import { SectionHeader } from '@/ui/SectionHeader';
import { Text } from '@/ui/Text';

function Row({
  emoji,
  emojiColor,
  title,
  badge,
  badgeClassName,
  body,
  boldClassName = 'text-primary font-bold',
}: {
  emoji: string;
  emojiColor: string;
  title: string;
  badge: string;
  badgeClassName: string;
  body: string;
  boldClassName?: string;
}) {
  return (
    <View className="bg-surface-container p-3 rounded-lg flex-row items-center gap-3">
      <View className="w-10 h-10 rounded-lg bg-surface-container-high items-center justify-center">
        <Text className={`text-sm font-black ${emojiColor}`}>{emoji}</Text>
      </View>
      <View className="flex-1 min-w-0">
        <View className="flex-row items-center justify-between gap-2">
          <Text
            font="rubik"
            className="text-[15px] text-on-surface font-bold shrink"
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text font="grotesk" className={`text-[11px] ${badgeClassName}`}>
            {badge}
          </Text>
        </View>
        <RichText
          className="text-[12px] text-on-surface-variant mt-0.5"
          boldClassName={boldClassName}
          numberOfLines={1}
        >
          {body}
        </RichText>
      </View>
    </View>
  );
}

/** "نبض الحارة والنتائج": recent results and moments around the player's city. */
export function PulseFeed({ items }: { items: PulseItem[] }) {
  const { t, pick, ago } = useLocale();
  if (!items.length) return null;
  return (
    <View className="px-4 gap-2">
      <SectionHeader
        icon="rss_feed"
        title={t('home.pulse.title')}
        trailing={
          <Text font="grotesk" className="text-[11px] text-on-surface-variant">
            {t('home.pulse.live')}
          </Text>
        }
      />
      <View className="bg-surface-container-low rounded-xl p-3 gap-2 border border-border/60">
        {items.map((item) => {
          switch (item.kind) {
            case 'result':
              return (
                <Row
                  key={item.id}
                  emoji="🏆"
                  emojiColor="text-primary"
                  title={t('home.pulse.resultTitle', {
                    hara: pick(item.hara),
                    opponent: pick(item.opponent),
                  })}
                  badge={t('home.pulse.resultBadge')}
                  badgeClassName="text-secondary font-bold"
                  body={t('home.pulse.resultBody', {
                    hara: pick(item.hara),
                    score: `${item.scoreFor} - ${item.scoreAgainst}`,
                  })}
                />
              );
            case 'hat_trick':
              return (
                <Row
                  key={item.id}
                  emoji="⚽"
                  emojiColor="text-secondary"
                  title={t('home.pulse.hatTrickTitle')}
                  badge={ago(item.at)}
                  badgeClassName="text-on-surface-variant"
                  boldClassName="text-on-surface font-semibold"
                  body={t('home.pulse.hatTrickBody', {
                    player: item.player,
                    form: item.form.toFixed(1),
                    against: pick(item.against),
                  })}
                />
              );
            case 'new_pitch':
              return (
                <Row
                  key={item.id}
                  emoji="⚡"
                  emojiColor="text-primary-fixed-dim"
                  title={t('home.pulse.newPitchTitle')}
                  badge={t('home.pulse.newPitchBadge')}
                  badgeClassName="text-primary font-bold"
                  body={t('home.pulse.newPitchBody', {
                    pitch: pick(item.pitchName),
                    hara: pick(item.hara),
                  })}
                />
              );
          }
        })}
      </View>
    </View>
  );
}
