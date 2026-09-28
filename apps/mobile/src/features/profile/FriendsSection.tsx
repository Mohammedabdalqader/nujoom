import { initials } from '@nujoom/shared';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { useHomeFeed } from '@/data/api';
import type { Friend } from '@/data/types';
import { sfx } from '@/design/sound';
import { useLocale } from '@/lib/locale';
import { Avatar } from '@/ui/Avatar';
import { Icon } from '@/ui/Icon';
import { SectionHeader } from '@/ui/SectionHeader';
import { Text } from '@/ui/Text';
import { useToast } from '@/ui/Toast';

const PRESENCE_DOT = {
  online: 'bg-secondary',
  in_match: 'bg-primary-container',
  offline: 'bg-outline',
} as const;

/** "شلة الحارة وقائمة الأصدقاء": presence counts, four friend cards with one-tap invites. */
export function FriendsSection({ friends }: { friends: Friend[] }) {
  const { t } = useLocale();
  const router = useRouter();
  const toast = useToast();
  const nextMatch = useHomeFeed().data?.nextMatch ?? null;
  const online = friends.filter((f) => f.presence === 'online').length;
  const inMatch = friends.filter((f) => f.presence === 'in_match').length;

  const invite = (friend: Friend) => {
    if (!nextMatch) {
      toast.show(t('profile.friends.noMatchToInvite'));
      return;
    }
    // R3: a structured in-app invite to the next booking (no free text, spec §7).
    sfx.success();
    toast.show(t('profile.friends.invited', { name: friend.name }));
  };

  const openFriends = () => {
    sfx.clipBeep();
    router.push('/friends');
  };

  return (
    <View className="gap-3">
      <SectionHeader
        icon="group"
        iconClassName="text-secondary"
        iconSize={22}
        title={t('profile.friends.title')}
        trailing={
          <Pressable onPress={openFriends} className="flex-row items-center gap-1" hitSlop={8}>
            <Text font="grotesk" className="text-[11px] text-primary font-bold">
              {t('profile.friends.manage', { count: friends.length })}
            </Text>
            <Icon name="arrow_back" size={14} directional className="text-primary" />
          </Pressable>
        }
      />

      <View className="rounded-xl bg-surface-container p-3.5 border border-border gap-3 shadow-md">
        <View className="flex-row items-center justify-between pb-2 border-b border-border/60">
          <View className="flex-row items-center gap-3">
            <View className="flex-row items-center gap-1">
              <View className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              <Text className="text-[12px] text-secondary font-bold">
                {t('profile.friends.online', { count: online })}
              </Text>
            </View>
            <Text className="text-[12px] text-primary font-bold">
              ⚽ {t('profile.friends.inMatch', { count: inMatch })}
            </Text>
          </View>
          <Text font="grotesk" className="text-[11px] text-on-surface-variant">
            {t('profile.friends.oneTap')}
          </Text>
        </View>

        {friends.length ? (
          <View className="flex-row flex-wrap gap-2">
            {friends.slice(0, 4).map((f) => (
              <View
                key={f.id}
                className="w-[48.5%] bg-surface-container-low p-2.5 rounded-xl border border-border"
              >
                <View className="flex-row items-center gap-2">
                  <View>
                    <Avatar uri={f.avatarUrl} initials={initials(f.name)} size="w-8 h-8" />
                    <View
                      className={`absolute bottom-0 start-0 w-2.5 h-2.5 rounded-full border border-surface ${PRESENCE_DOT[f.presence]}`}
                    />
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text
                      font="rubik"
                      className="text-[12px] font-bold text-on-surface"
                      numberOfLines={1}
                    >
                      {f.name}
                    </Text>
                    <Text font="grotesk" className="text-[10px] text-on-surface-variant">
                      {`${t(`positions.${f.position}`)} • ${f.form.toFixed(1)}`}
                    </Text>
                  </View>
                </View>
                <View className="mt-2.5 pt-1.5 border-t border-border/60 flex-row items-center justify-between">
                  <Text font="grotesk" className="text-[9px] text-primary font-bold">
                    {f.cardCode}
                  </Text>
                  <Pressable
                    onPress={() => invite(f)}
                    className="px-2 py-0.5 rounded-md bg-secondary-container active:bg-emerald active:scale-95 flex-row items-center gap-0.5"
                  >
                    <Icon
                      name="send"
                      size={12}
                      directional
                      className="text-on-secondary-container"
                    />
                    <Text
                      font="rubik"
                      className="text-[10px] text-on-secondary-container font-bold"
                    >
                      {t('profile.friends.invite')}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text className="text-[12px] text-on-surface-variant">{t('profile.friends.empty')}</Text>
        )}

        <Pressable
          onPress={openFriends}
          className="w-full py-2 rounded-lg bg-surface-container-high active:bg-surface-container-highest flex-row items-center justify-center gap-1.5 border border-surface-container-highest"
        >
          <Icon name="person_add" size={16} className="text-primary" />
          <Text font="rubik" className="text-[13px] text-on-surface font-bold">
            {t('profile.friends.open')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
