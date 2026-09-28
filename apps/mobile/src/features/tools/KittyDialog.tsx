import { intlLocale } from '@nujoom/i18n';
import { useEffect, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { useKitty } from '@/data/api';
import type { Kitty, KittyPlayer } from '@/data/types';
import { sfx } from '@/design/sound';
import { useTheme } from '@/design/theme';
import { kv } from '@/lib/kv';
import { useLocale } from '@/lib/locale';
import { copyText, shareToWhatsApp } from '@/lib/share';
import { DialogLoading } from '@/ui/Dialog';
import { Icon, type IconName } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { useToast } from '@/ui/Toast';

import { filsToJod, kittySummary, parseAmount, setMethod, togglePaid } from './kitty';
import { ToolFrame } from './ToolFrame';

const CLIQ_KEY = 'tools.cliqAlias';
const CLIQ_MAX = 20;

/** CliQ aliases are letters and digits (or a mobile number); we keep them upper-case. */
function normalizeAlias(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9._-]/g, '')
    .slice(0, CLIQ_MAX);
}

/**
 * "حاسبة قطية الملعب": split the booking's rent and extras across the squad and tick who has paid
 * (cash or CliQ; stars are not money, D-006.1). R3 keeps the marks on the booking; the captain's
 * CliQ alias is stored on this device until profiles carry it.
 */
export function KittyDialog() {
  const kitty = useKitty().data;
  if (!kitty) return <DialogLoading />;
  return <KittyTool kitty={kitty} />;
}

function KittyTool({ kitty }: { kitty: Kitty }) {
  const { t, pick, locale } = useLocale();
  const toast = useToast();

  const [pitch, setPitch] = useState(String(kitty.pitchCost));
  const [extras, setExtras] = useState(String(kitty.extrasCost));
  const [players, setPlayers] = useState<KittyPlayer[]>(kitty.players);

  const list = players;
  const pitchFils = parseAmount(pitch);
  const extrasFils = parseAmount(extras);
  const totalFils = (pitchFils ?? 0) + (extrasFils ?? 0);
  const summary = kittySummary(totalFils, list);

  const amount = (fils: number) =>
    new Intl.NumberFormat(intlLocale(locale), {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(filsToJod(fils));

  const [alias, setAlias] = useState(() => kv.get(CLIQ_KEY) ?? '');

  const share = async () => {
    sfx.clipBeep();
    const text = [
      kitty.pitchName
        ? t('tools.kitty.shareText.header', { pitch: pick(kitty.pitchName) })
        : t('tools.kitty.shareText.headerNoPitch'),
      t('tools.kitty.shareText.pitch', { amount: amount(pitchFils ?? 0) }),
      t('tools.kitty.shareText.extras', { amount: amount(extrasFils ?? 0) }),
      t('tools.kitty.shareText.total', { amount: amount(totalFils) }),
      t('tools.kitty.shareText.players', { value: list.length }),
      '',
      t('tools.kitty.shareText.share', { amount: amount(summary.share) }),
      '',
      ...(alias
        ? [t('tools.kitty.shareText.howToPay'), t('tools.kitty.shareText.cliq', { alias })]
        : [t('tools.kitty.shareText.cashOnly')]),
      '',
      t('tools.kitty.shareText.status', { paid: summary.paid, total: list.length }),
      t('tools.kitty.shareText.footer'),
    ].join('\n');
    if ((await shareToWhatsApp(text)) === 'copied') toast.show(t('common.copied'));
  };

  return (
    <ToolFrame
      icon="payments"
      tile="bg-primary-container/20 border-primary-container/30"
      iconClassName="text-primary"
      title={t('tools.kitty.title')}
      badge={t('tools.kitty.badge')}
      badgeClassName="bg-secondary-container/20 border-secondary-container/30"
      badgeTextClassName="text-secondary"
      sub={t('tools.kitty.sub')}
      shareLabel={t('tools.kitty.shareButton')}
      onShare={() => void share()}
    >
      <View className="p-4 rounded-xl bg-gradient-to-br from-surface-container to-surface-container-lowest border border-primary/20 shadow-xl gap-3">
        <View className="flex-row gap-3">
          <AmountField
            label={t('tools.kitty.pitchCost')}
            icon="stadium"
            iconClassName="text-secondary"
            value={pitch}
            invalid={pitchFils === null}
            onChange={setPitch}
          />
          <AmountField
            label={t('tools.kitty.extrasCost')}
            icon="water_drop"
            iconClassName="text-team-blue-light"
            value={extras}
            invalid={extrasFils === null}
            onChange={setExtras}
          />
        </View>

        <View className="p-3 rounded-xl bg-surface-container-high/60 border border-surface-container-highest flex-row items-center justify-between gap-2">
          <View className="shrink">
            <Text className="text-[11px] text-primary font-bold">{t('tools.kitty.share')}</Text>
            <View className="flex-row items-baseline gap-1 mt-0.5">
              <Text
                font="grotesk"
                className="text-[32px] leading-[36px] text-primary font-bold text-shadow-[0_0_12px_rgba(255,193,116,0.3)]"
              >
                {amount(summary.share)}
              </Text>
              <Text font="rubik" className="text-[13px] text-on-surface-variant">
                {t('tools.kitty.jodLong')}
              </Text>
            </View>
          </View>
          <View className="items-end">
            <Text className="text-[11px] text-on-surface-variant">{t('tools.kitty.total')}</Text>
            <Text font="grotesk" className="text-[16px] text-on-surface font-bold">
              {t('tools.kitty.jod', { value: amount(totalFils) })}
            </Text>
            <Text className="text-[10px] text-muted">
              {t('tools.kitty.over', { value: list.length })}
            </Text>
          </View>
        </View>

        <View className="pt-3 border-t border-border gap-1.5">
          <View className="flex-row items-center justify-between gap-2">
            <Text className="text-[11px] text-secondary font-bold shrink">
              {t('tools.kitty.collected', {
                amount: amount(summary.collected),
                paid: summary.paid,
                total: list.length,
              })}
            </Text>
            <Text className="text-[11px] text-error">
              {t('tools.kitty.remaining', { amount: amount(summary.remaining) })}
            </Text>
          </View>
          <View className="w-full h-2 bg-surface rounded-full overflow-hidden border border-border">
            <View
              className="h-full bg-gradient-to-r from-primary-container to-secondary-container rounded-full"
              style={{ width: `${summary.percent}%` }}
            />
          </View>
        </View>
      </View>

      <CliqBar
        alias={alias}
        onSave={(value) => {
          setAlias(value);
          if (value) kv.set(CLIQ_KEY, value);
          else kv.remove(CLIQ_KEY);
        }}
      />

      <AddPlayer
        onAdd={(name) => {
          sfx.success();
          setPlayers((prev) => [...prev, { id: `kt-${Date.now()}`, name, paid: null }]);
        }}
      />

      <View className="gap-1.5">
        <View className="flex-row items-center justify-between px-1">
          <Text font="rubik" className="text-[11px] text-on-surface-variant">
            {t('tools.kitty.roster')}
          </Text>
          <Text font="rubik" className="text-[11px] text-on-surface-variant">
            {t('tools.kitty.tapHint')}
          </Text>
        </View>
        {list.map((p) => (
          <PlayerRow
            key={p.id}
            player={p}
            share={t('tools.kitty.jod', { value: amount(summary.share) })}
            onToggle={() => {
              sfx.ding();
              setPlayers((prev) => togglePaid(prev, p.id));
            }}
            onMethod={(method) => {
              sfx.success();
              setPlayers((prev) => setMethod(prev, p.id, method));
            }}
          />
        ))}
      </View>
    </ToolFrame>
  );
}

function AmountField({
  label,
  icon,
  iconClassName,
  value,
  invalid,
  onChange,
}: {
  label: string;
  icon: IconName;
  iconClassName: string;
  value: string;
  invalid: boolean;
  onChange: (v: string) => void;
}) {
  const { t } = useLocale();
  const [focused, setFocused] = useState(false);
  return (
    <View className="flex-1">
      <Text className="text-[11px] text-on-surface-variant mb-1">{label}</Text>
      <View
        className={`flex-row items-center gap-1.5 bg-surface border rounded-xl px-2.5 py-1.5 ${
          invalid ? 'border-error' : focused ? 'border-primary' : 'border-border'
        }`}
      >
        <Icon name={icon} size={18} className={iconClassName} />
        <TextInput
          value={value}
          onChangeText={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardType="decimal-pad"
          accessibilityLabel={label}
          maxLength={9}
          className="flex-1 min-w-0 text-[16px] text-on-surface p-0"
          style={{ fontFamily: 'SpaceGrotesk_700Bold', writingDirection: 'ltr' }}
        />
      </View>
      {invalid ? (
        <Text className="text-[10px] text-error mt-0.5">{t('tools.kitty.badAmount')}</Text>
      ) : null}
    </View>
  );
}

function CliqBar({ alias, onSave }: { alias: string; onSave: (value: string) => void }) {
  const { t } = useLocale();
  const { color } = useTheme();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(alias);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const save = () => {
    onSave(normalizeAlias(draft));
    setEditing(false);
  };

  return (
    <View className="p-3 rounded-xl bg-surface-container border border-border flex-row items-center justify-between gap-2">
      <View className="flex-row items-center gap-2 flex-1 min-w-0">
        <Icon name="qr_code" size={20} className="text-secondary-container" />
        {editing ? (
          <TextInput
            value={draft}
            onChangeText={(v) => setDraft(normalizeAlias(v))}
            onSubmitEditing={save}
            autoFocus
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder={t('tools.kitty.cliqPlaceholder')}
            placeholderTextColor={color('muted')}
            accessibilityLabel={t('tools.kitty.cliqPlaceholder')}
            maxLength={CLIQ_MAX}
            className="flex-1 min-w-0 bg-surface border border-primary rounded-lg px-2.5 py-1 text-[13px] text-on-surface"
            style={{ fontFamily: 'SpaceGrotesk_700Bold', writingDirection: 'ltr' }}
          />
        ) : (
          <Pressable className="flex-1 min-w-0" onPress={() => setEditing(true)}>
            <Text className="text-[10px] text-on-surface-variant">
              {t('tools.kitty.cliqLabel')}
            </Text>
            {alias ? (
              <Text
                font="grotesk"
                className="text-[13px] text-on-surface font-bold"
                numberOfLines={1}
              >
                {alias}
              </Text>
            ) : (
              <Text className="text-[11px] text-muted">{t('tools.kitty.cliqEmpty')}</Text>
            )}
          </Pressable>
        )}
      </View>
      {editing ? (
        <Pressable
          onPress={save}
          className="px-2.5 py-1.5 rounded-lg bg-secondary-container active:bg-emerald flex-row items-center gap-1 active:scale-95"
        >
          <Icon name="check" size={15} className="text-on-secondary-container" />
          <Text font="rubik" className="text-[11px] text-on-secondary-container font-bold">
            {t('tools.kitty.cliqSave')}
          </Text>
        </Pressable>
      ) : alias ? (
        <View className="flex-row items-center gap-1.5">
          <Pressable
            onPress={() => {
              setDraft(alias);
              setEditing(true);
            }}
            accessibilityRole="button"
            accessibilityLabel={t('tools.kitty.cliqEdit')}
            className="w-8 h-8 rounded-lg bg-surface-container-high active:bg-surface-container-highest items-center justify-center"
          >
            <Icon name="edit" size={15} className="text-on-surface-variant" />
          </Pressable>
          <Pressable
            onPress={async () => {
              await copyText(alias);
              sfx.success();
              setCopied(true);
              timer.current = setTimeout(() => setCopied(false), 2500);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-surface-container-high active:bg-surface-container-highest border border-surface-container-highest flex-row items-center gap-1 active:scale-95"
          >
            <Icon name={copied ? 'done' : 'content_copy'} size={15} className="text-primary" />
            <Text font="rubik" className="text-[11px] text-primary font-bold">
              {copied ? t('tools.kitty.cliqCopied') : t('tools.kitty.cliqCopy')}
            </Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() => setEditing(true)}
          className="px-2.5 py-1.5 rounded-lg bg-surface-container-high active:bg-surface-container-highest border border-surface-container-highest flex-row items-center gap-1 active:scale-95"
        >
          <Icon name="add" size={15} className="text-primary" />
          <Text font="rubik" className="text-[11px] text-primary font-bold">
            {t('tools.kitty.cliqAdd')}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function AddPlayer({ onAdd }: { onAdd: (name: string) => void }) {
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
        placeholder={t('tools.kitty.addPlaceholder')}
        placeholderTextColor={color('muted')}
        accessibilityLabel={t('tools.kitty.addPlaceholder')}
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
          {t('tools.kitty.add')}
        </Text>
      </Pressable>
    </View>
  );
}

function PlayerRow({
  player,
  share,
  onToggle,
  onMethod,
}: {
  player: KittyPlayer;
  share: string;
  onToggle: () => void;
  onMethod: (method: 'cash' | 'cliq') => void;
}) {
  const { t } = useLocale();
  const paid = player.paid !== null;
  return (
    <View
      className={`p-2.5 rounded-xl border flex-row items-center justify-between gap-2 ${
        paid
          ? 'bg-tint-green border-secondary-container/30'
          : 'bg-tint-red border-error-container/30'
      }`}
    >
      <View className="flex-row items-center gap-2 flex-1 min-w-0">
        <Pressable
          onPress={onToggle}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: paid }}
          accessibilityLabel={paid ? t('tools.kitty.markUnpaid') : t('tools.kitty.markPaid')}
          className={`w-6 h-6 rounded-lg items-center justify-center ${
            paid ? 'bg-secondary-container' : 'bg-error-container/50'
          }`}
        >
          <Icon
            name={paid ? 'check' : 'close'}
            size={16}
            className={paid ? 'text-on-secondary-container' : 'text-error'}
          />
        </Pressable>
        <View className="flex-1 min-w-0">
          <Text font="rubik" className="text-[13px] text-on-surface font-bold" numberOfLines={1}>
            {player.isMe ? t('tools.kitty.you', { name: player.name }) : player.name}
          </Text>
          <Text className="text-[10px] text-on-surface-variant">
            {player.paid === 'cash'
              ? t('tools.kitty.paidCash')
              : player.paid === 'cliq'
                ? t('tools.kitty.paidCliq')
                : t('tools.kitty.unpaid')}
          </Text>
        </View>
      </View>
      <View className="flex-row items-center gap-1">
        <Text font="grotesk" className="text-[12px] text-primary font-bold me-1">
          {share}
        </Text>
        {paid ? (
          <View className="flex-row items-center gap-1">
            {(['cash', 'cliq'] as const).map((m) => {
              const on = player.paid === m;
              return (
                <Pressable
                  key={m}
                  onPress={() => onMethod(m)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  className={`px-1.5 py-0.5 rounded ${
                    on
                      ? m === 'cash'
                        ? 'bg-primary'
                        : 'bg-secondary-container'
                      : 'bg-surface-container-high'
                  }`}
                >
                  <Text
                    font="grotesk"
                    className={`text-[10px] ${
                      on
                        ? m === 'cash'
                          ? 'text-on-primary font-bold'
                          : 'text-white font-bold'
                        : 'text-on-surface-variant'
                    }`}
                  >
                    {t(`tools.kitty.${m}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Pressable
            onPress={onToggle}
            className="px-2 py-1 rounded bg-secondary-container/20 active:bg-secondary-container/30 border border-secondary-container/30"
          >
            <Text font="rubik" className="text-[11px] text-secondary font-bold">
              {t('tools.kitty.payNow')}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
