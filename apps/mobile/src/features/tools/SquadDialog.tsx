import { initials } from '@nujoom/shared';
import { useEffect, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { useSquad } from '@/data/api';
import type { KitColor, Squad } from '@/data/types';
import { sfx } from '@/design/sound';
import { useTheme } from '@/design/theme';
import { useLocale } from '@/lib/locale';
import { shareToWhatsApp } from '@/lib/share';
import { Avatar } from '@/ui/Avatar';
import { DialogLoading } from '@/ui/Dialog';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { useToast } from '@/ui/Toast';

import { ToolFrame } from './ToolFrame';
import {
  averageGap,
  BALANCED_GAP,
  guestForm,
  initialSplit,
  randomSplit,
  smallerSide,
  smartSplit,
  switchSide,
  teamAverage,
  toggleBench,
  tossCoin,
  type SplitPlayer,
} from './squad';

const COIN_MS = 1200;

const KIT = {
  blue: {
    column: 'bg-tint-blue border-team-blue-deep/40',
    divider: 'border-team-blue-deep/30',
    dot: 'bg-team-blue shadow-[0_0_8px_#3b82f6]',
    title: 'text-team-blue-pale',
    count: 'text-team-blue-light',
    row: 'bg-tint-blue-strong border-team-blue-strong/20',
    sub: 'text-team-blue-pale',
    avatar: 'border-team-blue/40',
    stat: 'bg-team-blue-deep/15 border-team-blue-strong/30',
    statLabel: 'text-team-blue-light',
    statSub: 'text-team-blue-pale',
  },
  orange: {
    column: 'bg-tint-orange border-primary-container/40',
    divider: 'border-primary-container/30',
    dot: 'bg-primary-container shadow-[0_0_8px_#f59e0b]',
    title: 'text-amber-pale',
    count: 'text-primary',
    row: 'bg-tint-orange-strong border-primary-container/20',
    sub: 'text-amber-pale',
    avatar: 'border-primary-container/40',
    stat: 'bg-primary-container/15 border-primary-container/30',
    statLabel: 'text-primary',
    statSub: 'text-amber-pale',
  },
} as const;

/**
 * "قرعة وتشكيلة الفريقين المتوازنة": split the next match's squad (plus walk-ins) into two fair
 * kits, toss the coin and send the line-up to the WhatsApp group. R2 saves the split as the
 * booking's teams when the organizer runs it (spec §6.4).
 */
export function SquadDialog() {
  const squad = useSquad().data;
  if (!squad) return <DialogLoading />;
  return <SquadTool squad={squad} />;
}

function SquadTool({ squad }: { squad: Squad }) {
  const { t, pick, number } = useLocale();
  const toast = useToast();

  const [players, setPlayers] = useState<SplitPlayer[]>(() => initialSplit(squad.players));
  const [flipping, setFlipping] = useState(false);
  const [coin, setCoin] = useState<KitColor | null>(null);
  const [coinFor, setCoinFor] = useState<'ball' | 'pitch'>('ball');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const list = players;
  const blue = list.filter((p) => p.side === 'blue');
  const orange = list.filter((p) => p.side === 'orange');
  const bench = list.filter((p) => p.side === 'bench');
  const blueAvg = teamAverage(list, 'blue');
  const orangeAvg = teamAverage(list, 'orange');
  const gap = averageGap(list);
  const balanced = gap <= BALANCED_GAP;

  const nameOf = (p: SplitPlayer) => (p.isMe ? t('tools.squad.you', { name: p.name }) : p.name);
  const positionOf = (p: SplitPlayer) =>
    p.position ? t(`positions.${p.position}`) : t('tools.squad.guest');

  const flip = () => {
    sfx.coinToss();
    setFlipping(true);
    setCoin(null);
    timer.current = setTimeout(() => {
      setCoin(tossCoin());
      setFlipping(false);
      sfx.whistle();
    }, COIN_MS);
  };

  const addGuest = (name: string) => {
    sfx.success();
    setPlayers((prev) => {
      return [
        ...prev,
        {
          id: `guest-${Date.now()}`,
          name,
          avatarUrl: null,
          position: null,
          form: guestForm(prev),
          side: smallerSide(prev),
        },
      ];
    });
  };

  const share = async () => {
    sfx.clipBeep();
    const lines = (team: SplitPlayer[]) =>
      team.map((p, i) => `${i + 1}. ${nameOf(p)} (${positionOf(p)})`).join('\n');
    const text = [
      t('tools.squad.shareText.header', { app: t('app.name') }),
      squad.pitchName ? t('tools.squad.shareText.pitch', { pitch: pick(squad.pitchName) }) : null,
      '',
      t('tools.squad.shareText.blue', { avg: number(blueAvg), count: blue.length }),
      lines(blue),
      '',
      t('tools.squad.shareText.orange', { avg: number(orangeAvg), count: orange.length }),
      lines(orange),
      coin
        ? `\n${t(`tools.squad.shareText.${coinFor === 'ball' ? 'coinBall' : 'coinPitch'}`, {
            team: t(`tools.squad.${coin}Team`),
          })}`
        : null,
      '',
      t('tools.squad.shareText.footer'),
    ]
      .filter((l) => l !== null)
      .join('\n');
    if ((await shareToWhatsApp(text)) === 'copied') toast.show(t('common.copied'));
  };

  return (
    <ToolFrame
      icon="balance"
      tile="bg-primary-container/20 border-primary-container/30"
      iconClassName="text-primary"
      title={t('tools.squad.title')}
      badge={t('tools.squad.badge')}
      badgeClassName="bg-secondary-container/20 border-secondary-container/30"
      badgeTextClassName="text-secondary"
      sub={t('tools.squad.sub')}
      shareLabel={t('tools.squad.share')}
      onShare={() => void share()}
    >
      <View className="flex-row gap-2 p-3 rounded-xl bg-surface-container border border-border">
        <TeamStat kit="blue" count={blue.length} average={blueAvg} />
        <View className="flex-1 items-center justify-center p-1">
          <Icon
            name={balanced ? 'check_circle' : 'swap_horiz'}
            size={20}
            className="text-primary"
          />
          <Text font="grotesk" className="text-[12px] font-bold text-primary mt-0.5">
            {t('tools.squad.gap', { value: number(gap) })}
          </Text>
          <Text className="text-[10px] text-on-surface-variant text-center">
            {balanced ? t('tools.squad.balanced') : t('tools.squad.slightGap')}
          </Text>
        </View>
        <TeamStat kit="orange" count={orange.length} average={orangeAvg} />
      </View>

      <View className="flex-row gap-2">
        <Pressable
          onPress={() => {
            sfx.whistle();
            setPlayers((p) => smartSplit(p));
          }}
          className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-secondary-container to-emerald-deep flex-row items-center justify-center gap-1.5 shadow-md active:scale-95"
        >
          <Icon name="auto_fix_high" size={18} className="text-white" />
          <Text font="rubik" className="text-[13px] text-white font-bold shrink text-center">
            {t('tools.squad.smart')}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            sfx.clipBeep();
            setPlayers((p) => randomSplit(p));
          }}
          className="flex-1 py-2.5 px-3 rounded-xl bg-surface-container-high active:bg-surface-container-highest border border-surface-bright flex-row items-center justify-center gap-1.5 active:scale-95"
        >
          <Icon name="casino" size={18} className="text-on-surface" />
          <Text font="rubik" className="text-[13px] text-on-surface font-bold shrink text-center">
            {t('tools.squad.random')}
          </Text>
        </Pressable>
      </View>

      <View className="p-3.5 rounded-xl bg-gradient-to-br from-surface-container to-surface border border-primary/20 shadow-md gap-2">
        <View className="flex-row items-center justify-between gap-2">
          <View className="flex-row items-center gap-2 flex-1">
            <Icon name="monetization_on" size={18} className="text-primary" />
            <Text font="rubik" className="text-[14px] text-on-surface font-bold shrink">
              {t('tools.squad.coinTitle')}
            </Text>
          </View>
          <View className="flex-row items-center gap-1 bg-surface p-0.5 rounded-lg border border-border">
            {(['ball', 'pitch'] as const).map((side) => {
              const on = coinFor === side;
              return (
                <Pressable
                  key={side}
                  onPress={() => setCoinFor(side)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  className={`px-2 py-0.5 rounded ${on ? 'bg-primary' : ''}`}
                >
                  <Text
                    font="rubik"
                    className={`text-[11px] ${on ? 'text-on-primary font-bold' : 'text-on-surface-variant'}`}
                  >
                    {t(side === 'ball' ? 'tools.squad.coinBall' : 'tools.squad.coinPitch')}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1 items-start">
            <Text className="text-[11px] text-on-surface-variant">{t('tools.squad.coinHint')}</Text>
            {coin ? (
              <View className="mt-2 flex-row items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/20 border border-primary/40">
                <Text font="rubik" className="text-[12px] text-primary font-bold">
                  {t('tools.squad.coinWinner')}
                </Text>
                <Text font="rubik" className="text-[12px] text-primary font-bold">
                  {t(`tools.squad.${coin}Winner`)}
                </Text>
              </View>
            ) : null}
          </View>
          <Pressable
            onPress={flip}
            disabled={flipping}
            accessibilityRole="button"
            accessibilityLabel={t('tools.squad.tossCoin')}
            className={`w-16 h-16 rounded-full items-center justify-center shadow-lg active:scale-95 ${
              flipping
                ? 'animate-spin bg-gradient-to-tr from-primary-container to-amber'
                : coin === 'blue'
                  ? 'bg-team-blue-strong border-2 border-team-blue-light'
                  : coin === 'orange'
                    ? 'bg-team-orange-strong border-2 border-[#fdba74]'
                    : 'bg-gradient-to-tr from-amber-deep to-primary-container border-2 border-[#fef08a]'
            }`}
          >
            <Icon
              name={flipping ? 'autorenew' : 'toll'}
              size={28}
              className={coin && !flipping ? 'text-white' : 'text-on-primary'}
            />
            <Text
              font="rubik"
              className={`text-[10px] leading-[12px] font-extrabold mt-0.5 ${
                coin && !flipping ? 'text-white' : 'text-on-primary'
              }`}
            >
              {flipping ? '...' : t('tools.squad.throw')}
            </Text>
          </Pressable>
        </View>
      </View>

      <AddGuest onAdd={addGuest} />

      <View className="flex-row gap-2.5 items-start">
        {(['blue', 'orange'] as const).map((kit) => (
          <TeamColumn
            key={kit}
            kit={kit}
            players={kit === 'blue' ? blue : orange}
            nameOf={nameOf}
            positionOf={positionOf}
            onSwitch={(id) => {
              sfx.ding();
              setPlayers((p) => switchSide(p, id));
            }}
            onBench={(id) => {
              sfx.ding();
              setPlayers((p) => toggleBench(p, id));
            }}
          />
        ))}
      </View>

      {bench.length ? (
        <View className="p-2.5 rounded-xl bg-surface-container border border-border gap-1.5">
          <Text font="rubik" className="text-[12px] text-on-surface-variant font-bold">
            {t('tools.squad.bench', { value: bench.length })}
          </Text>
          <View className="flex-row flex-wrap gap-1.5">
            {bench.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => {
                  sfx.ding();
                  setPlayers((prev) => toggleBench(prev, p.id));
                }}
                className="px-2 py-1 rounded bg-surface-container-high active:bg-surface-container-highest border border-surface-bright flex-row items-center gap-1"
              >
                <Text className="text-[11px] text-on-surface">{nameOf(p)}</Text>
                <Text className="text-[10px] text-secondary">{t('tools.squad.bringOn')}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </ToolFrame>
  );
}

function TeamStat({ kit, count, average }: { kit: KitColor; count: number; average: number }) {
  const { t, number } = useLocale();
  const k = KIT[kit];
  return (
    <View className={`flex-1 items-center p-2 rounded-lg border ${k.stat}`}>
      <Text font="grotesk" className={`text-[11px] font-bold ${k.statLabel}`}>
        {t(kit === 'blue' ? 'tools.squad.blueCount' : 'tools.squad.orangeCount', { value: count })}
      </Text>
      <Text font="grotesk" className="text-[20px] text-on-surface font-bold mt-0.5">
        {number(average)}
      </Text>
      <Text className={`text-[10px] ${k.statSub}`}>{t('tools.squad.strength')}</Text>
    </View>
  );
}

function AddGuest({ onAdd }: { onAdd: (name: string) => void }) {
  const { t } = useLocale();
  const { color } = useTheme();
  const [name, setName] = useState('');
  const [focused, setFocused] = useState(false);
  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed.slice(0, 40));
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
        placeholder={t('tools.squad.addPlaceholder')}
        placeholderTextColor={color('muted')}
        accessibilityLabel={t('tools.squad.addPlaceholder')}
        maxLength={40}
        returnKeyType="done"
        className={`flex-1 min-w-0 bg-surface-container border rounded-xl px-3 py-2 text-[13px] text-on-surface ${
          focused ? 'border-primary' : 'border-border'
        }`}
        style={{ fontFamily: 'PlusJakartaSans_400Regular' }}
      />
      <Pressable
        onPress={submit}
        className="px-3.5 py-2 rounded-xl bg-surface-container-high active:bg-surface-container-highest border border-surface-container-highest flex-row items-center gap-1 active:scale-95"
      >
        <Icon name="add" size={16} className="text-primary" />
        <Text font="rubik" className="text-[12px] text-primary font-bold">
          {t('tools.squad.add')}
        </Text>
      </Pressable>
    </View>
  );
}

function TeamColumn({
  kit,
  players,
  nameOf,
  positionOf,
  onSwitch,
  onBench,
}: {
  kit: KitColor;
  players: SplitPlayer[];
  nameOf: (p: SplitPlayer) => string;
  positionOf: (p: SplitPlayer) => string;
  onSwitch: (id: string) => void;
  onBench: (id: string) => void;
}) {
  const { t, number } = useLocale();
  const k = KIT[kit];
  return (
    <View className={`flex-1 rounded-xl border p-2.5 shadow-md ${k.column}`}>
      <View className={`flex-row items-center justify-between pb-2 mb-2 border-b ${k.divider}`}>
        <View className="flex-row items-center gap-1.5">
          <View className={`w-3 h-3 rounded-full ${k.dot}`} />
          <Text font="rubik" className={`text-[13px] font-bold ${k.title}`}>
            {t(kit === 'blue' ? 'tools.squad.blueTeam' : 'tools.squad.orangeTeam')}
          </Text>
        </View>
        <Text font="grotesk" className={`text-[11px] font-bold ${k.count}`}>
          {number(players.length)}
        </Text>
      </View>
      <View className="gap-1.5">
        {players.map((p) => (
          <Pressable
            key={p.id}
            onLongPress={() => onBench(p.id)}
            accessibilityHint={t('tools.squad.benchHint')}
            className={`p-1.5 rounded-lg border flex-row items-center justify-between gap-1 ${k.row}`}
          >
            <View className="flex-row items-center gap-1.5 flex-1 min-w-0">
              <Avatar
                uri={p.avatarUrl}
                initials={initials(p.name)}
                size="w-7 h-7"
                className={`border ${k.avatar}`}
                textClassName="text-[9px] text-on-surface"
              />
              <View className="flex-1 min-w-0">
                <Text
                  font="rubik"
                  className="text-[11px] text-on-surface font-bold"
                  numberOfLines={1}
                >
                  {nameOf(p)}
                </Text>
                <Text className={`text-[9px] ${k.sub}`} numberOfLines={1}>
                  {positionOf(p)}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center gap-1">
              <Text font="grotesk" className="text-[10px] text-primary font-bold">
                {number(p.form)}
              </Text>
              <Pressable
                onPress={() => onSwitch(p.id)}
                accessibilityRole="button"
                accessibilityLabel={t(
                  kit === 'blue' ? 'tools.squad.toOrange' : 'tools.squad.toBlue',
                )}
                className="w-6 h-6 rounded bg-surface-container-high active:bg-surface-container-highest items-center justify-center"
              >
                <Icon
                  name={kit === 'blue' ? 'arrow_forward' : 'arrow_back'}
                  directional
                  size={14}
                  className="text-on-surface-variant"
                />
              </Pressable>
            </View>
          </Pressable>
        ))}
        {players.length === 0 ? (
          <Text className="text-center py-4 text-[11px] text-muted">
            {t('tools.squad.noPlayers')}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
