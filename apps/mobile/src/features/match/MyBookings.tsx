import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { useMyBookings } from '@/data/api';
import { upcomingBookings } from '@/data/booking';
import { localizedName } from '@/data/catalog';
import { useTheme } from '@/design/theme';
import { useLocale } from '@/lib/locale';
import { useNow } from '@/lib/useNow';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';

/**
 * The player's upcoming bookings on the Match tab when there's no match today (D-090): the ones
 * they organize and the ones they joined, soonest first. A cancelled one stays, marked, so a
 * venue's cancellation isn't missed. Tapping one opens its details. Nothing booked: the card
 * above already says how to book.
 */
export function MyBookings() {
  const { t, locale, day, date, time } = useLocale();
  const { color } = useTheme();
  const router = useRouter();
  const now = useNow(60_000);
  const query = useMyBookings();

  if (query.isPending) return <ActivityIndicator color={color('primary')} />;
  if (query.isError) {
    return (
      <View className="items-center gap-2">
        <Text className="text-[13px] text-on-surface-variant">{t('match.upcoming.loadError')}</Text>
        <Pressable
          onPress={() => void query.refetch()}
          accessibilityRole="button"
          className="px-3 py-1.5 rounded-lg bg-surface-container-high active:bg-surface-container-highest"
        >
          <Text font="rubik" className="text-[13px] text-primary font-bold">
            {t('errors.retry')}
          </Text>
        </Pressable>
      </View>
    );
  }
  const list = upcomingBookings(query.data, now);
  if (list.length === 0) return null;

  return (
    <View className="gap-2">
      <Text font="rubik" className="text-[15px] text-on-surface font-bold">
        {t('match.upcoming.title')}
      </Text>
      {list.map((b) => {
        const cancelled = b.status === 'cancelled';
        const title = [localizedName(b.venue, locale), localizedName(b.field, locale)]
          .filter(Boolean)
          .join(' · ');
        return (
          <Pressable
            key={b.id}
            onPress={() => router.push({ pathname: '/match-details/[id]', params: { id: b.id } })}
            accessibilityRole="button"
            className={`flex-row items-center gap-3 rounded-xl border p-3 active:bg-surface-container-high ${
              cancelled ? 'border-error/40 opacity-70' : 'border-border bg-surface-container-low'
            }`}
          >
            <View className="w-10 h-10 rounded-lg bg-surface-container-high items-center justify-center">
              <Icon
                name={cancelled ? 'cancel' : 'stadium'}
                size={22}
                className={cancelled ? 'text-error' : 'text-secondary'}
              />
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="text-[14px] text-on-surface font-bold" numberOfLines={1}>
                {title}
              </Text>
              <Text className="text-[12px] text-on-surface-variant">
                {t('catalog.booking.when', {
                  day: day(b.startsAt),
                  date: date(b.startsAt),
                  from: time(b.startsAt),
                  to: time(b.endsAt),
                })}
              </Text>
              {cancelled || b.isOrganizer ? (
                <Text
                  font="grotesk"
                  className={`text-[11px] font-bold ${cancelled ? 'text-error' : 'text-primary'}`}
                >
                  {cancelled ? t('match.upcoming.cancelled') : t('match.upcoming.organizer')}
                </Text>
              ) : null}
            </View>
            <Icon name="chevron_left" size={20} directional className="text-on-surface-variant" />
          </Pressable>
        );
      })}
    </View>
  );
}
