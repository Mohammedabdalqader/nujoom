import { errorKey } from '@nujoom/shared';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { useGear, useGearChange, useMe } from '@/data/api';
import type { GearItem, GearList, Me } from '@/data/types';
import { sfx } from '@/design/sound';
import { useTheme } from '@/design/theme';
import { useLocale } from '@/lib/locale';
import { shareToWhatsApp } from '@/lib/share';
import { DialogLoading } from '@/ui/Dialog';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { useToast } from '@/ui/Toast';

import { GEAR_NAME_MAX, gearProgress } from './gear';
import { ToolFrame } from './ToolFrame';

/**
 * "تجهيزات المباراة ومسؤولية الحارة": who brings the ball, bibs and water. Anyone in the match
 * can tick an item or claim it ("أنا بجيبها"); the organizer adds items. The list is stored per
 * booking (D-093/D-094): every tap is saved and the screen shows what the server has. Item notes
 * are fixed per kind so the list never turns into a chat (spec §7).
 */
export function GearDialog() {
  const { bookingId } = useLocalSearchParams<{ bookingId?: string }>();
  const gear = useGear(bookingId ?? null).data;
  const me = useMe().data;
  if (!gear || !me) return <DialogLoading />;
  return <GearTool gear={gear} me={me} bookingId={bookingId ?? null} />;
}

function GearTool({ gear, me, bookingId }: { gear: GearList; me: Me; bookingId: string | null }) {
  const { t, pick, time } = useLocale();
  const toast = useToast();
  const change = useGearChange(bookingId);
  // One change at a time: a second tap on stale state could undo the first.
  const save = (c: Parameters<typeof change.mutate>[0], sound: () => void) => {
    if (change.isPending) return;
    change.mutate(c, {
      onSuccess: sound,
      onError: (error) => toast.show(t(errorKey(error))),
    });
  };

  const list = gear.items;
  const progress = gearProgress(list);
  const ballReady = list.some((i) => i.kind === 'ball' && i.ready);

  const itemName = (i: GearItem) =>
    i.kind === 'custom' ? (i.name ?? '') : t(`tools.gear.items.${i.kind}`);
  const ownerName = (i: GearItem) =>
    i.assignee
      ? i.assignee.id === me.id
        ? t('tools.gear.you', { name: i.assignee.name })
        : i.assignee.name
      : null;

  const share = async () => {
    sfx.clipBeep();
    const lines = list.map((i) => {
      const owner = ownerName(i);
      if (!i.ready) return t('tools.gear.shareText.missing', { item: itemName(i) });
      return owner
        ? t('tools.gear.shareText.ready', { item: itemName(i), owner })
        : t('tools.gear.shareText.readyNoOwner', { item: itemName(i) });
    });
    const text = [
      t('tools.gear.shareText.header', { app: t('app.name') }),
      gear.pitchName ? t('tools.gear.shareText.pitch', { pitch: pick(gear.pitchName) }) : null,
      '',
      t('tools.gear.shareText.status', progress),
      '',
      lines.join('\n\n'),
      '',
      t('tools.gear.shareText.footer'),
    ]
      .filter((l) => l !== null)
      .join('\n');
    if ((await shareToWhatsApp(text)) === 'copied') toast.show(t('common.copied'));
  };

  return (
    <ToolFrame
      icon="checklist"
      tile="bg-secondary-container/20 border-secondary-container/30"
      iconClassName="text-secondary"
      title={t('tools.gear.title')}
      badge={t('tools.gear.badge')}
      badgeClassName="bg-primary/20 border-primary/30"
      badgeTextClassName="text-primary"
      sub={t('tools.gear.sub')}
      shareLabel={t('tools.gear.share')}
      onShare={() => void share()}
    >
      <View className="p-3.5 rounded-xl bg-gradient-to-r from-surface-container to-surface-container-low border border-border shadow-md">
        <View className="flex-row items-center justify-between gap-2 mb-2">
          <View className="flex-row items-center gap-2 flex-1">
            <Icon name="sports_soccer" size={20} className="text-secondary" />
            <Text font="rubik" className="text-[14px] text-on-surface font-bold shrink">
              {progress.missing === 0 && progress.total > 0
                ? t('tools.gear.allReady')
                : t('tools.gear.readiness', { ready: progress.ready, total: progress.total })}
            </Text>
          </View>
          <Text font="grotesk" className="text-[13px] text-secondary font-bold">
            {`${progress.percent}%`}
          </Text>
        </View>
        <View className="w-full h-2.5 bg-surface rounded-full overflow-hidden border border-border">
          <View
            className="h-full bg-gradient-to-r from-secondary-container to-secondary rounded-full"
            style={{ width: `${progress.percent}%` }}
          />
        </View>
        <View className="mt-2.5 flex-row items-center justify-between gap-2">
          <View className="flex-row items-center gap-1 shrink">
            <View className={`w-2 h-2 rounded-full ${ballReady ? 'bg-secondary' : 'bg-error'}`} />
            <Text className={`text-[11px] ${ballReady ? 'text-secondary' : 'text-error'}`}>
              {ballReady ? t('tools.gear.ballReady') : t('tools.gear.ballMissing')}
            </Text>
          </View>
          <Text className="text-[11px] text-on-surface-variant">
            {progress.missing > 0
              ? t('tools.gear.missing', { value: progress.missing })
              : t('tools.gear.goReady')}
          </Text>
        </View>
      </View>

      {gear.canEdit && gear.bookingId ? (
        <AddItem
          onAdd={(name) =>
            save({ action: 'add', bookingId: gear.bookingId!, name }, () => sfx.success())
          }
        />
      ) : null}

      <View className="gap-2">
        {list.map((item) => (
          <GearRow
            key={item.id}
            item={item}
            gear={gear}
            name={itemName(item)}
            owner={ownerName(item)}
            noteTime={gear.startsAt ? time(gear.startsAt) : ''}
            onToggle={() =>
              save({ action: 'ready', itemId: item.id, on: !item.ready }, () => sfx.ding())
            }
            onClaim={() =>
              save({ action: 'claim', itemId: item.id, on: true }, () => sfx.success())
            }
          />
        ))}
      </View>
    </ToolFrame>
  );
}

function AddItem({ onAdd }: { onAdd: (name: string) => void }) {
  const { t } = useLocale();
  const { color } = useTheme();
  const [name, setName] = useState('');
  const [focused, setFocused] = useState(false);
  const submit = () => {
    if (!name.trim()) return;
    onAdd(name);
    setName('');
  };
  return (
    <View className="flex-row gap-2">
      <TextInput
        value={name}
        onChangeText={setName}
        onSubmitEditing={submit}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={t('tools.gear.addPlaceholder')}
        placeholderTextColor={color('muted')}
        accessibilityLabel={t('tools.gear.addPlaceholder')}
        maxLength={GEAR_NAME_MAX}
        returnKeyType="done"
        className={`flex-1 min-w-0 bg-surface-container border rounded-xl px-3 py-2 text-[13px] text-on-surface ${
          focused ? 'border-secondary' : 'border-border'
        }`}
        style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
      />
      <Pressable
        onPress={submit}
        className="px-3.5 py-2 rounded-xl bg-surface-container-high active:bg-surface-container-highest border border-surface-container-highest flex-row items-center gap-1 active:scale-95"
      >
        <Icon name="add" size={16} className="text-secondary" />
        <Text font="rubik" className="text-[12px] text-secondary font-bold">
          {t('tools.gear.add')}
        </Text>
      </Pressable>
    </View>
  );
}

function GearRow({
  item,
  gear,
  name,
  owner,
  noteTime,
  onToggle,
  onClaim,
}: {
  item: GearItem;
  gear: GearList;
  name: string;
  owner: string | null;
  noteTime: string;
  onToggle: () => void;
  onClaim: () => void;
}) {
  const { t } = useLocale();
  const note =
    !item.ready && !owner
      ? t('tools.gear.notes.needed')
      : t(`tools.gear.notes.${item.kind}`, {
          value: gear.size + 1,
          time: noteTime,
        });

  return (
    <View
      className={`p-3 rounded-xl border flex-row items-start justify-between gap-3 ${
        item.ready
          ? 'bg-tint-green border-secondary-container/40 shadow-sm'
          : 'bg-surface-container border-border'
      }`}
    >
      <Pressable
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: item.ready }}
        accessibilityLabel={item.ready ? t('tools.gear.markNotReady') : t('tools.gear.markReady')}
        className={`w-7 h-7 rounded-lg items-center justify-center mt-0.5 ${
          item.ready
            ? 'bg-secondary-container'
            : 'bg-surface-container-high active:bg-surface-container-highest'
        }`}
      >
        <Icon
          name={item.ready ? 'check' : 'crop_square'}
          size={18}
          className={item.ready ? 'text-on-secondary-container' : 'text-muted'}
        />
      </Pressable>

      <View className="flex-1 min-w-0">
        <View className="flex-row items-center gap-1.5 flex-wrap">
          <Text font="rubik" className="text-[14px] text-on-surface font-bold shrink">
            {name}
          </Text>
          {item.ready ? (
            <View className="px-1.5 rounded bg-secondary-container/20">
              <Text font="grotesk" className="text-[10px] text-secondary font-bold">
                {t('tools.gear.ready')}
              </Text>
            </View>
          ) : (
            <View className="px-1.5 rounded bg-error-container/30 animate-pulse">
              <Text font="grotesk" className="text-[10px] text-error font-bold">
                {t('tools.gear.needed')}
              </Text>
            </View>
          )}
        </View>
        <Text className="text-[11px] text-on-surface-variant mt-0.5">{note}</Text>
        <View className="mt-1.5 flex-row items-center gap-1.5">
          <Text className="text-[11px] text-muted">{t('tools.gear.owner')}</Text>
          {owner ? (
            <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-high shrink">
              <Icon name="person" size={14} className="text-primary" />
              <Text className="text-[11px] text-primary font-bold shrink" numberOfLines={1}>
                {owner}
              </Text>
            </View>
          ) : (
            <Text className="text-[11px] text-error font-bold">{t('tools.gear.nobody')}</Text>
          )}
        </View>
      </View>

      {!item.ready ? (
        <Pressable
          onPress={onClaim}
          className="px-2.5 py-1.5 rounded-lg bg-primary-container/20 active:bg-primary-container/30 border border-primary-container/30 active:scale-95"
        >
          <Text font="rubik" className="text-[11px] text-primary font-bold">
            {t('tools.gear.claim')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
