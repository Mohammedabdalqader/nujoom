import { initials } from '@nujoom/shared';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Me, MyRank } from '@/data/types';
import { sfx } from '@/design/sound';
import { useLocale } from '@/lib/locale';
import { shareToWhatsApp } from '@/lib/share';
import { Avatar } from '@/ui/Avatar';
import { Icon } from '@/ui/Icon';
import { RichText } from '@/ui/RichText';
import { CHROME_HEIGHT } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { useToast } from '@/ui/Toast';

/** The floating "أنت هنا" bar above the tab bar: the player's own rank, weekly move and Elo. */
export function MyRankBar({ me, rank }: { me: Me; rank: MyRank }) {
  const { t, pick, number } = useLocale();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const share = async () => {
    sfx.success();
    if (rank.rank === null) return;
    const text = t('rankings.shareText', {
      app: t('app.name'),
      elo: number(rank.elo),
      rank: rank.rank,
      scope: pick(rank.scopeName),
      url: `https://nujoom.app/u/${me.id}`,
    });
    if ((await shareToWhatsApp(text)) === 'copied') toast.show(t('common.copied'));
  };

  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-0 px-3 pb-2"
      style={{ bottom: Math.max(insets.bottom, 16) + CHROME_HEIGHT }}
    >
      <View className="w-full max-w-lg self-center bg-surface-container-highest rounded-2xl p-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.6)] flex-row items-center justify-between border border-primary/30">
        <View className="flex-row items-center gap-2.5 flex-1 min-w-0">
          <View className="p-0.5 rounded-full bg-primary/20">
            <Avatar uri={me.avatarUrl} initials={initials(me.name)} size="w-10 h-10" />
            <View className="absolute bottom-0 start-0 w-3 h-3 rounded-full bg-secondary border border-surface" />
          </View>
          <View className="flex-1 min-w-0">
            <View className="flex-row items-center gap-1.5">
              <Text font="grotesk" className="text-[11px] text-primary font-black uppercase">
                {t('rankings.youAreHere')}
              </Text>
              <Text
                font="rubik"
                className="text-[16px] text-on-surface font-bold shrink"
                numberOfLines={1}
              >
                {me.name}
              </Text>
            </View>
            {rank.rank !== null ? (
              <View className="flex-row items-center gap-1.5 flex-wrap">
                <RichText
                  className="text-[12px] text-on-surface-variant"
                  boldClassName="text-primary font-bold"
                >
                  {t('rankings.myRank', { rank: rank.rank, scope: pick(rank.scopeName) })}
                </RichText>
                {rank.weeklyChange !== 0 ? (
                  <View className="flex-row items-center">
                    <Icon
                      name={rank.weeklyChange > 0 ? 'arrow_upward' : 'arrow_drop_down'}
                      size={14}
                      className={rank.weeklyChange > 0 ? 'text-secondary' : 'text-error'}
                    />
                    <Text
                      className={`text-[12px] font-bold ${rank.weeklyChange > 0 ? 'text-secondary' : 'text-error'}`}
                    >
                      {t('rankings.thisWeek', {
                        value: `${rank.weeklyChange > 0 ? '+' : ''}${rank.weeklyChange}`,
                      })}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <Text className="text-[12px] text-on-surface-variant">
                {t('rankings.notRankedYet', { count: rank.matchesToQualify })}
              </Text>
            )}
          </View>
        </View>
        <View className="flex-row items-center gap-1">
          <View className="items-end pe-2">
            <Text font="grotesk" className="text-[16px] text-primary font-black">
              {number(rank.elo)}
            </Text>
            <Text font="grotesk" className="text-[10px] text-on-surface-variant">
              {t('rankings.myRating')}
            </Text>
          </View>
          {rank.rank !== null ? (
            <Pressable
              onPress={share}
              accessibilityRole="button"
              accessibilityLabel={t('common.share')}
              className="h-10 px-3 rounded-xl bg-primary active:bg-primary-container items-center justify-center shadow-md"
            >
              <Icon name="share" size={18} className="text-on-primary" />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}
