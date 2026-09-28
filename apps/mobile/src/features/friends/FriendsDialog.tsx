import { initials, normalizeCardCode } from '@nujoom/shared';
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  findPlayerByCardCode,
  keys,
  useCache,
  useFriendRequests,
  useFriends,
  useFriendSuggestions,
  useMe,
} from '@/data/api';
import type { Friend, FriendRequest, FriendSuggestion } from '@/data/types';
import { sfx } from '@/design/sound';
import { useTheme } from '@/design/theme';
import { useLocale } from '@/lib/locale';
import { shareToWhatsApp } from '@/lib/share';
import { Avatar } from '@/ui/Avatar';
import { Dialog } from '@/ui/Dialog';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { useToast } from '@/ui/Toast';

import { filterFriends, presenceCounts, PRESENCE_DOT, type PresenceFilter } from './logic';
import { useInviteFriend } from './useInviteFriend';

const FILTERS: { key: PresenceFilter; active: string; activeText: string }[] = [
  { key: 'all', active: 'bg-surface-container-highest', activeText: 'text-on-surface' },
  { key: 'online', active: 'bg-secondary-container', activeText: 'text-on-secondary-container' },
  { key: 'in_match', active: 'bg-primary-container', activeText: 'text-on-primary' },
];

/**
 * "أصدقاء الحارة (الشلة)": the prototype's squad manager. Friends are added by card code and
 * become friends once they accept (the prototype added anyone by name). Suggestions and lookups
 * only ever surface players the viewer may see (D-023).
 */
export function FriendsDialog() {
  const { t, pick } = useLocale();
  const router = useRouter();
  const toast = useToast();
  const cache = useCache();
  const invite = useInviteFriend();
  const me = useMe().data;
  const friends = useFriends().data ?? [];
  const requests = useFriendRequests().data ?? [];
  const suggestions = useFriendSuggestions().data ?? [];

  const [filter, setFilter] = useState<PresenceFilter>('all');
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [sent, setSent] = useState<string[]>([]);

  const counts = presenceCounts(friends);
  const visible = filterFriends(friends, filter, query);

  const sendRequest = (player: FriendSuggestion) => {
    // R3: insert a pending friendship; the other player accepts from their notifications.
    sfx.success();
    setSent((ids) => [...ids, player.id]);
    toast.show(t('friends.requestSent', { name: player.name }));
  };

  const answer = (request: FriendRequest, accept: boolean) => {
    cache.update<FriendRequest[]>(keys.friendRequests, (list) =>
      list.filter((r) => r.id !== request.id),
    );
    if (accept) {
      sfx.success();
      const friend: Friend = {
        ...request.from,
        handle: null,
        presence: 'offline',
        inMatchAt: null,
        lastActiveAt: null,
      };
      cache.update<Friend[]>(keys.friends, (list) => [friend, ...list]);
      toast.show(t('friends.accepted', { name: request.from.name }));
    } else {
      sfx.clipBeep();
      toast.show(t('friends.declined'));
    }
  };

  return (
    <Dialog
      width="md"
      className="bg-surface-container border border-primary/40 p-4 gap-3.5 max-h-[88%]"
    >
      <View className="flex-row items-center justify-between border-b border-surface-container-high pb-3">
        <View className="flex-row items-center gap-2 flex-1">
          <Icon name="group" size={24} className="text-primary" />
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text font="rubik" className="text-[18px] text-on-surface font-bold shrink">
                {t('friends.title')}
              </Text>
              <View className="bg-primary-container px-2 rounded-full">
                <Text font="grotesk" className="text-[11px] text-on-primary font-black">
                  {t('common.players', { count: friends.length })}
                </Text>
              </View>
            </View>
            <Text className="text-[11px] text-on-surface-variant">{t('friends.sub')}</Text>
          </View>
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
        <View className="flex-row p-0.5 rounded-lg bg-surface-container-low border border-surface-container-high shrink">
          {FILTERS.map((f) => {
            const on = filter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                className={`px-2.5 py-1 rounded-md flex-row items-center gap-1 shrink ${on ? `${f.active} shadow-sm` : ''}`}
              >
                {f.key === 'online' ? (
                  <View className="w-1.5 h-1.5 rounded-full bg-secondary" />
                ) : f.key === 'in_match' ? (
                  <Text className="text-[10px]">⚽</Text>
                ) : null}
                <Text
                  font="rubik"
                  className={`text-[12px] font-bold text-center shrink ${on ? f.activeText : 'text-on-surface-variant'}`}
                >
                  {t(`friends.filters.${f.key}`, { value: counts[f.key] })}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          onPress={() => {
            sfx.clipBeep();
            setAdding((v) => !v);
          }}
          className="py-1 px-3 rounded-lg bg-primary-container active:bg-primary flex-row items-center gap-1 shadow-sm"
        >
          <Icon name={adding ? 'close' : 'person_add'} size={16} className="text-on-primary" />
          <Text font="rubik" className="text-[12px] text-on-primary font-bold">
            {adding ? t('friends.cancel') : t('friends.add')}
          </Text>
        </Pressable>
      </View>

      {adding ? (
        <AddByCode
          myCode={me?.cardCode ?? ''}
          friends={friends}
          onFound={(player) => {
            sendRequest(player);
            setAdding(false);
          }}
        />
      ) : null}

      <SearchBar value={query} onChange={setQuery} />

      <ScrollView
        className="shrink"
        contentContainerClassName="gap-2 py-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {requests.length ? (
          <View className="gap-2 pb-1">
            <Text font="grotesk" className="text-[11px] text-primary font-bold">
              {t('friends.requests')}
            </Text>
            {requests.map((r) => (
              <RequestRow key={r.id} request={r} onAnswer={(ok) => answer(r, ok)} />
            ))}
          </View>
        ) : null}

        {visible.length === 0 ? (
          <Text className="py-8 text-center text-[13px] text-on-surface-variant">
            {t('friends.noResults')}
          </Text>
        ) : (
          visible.map((f) => (
            <FriendRow
              key={f.id}
              friend={f}
              onInvite={() => invite(f)}
              onWhatsApp={() => {
                sfx.clipBeep();
                void shareToWhatsApp(
                  t('friends.whatsappText', { name: f.name, app: t('app.name') }),
                );
              }}
            />
          ))
        )}
      </ScrollView>

      {suggestions.length ? (
        <View className="pt-2 border-t border-surface-container-high gap-2">
          <View className="flex-row items-center gap-1">
            <Icon name="explore" size={14} className="text-primary" />
            <Text font="grotesk" className="text-[11px] text-primary font-bold">
              {t('friends.suggested', { city: me ? pick(me.city) : '' })}
            </Text>
          </View>
          <View className="flex-row gap-2">
            {suggestions.slice(0, 2).map((p) => (
              <SuggestionCard
                key={p.id}
                player={p}
                sent={sent.includes(p.id)}
                onAdd={() => sendRequest(p)}
              />
            ))}
          </View>
        </View>
      ) : null}
    </Dialog>
  );
}

function AddByCode({
  myCode,
  friends,
  onFound,
}: {
  myCode: string;
  friends: Friend[];
  onFound: (player: FriendSuggestion) => void;
}) {
  const { t } = useLocale();
  const { color } = useTheme();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const normalized = normalizeCardCode(code);
    if (!normalized) return setError(t('friends.badCode'));
    if (normalized === myCode) return setError(t('friends.ownCode'));
    const existing = friends.find((f) => f.cardCode === normalized);
    if (existing) return setError(t('friends.alreadyFriend', { name: existing.name }));
    setBusy(true);
    const player = await findPlayerByCardCode(normalized);
    setBusy(false);
    if (!player) return setError(t('friends.notFound'));
    setCode('');
    setError(null);
    onFound(player);
  };

  return (
    <View className="p-3 rounded-xl bg-surface-container-low border border-primary/40 gap-2.5">
      <View className="flex-row items-center gap-1 pb-1 border-b border-surface-container-high">
        <Icon name="qr_code_2" size={16} className="text-primary" />
        <Text font="rubik" className="text-[13px] font-bold text-primary">
          {t('friends.addTitle')}
        </Text>
      </View>
      <View className="flex-row items-center gap-2">
        <TextInput
          value={code}
          onChangeText={(v) => {
            setCode(v);
            setError(null);
          }}
          onSubmitEditing={() => void submit()}
          placeholder={t('friends.codePlaceholder')}
          placeholderTextColor={color('outline')}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="send"
          accessibilityLabel={t('friends.codePlaceholder')}
          className={`flex-1 bg-surface-container-lowest border rounded-lg px-2.5 py-1.5 text-[12px] text-on-surface ${
            error ? 'border-error' : 'border-surface-container-high focus:border-primary'
          }`}
          // Codes stay left-to-right inside Arabic forms, like the Field primitive's `ltr`.
          style={{ fontFamily: 'SpaceGrotesk_500Medium', writingDirection: 'ltr' }}
        />
        <Pressable
          disabled={busy}
          onPress={() => void submit()}
          className={`flex-1 py-1.5 rounded-lg bg-secondary-container active:bg-emerald items-center ${busy ? 'opacity-60' : ''}`}
        >
          <Text font="rubik" className="text-[13px] text-on-secondary-container font-bold">
            {t('friends.sendRequest')}
          </Text>
        </Pressable>
      </View>
      {error ? <Text className="text-[11px] text-error">{error}</Text> : null}
      {myCode ? (
        <View className="flex-row items-center justify-between">
          <Text font="grotesk" className="text-[11px] text-on-surface-variant">
            {t('friends.myCode', { code: myCode })}
          </Text>
          <Pressable
            onPress={() => {
              sfx.clipBeep();
              void shareToWhatsApp(t('friends.myCodeShare', { app: t('app.name'), code: myCode }));
            }}
            hitSlop={8}
            className="flex-row items-center gap-1"
          >
            <Icon name="share" size={14} className="text-secondary" />
            <Text font="grotesk" className="text-[11px] text-secondary font-bold">
              {t('friends.shareMyCode')}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useLocale();
  const { color } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View
      className={`flex-row items-center gap-2 bg-surface-container-low border rounded-xl px-3 ${
        focused ? 'border-primary' : 'border-surface-container-high'
      }`}
    >
      <Icon name="search" size={18} className="text-on-surface-variant" />
      <TextInput
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={t('friends.search')}
        placeholderTextColor={color('on-surface-variant')}
        accessibilityLabel={t('friends.search')}
        returnKeyType="search"
        className="flex-1 py-2 text-[12px] text-on-surface"
        style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
      />
    </View>
  );
}

function FriendRow({
  friend,
  onInvite,
  onWhatsApp,
}: {
  friend: Friend;
  onInvite: () => void;
  onWhatsApp: () => void;
}) {
  const { t, pick, number, ago } = useLocale();
  return (
    <View className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high flex-row items-center justify-between gap-2.5 shadow-sm">
      <View className="flex-row items-center gap-2.5 flex-1 min-w-0">
        <View className="w-12 h-12 rounded-full bg-surface-container-high p-0.5">
          <Avatar uri={friend.avatarUrl} initials={initials(friend.name)} size="w-full h-full" />
          <View
            className={`absolute bottom-0 start-0 w-3.5 h-3.5 rounded-full border-2 border-surface ${PRESENCE_DOT[friend.presence]}`}
          />
        </View>
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-1.5">
            <Text
              font="rubik"
              className="text-[14px] text-on-surface font-bold shrink"
              numberOfLines={1}
            >
              {friend.name}
            </Text>
            <Text font="grotesk" className="text-[11px] text-primary font-black">
              {number(friend.form)}
            </Text>
          </View>
          <Text className="text-[11px] text-on-surface-variant" numberOfLines={1}>
            {`${t(`positions.${friend.position}`)} • ${pick(friend.neighborhood)}`}
          </Text>
          <View className="flex-row items-center gap-1 mt-0.5">
            {friend.presence === 'online' ? (
              <>
                <View className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                <Text font="grotesk" className="text-[10px] text-secondary font-bold">
                  {t('friends.readyNow')}
                </Text>
              </>
            ) : friend.presence === 'in_match' ? (
              <Text font="grotesk" className="text-[10px] text-primary font-bold" numberOfLines={1}>
                {`⚽ ${
                  friend.inMatchAt
                    ? t('friends.playingAt', { pitch: pick(friend.inMatchAt) })
                    : t('friends.inMatch')
                }`}
              </Text>
            ) : (
              <Text font="grotesk" className="text-[10px] text-on-surface-variant/70">
                {friend.lastActiveAt ? ago(friend.lastActiveAt) : t('friends.offline')}
              </Text>
            )}
          </View>
        </View>
      </View>
      <View className="flex-row items-center gap-1.5">
        <Pressable
          onPress={onInvite}
          className="px-2.5 py-1.5 rounded-lg bg-secondary-container active:bg-emerald active:scale-95 flex-row items-center gap-1 shadow-sm"
        >
          <Icon name="send" size={15} directional className="text-on-secondary-container" />
          <Text font="rubik" className="text-[12px] text-on-secondary-container font-bold">
            {t('friends.invite')}
          </Text>
        </Pressable>
        <Pressable
          onPress={onWhatsApp}
          accessibilityRole="button"
          accessibilityLabel={t('friends.whatsapp')}
          className="w-8 h-8 rounded-lg bg-surface-container-high active:bg-surface-container-highest items-center justify-center"
        >
          <Icon name="chat" size={16} className="text-secondary" />
        </Pressable>
      </View>
    </View>
  );
}

function RequestRow({
  request,
  onAnswer,
}: {
  request: FriendRequest;
  onAnswer: (accept: boolean) => void;
}) {
  const { t, pick, number, ago } = useLocale();
  const p = request.from;
  return (
    <View className="p-3 rounded-xl bg-surface-container-high border border-primary/30 flex-row items-center justify-between gap-2.5">
      <View className="flex-row items-center gap-2.5 flex-1 min-w-0">
        <Avatar uri={p.avatarUrl} initials={initials(p.name)} size="w-10 h-10" />
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-1.5">
            <Text
              font="rubik"
              className="text-[14px] text-on-surface font-bold shrink"
              numberOfLines={1}
            >
              {p.name}
            </Text>
            <Text font="grotesk" className="text-[11px] text-primary font-black">
              {number(p.form)}
            </Text>
          </View>
          <Text className="text-[11px] text-on-surface-variant" numberOfLines={1}>
            {`${t(`positions.${p.position}`)} • ${pick(p.neighborhood)} • ${ago(request.createdAt)}`}
          </Text>
        </View>
      </View>
      <View className="flex-row items-center gap-1.5">
        <Pressable
          onPress={() => onAnswer(true)}
          accessibilityRole="button"
          accessibilityLabel={t('friends.accept')}
          className="w-8 h-8 rounded-lg bg-secondary-container active:bg-emerald items-center justify-center"
        >
          <Icon name="check" size={18} className="text-on-secondary-container" />
        </Pressable>
        <Pressable
          onPress={() => onAnswer(false)}
          accessibilityRole="button"
          accessibilityLabel={t('friends.decline')}
          className="w-8 h-8 rounded-lg bg-surface-container-highest active:bg-surface-bright items-center justify-center"
        >
          <Icon name="close" size={18} className="text-on-surface-variant" />
        </Pressable>
      </View>
    </View>
  );
}

function SuggestionCard({
  player,
  sent,
  onAdd,
}: {
  player: FriendSuggestion;
  sent: boolean;
  onAdd: () => void;
}) {
  const { t, number } = useLocale();
  return (
    <View className="flex-1 p-2 rounded-xl bg-surface-container-lowest border border-surface-container-high flex-row items-center justify-between gap-1.5">
      <View className="flex-row items-center gap-1.5 flex-1 min-w-0">
        <Avatar uri={player.avatarUrl} initials={initials(player.name)} size="w-7 h-7" />
        <View className="flex-1 min-w-0">
          <Text font="rubik" className="text-[11px] font-bold text-on-surface" numberOfLines={1}>
            {player.name}
          </Text>
          <Text font="grotesk" className="text-[9px] text-on-surface-variant" numberOfLines={1}>
            {`${t(`positions.${player.position}`)} • ${number(player.form)}`}
          </Text>
        </View>
      </View>
      <Pressable
        disabled={sent}
        onPress={onAdd}
        accessibilityRole="button"
        accessibilityLabel={sent ? t('friends.sent') : t('friends.addSuggested')}
        className={`w-6 h-6 rounded-md items-center justify-center ${
          sent ? 'bg-secondary-container/20' : 'bg-surface-container-high active:bg-primary'
        }`}
      >
        <Icon
          name={sent ? 'check' : 'add'}
          size={14}
          className={sent ? 'text-secondary' : 'text-primary'}
        />
      </Pressable>
    </View>
  );
}
