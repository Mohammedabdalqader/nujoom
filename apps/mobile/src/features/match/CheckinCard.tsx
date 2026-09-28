import { initials } from '@nujoom/shared';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import type { MatchDay } from '@/data/types';
import { sfx } from '@/design/sound';
import { checkinsRemaining } from '@/features/match/rules';
import { useLocale } from '@/lib/locale';
import { Avatar } from '@/ui/Avatar';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';

/** "تسجيل حضور المباراة": who has checked in, and the pitch-QR scan button (spec §6.7). */
export function CheckinCard({ match }: { match: MatchDay }) {
  const { t } = useLocale();
  const router = useRouter();
  const checkedIn = match.roster.filter((p) => match.checkedInIds.includes(p.id));
  const shown = checkedIn.slice(0, 4);
  const more = checkedIn.length - shown.length;
  const remaining = checkinsRemaining(match);

  return (
    <View className="rounded-xl bg-surface-container p-4 shadow-md overflow-hidden border border-border">
      <View className="absolute top-0 start-0 w-32 h-32 bg-secondary-container/10 rounded-full blur-2xl" />
      <View className="flex-row items-start justify-between gap-2">
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-1.5 mb-1">
            <Icon name="qr_code_scanner" size={20} className="text-secondary" />
            <Text font="rubik" className="text-[18px] text-on-surface font-bold">
              {t('match.checkin.title')}
            </Text>
          </View>
          <Text className="text-[12px] leading-[18px] text-on-surface-variant mb-3">
            {t('match.checkin.body')}
          </Text>
          <View className="flex-row items-center gap-2">
            <View className="flex-row items-center">
              {shown.map((p, i) => (
                <Avatar
                  key={p.id}
                  uri={p.avatarUrl}
                  initials={initials(p.name)}
                  size="w-8 h-8"
                  className={`border-2 border-surface-container ${i > 0 ? '-ms-2' : ''}`}
                />
              ))}
              {more > 0 ? (
                <View className="w-8 h-8 -ms-2 rounded-full bg-secondary-container items-center justify-center border-2 border-surface-container shadow-md">
                  <Text
                    font="grotesk"
                    className="text-[11px] text-on-secondary-container font-bold"
                  >
                    +{more}
                  </Text>
                </View>
              ) : null}
            </View>
            <View>
              <Text font="grotesk" className="text-[16px] leading-[18px] text-secondary font-bold">
                {t('match.checkin.count', {
                  checked: checkedIn.length,
                  total: match.roster.length,
                })}
              </Text>
              <Text className="text-[11px] text-on-surface-variant">
                {t('match.checkin.remaining', { count: remaining })}
              </Text>
            </View>
          </View>
        </View>

        <Pressable
          onPress={() => {
            sfx.clipBeep();
            router.push({ pathname: '/checkin', params: { bookingId: match.bookingId } });
          }}
          accessibilityRole="button"
          accessibilityLabel={t('match.checkin.pitchCode')}
          className="items-center justify-center p-3 rounded-lg bg-surface-container-high active:bg-surface-bright active:scale-95 shadow-md border border-surface-container-highest"
        >
          <View className="p-2 rounded bg-surface mb-1">
            <Icon name="qr_code_2" size={28} className="text-primary" />
          </View>
          <Text font="grotesk" className="text-[11px] text-primary font-bold">
            {t('match.checkin.pitchCode')}
          </Text>
        </Pressable>
      </View>

      {match.meCheckedIn ? (
        <View className="mt-3 p-2.5 rounded-lg bg-secondary-container flex-row items-center gap-2">
          <Icon name="verified" size={18} className="text-on-secondary-container" />
          <Text className="text-[12px] text-on-secondary-container font-bold">
            {t('match.checkin.youAreIn')}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
