import { useRouter, type Href } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { keys, useCache, useNotifications } from '@/data/api';
import type { AppNotification, NotificationType } from '@/data/types';
import { sfx } from '@/design/sound';
import { useLocale } from '@/lib/locale';
import { Dialog } from '@/ui/Dialog';
import { Icon, type IconName } from '@/ui/Icon';
import { PingDot } from '@/ui/PingDot';
import { Text } from '@/ui/Text';
import { useToast } from '@/ui/Toast';

const ICONS: Record<NotificationType, IconName> = {
  invited: 'group_add',
  friend_request: 'person_add',
  booking_reminder: 'sports_soccer',
  checkin_open: 'qr_code_scanner',
  clips_ready: 'video_library',
  voting_open: 'how_to_vote',
  mvp_result: 'emoji_events',
  missing_one_nearby: 'person_add',
  rating_updated: 'military_tech',
  weekly_ranking: 'leaderboard',
};

/**
 * "التنبيهات والإشعارات": the prototype's notification drawer. Tapping an item marks it read and
 * opens where it points. The prototype's "test notification" button became a shortcut to the
 * per-type notification switches in settings (spec §6.11).
 */
export function NotificationsDialog() {
  const { t } = useLocale();
  const router = useRouter();
  const toast = useToast();
  const cache = useCache();
  const items = useNotifications().data ?? [];
  const unread = items.filter((n) => n.unread).length;

  const markRead = (id?: string) =>
    cache.update<AppNotification[]>(keys.notifications, (list) =>
      list.map((n) => (id === undefined || n.id === id ? { ...n, unread: false } : n)),
    );

  return (
    <Dialog className="bg-surface-container border border-primary/40 p-4 gap-3 max-h-[85%]">
      <View className="flex-row items-center justify-between border-b border-surface-container-high pb-3">
        <View className="flex-row items-center gap-2 flex-1">
          <Icon name="notifications" size={22} className="text-primary" />
          <Text font="rubik" className="text-[18px] text-on-surface font-bold shrink">
            {t('notifications.title')}
          </Text>
          {unread > 0 ? (
            <View className="flex-row items-center gap-1 bg-live/20 border border-live/40 px-2 py-0.5 rounded-full">
              <PingDot color="bg-live" size="w-1.5 h-1.5" />
              <Text font="grotesk" className="text-[10px] text-error font-bold">
                {t('notifications.newCount', { value: unread })}
              </Text>
            </View>
          ) : (
            <View className="bg-surface-container-high px-2 py-0.5 rounded-full">
              <Text font="grotesk" className="text-[10px] text-on-surface-variant">
                {t('notifications.allRead')}
              </Text>
            </View>
          )}
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

      <View className="flex-row items-center justify-between gap-2">
        <Pressable
          disabled={unread === 0}
          onPress={() => {
            sfx.clipBeep();
            markRead();
            toast.show(t('notifications.markedAll'));
          }}
          className="flex-row items-center gap-1"
        >
          <Icon
            name="done_all"
            size={16}
            className={unread > 0 ? 'text-primary' : 'text-on-surface-variant/50'}
          />
          <Text
            className={`text-[12px] ${unread > 0 ? 'text-primary font-bold' : 'text-on-surface-variant/50'}`}
          >
            {t('notifications.markAll')}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            sfx.clipBeep();
            router.back();
            router.push('/settings');
          }}
          className="flex-row items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary-container/15 active:bg-secondary-container/25 border border-secondary-container/30"
        >
          <Icon name="tune" size={14} className="text-secondary" />
          <Text font="grotesk" className="text-[11px] text-secondary font-bold">
            {t('notifications.settings')}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        className="shrink"
        contentContainerClassName="gap-2 py-1"
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? (
          <Text className="py-8 text-center text-[13px] text-on-surface-variant">
            {t('notifications.empty')}
          </Text>
        ) : (
          items.map((n) => (
            <NotificationRow
              key={n.id}
              item={n}
              onPress={() => {
                sfx.clipBeep();
                markRead(n.id);
                router.back();
                router.navigate(n.href as Href);
              }}
            />
          ))
        )}
      </ScrollView>
    </Dialog>
  );
}

function NotificationRow({ item, onPress }: { item: AppNotification; onPress: () => void }) {
  const { t, time, ago } = useLocale();
  const { params } = item;
  const values = {
    ...params,
    time: typeof params.time === 'string' ? time(params.time) : params.time,
    relative: typeof params.startsAt === 'string' ? ago(params.startsAt) : '',
    position: params.position ? t(`positions.${params.position}`) : '',
  };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className={`p-3 rounded-xl flex-row items-start gap-3 border ${
        item.unread
          ? 'bg-surface-container-high border-live/40 active:bg-surface-container-highest shadow-sm'
          : 'bg-surface-container-low border-surface-container-high active:bg-surface-container-high opacity-80'
      }`}
    >
      <View
        className={`w-9 h-9 rounded-lg items-center justify-center mt-0.5 ${
          item.unread ? 'bg-live/20' : 'bg-surface-container-highest'
        }`}
      >
        <Icon
          name={ICONS[item.type]}
          size={20}
          className={item.unread ? 'text-error' : 'text-on-surface-variant'}
        />
      </View>
      <View className="flex-1 min-w-0">
        <View className="flex-row items-center justify-between gap-2">
          <Text
            font="rubik"
            className="text-[14px] text-on-surface font-bold shrink"
            numberOfLines={1}
          >
            {t(`notifications.types.${item.type}.title`)}
          </Text>
          {item.unread ? (
            <View className="flex-row items-center gap-1">
              <View className="w-2 h-2 rounded-full bg-live animate-pulse" />
              <Text font="grotesk" className="text-[9px] text-live font-bold uppercase">
                {t('notifications.new')}
              </Text>
            </View>
          ) : null}
        </View>
        <Text className="text-[12px] text-on-surface-variant mt-0.5" numberOfLines={2}>
          {t(`notifications.types.${item.type}.body`, values)}
        </Text>
        <Text font="grotesk" className="text-[10px] text-primary mt-1 font-medium">
          {ago(item.createdAt)}
        </Text>
      </View>
    </Pressable>
  );
}
