import { View } from 'react-native';

import type { EndorsementBadge, EndorsementSummary } from '@/data/types';
import { useLocale } from '@/lib/locale';
import { SectionHeader } from '@/ui/SectionHeader';
import { Text } from '@/ui/Text';

const BADGE_EMOJI: Record<EndorsementBadge, string> = {
  finisher: '🎯',
  playmaker: '🪄',
  wall: '🧱',
  safe_hands: '🧤',
  leader: '©️',
  sportsman: '🤝',
};

/**
 * "شهادات الهيبة الكروية": fixed respect badges given by teammates after a match, with how many
 * times each was given. No free-text testimonials (D-006.2, spec §7).
 */
export function EndorsementsSection({ items }: { items: EndorsementSummary[] }) {
  const { t } = useLocale();
  const total = items.reduce((n, e) => n + e.count, 0);
  const sorted = [...items].sort((a, b) => b.count - a.count);
  return (
    <View className="gap-3">
      <SectionHeader
        icon="thumb_up"
        iconSize={22}
        title={t('profile.endorsements.title')}
        trailing={
          <Text className="text-[12px] text-on-surface-variant">
            {t('profile.endorsements.count', { count: total })}
          </Text>
        }
      />
      {sorted.length ? (
        <View className="flex-row flex-wrap gap-2">
          {sorted.map((e, i) => (
            <View
              key={e.badge}
              className="w-[48.5%] rounded-xl bg-surface-container p-3 gap-1.5 border border-border"
            >
              <View className="flex-row items-center gap-2">
                <View className="w-7 h-7 rounded-full bg-surface-bright items-center justify-center">
                  <Text className="text-xs">{BADGE_EMOJI[e.badge]}</Text>
                </View>
                <View className="flex-1 min-w-0">
                  <View className="flex-row items-center justify-between">
                    <Text
                      className={`text-[12px] font-bold ${i % 2 ? 'text-secondary' : 'text-on-surface'}`}
                      numberOfLines={1}
                    >
                      {t(`profile.endorsements.badges.${e.badge}.name`)}
                    </Text>
                    <Text font="grotesk" className="text-[11px] text-primary font-bold">
                      {t('profile.endorsements.times', { count: e.count })}
                    </Text>
                  </View>
                  {e.lastFrom ? (
                    <Text
                      font="grotesk"
                      className="text-[9px] text-on-surface-variant"
                      numberOfLines={1}
                    >
                      {t('profile.endorsements.lastFrom', { name: e.lastFrom })}
                    </Text>
                  ) : null}
                </View>
              </View>
              <Text className="text-[11px] text-on-surface-variant mt-1" numberOfLines={2}>
                {t(`profile.endorsements.badges.${e.badge}.desc`)}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text className="text-[12px] text-on-surface-variant">
          {t('profile.endorsements.empty')}
        </Text>
      )}
    </View>
  );
}
