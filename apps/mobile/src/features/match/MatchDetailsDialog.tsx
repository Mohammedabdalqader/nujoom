import { bidiIsolate, errorKey } from '@nujoom/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { useCancelBooking, useLeaveBooking, useMatchDetails, useRemovePlayer } from '@/data/api';
import type { LineupPlayer, MatchDetails, Team } from '@/data/types';
import { sfx } from '@/design/sound';
import { useLocale } from '@/lib/locale';
import { shareToWhatsApp } from '@/lib/share';
import { useNow } from '@/lib/useNow';
import { describeKickoff } from '@/lib/when';
import { Dialog, DialogLoading } from '@/ui/Dialog';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { useToast } from '@/ui/Toast';

/**
 * "تشكيلة وتفاصيل المباراة": both line-ups with bibs and form, the pitch, time, size and who
 * films it (or that it isn't filmed). Players not in a team yet are listed below the line-ups.
 * Only the booking's players can open it (booking_details). Sharing needs the join link. The
 * organizer can cancel before kick-off and remove players; a player can leave. Each asks first.
 * The total is paid in cash at the pitch.
 */
export function MatchDetailsDialog({ bookingId }: { bookingId: string }) {
  const query = useMatchDetails(bookingId);
  if (query.isPending) return <DialogLoading />;
  if (!query.data) return <NotFound />;
  return <Details match={query.data} />;
}

function Header() {
  const { t } = useLocale();
  const router = useRouter();
  return (
    <View className="flex-row items-center justify-between border-b border-surface-container-high pb-3">
      <View className="flex-row items-center gap-2 flex-1">
        <Icon name="sports_soccer" size={22} className="text-primary" />
        <Text font="rubik" className="text-[18px] text-on-surface font-bold shrink">
          {t('matchDetails.title')}
        </Text>
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
  );
}

function NotFound() {
  const { t } = useLocale();
  return (
    <Dialog width="md">
      <Header />
      <Text className="py-6 text-center text-[13px] text-on-surface-variant">
        {t('matchDetails.notFound')}
      </Text>
    </Dialog>
  );
}

function Details({ match }: { match: MatchDetails }) {
  const { t, locale, pick, number, jod } = useLocale();
  const toast = useToast();
  const [teamA, teamB] = match.teams;
  const when = describeKickoff(match.startsAt, locale, t);
  const minutes = Math.round(
    (new Date(match.endsAt).getTime() - new Date(match.startsAt).getTime()) / 60_000,
  );
  const nameOf = (p: LineupPlayer) =>
    p.captain ? t('matchDetails.captain', { name: p.name }) : p.name;

  const share = async () => {
    sfx.success();
    const list = (players: LineupPlayer[]) =>
      players.map((p) => `${p.bib ?? '-'}. ${nameOf(p)}`).join('\n');
    const text = t('matchDetails.shareText', {
      when,
      teamA: teamA.name,
      teamB: teamB.name,
      pitch: pick(match.pitchName),
      listA: list(match.lineups[0]),
      listB: list(match.lineups[1]),
      app: t('app.name'),
      url: match.shareUrl,
    });
    if ((await shareToWhatsApp(text)) === 'copied') toast.show(t('common.copied'));
  };

  return (
    <Dialog
      width="md"
      scroll
      className="bg-surface-container border border-primary/40 p-4 max-h-[90%]"
    >
      <Header />

      <View className="bg-surface-container-low p-3 rounded-xl border border-surface-container-high items-center gap-2">
        <Text font="grotesk" className="text-[11px] text-secondary font-bold text-center">
          {t('matchDetails.meta', { pitch: pick(match.pitchName), when })}
        </Text>
        <View className="flex-row items-center justify-center gap-3">
          <Text font="rubik" className="text-[16px] text-primary font-black shrink text-center">
            {teamA.name}
          </Text>
          <Text className="text-on-surface-variant font-bold">VS</Text>
          <Text font="rubik" className="text-[16px] text-secondary font-black shrink text-center">
            {teamB.name}
          </Text>
        </View>
        <View className="flex-row flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-1">
          <Text className="text-[12px] text-on-surface-variant">
            {t('matchDetails.size', { value: number(match.size) })}
          </Text>
          <Text className="text-[12px] text-on-surface-variant">•</Text>
          <Text className="text-[12px] text-on-surface-variant">
            {t('matchDetails.duration', { value: number(minutes) })}
          </Text>
        </View>
        {match.total !== null ? (
          <Text font="grotesk" className="text-[12px] text-primary font-bold">
            {t('catalog.booking.total', { total: jod(match.total) })}
          </Text>
        ) : null}
        {match.cancelled ? (
          <Text className="text-[12px] text-error font-bold">
            {t('matchDetails.cancelledNote')}
          </Text>
        ) : null}
        <Text className="text-[12px] text-on-surface-variant">
          {!match.recorded
            ? t('matchDetails.unrecorded')
            : match.recordingBy
              ? t('matchDetails.recordedBy', { name: match.recordingBy })
              : t('matchDetails.notRecorded')}
        </Text>
      </View>

      <View className="flex-row gap-2 items-start">
        <Lineup team={teamA} players={match.lineups[0]} nameOf={nameOf} />
        <Lineup team={teamB} players={match.lineups[1]} nameOf={nameOf} />
      </View>

      {match.unassigned.length ? (
        <View className="bg-surface-container-low p-3 rounded-xl border border-surface-container-high gap-1">
          <Text font="rubik" className="text-[13px] text-on-surface font-bold">
            {t('matchDetails.unassigned')}
          </Text>
          <Text className="text-[12px] text-on-surface-variant">
            {match.unassigned.map(nameOf).join('، ')}
          </Text>
        </View>
      ) : null}

      {match.shareUrl ? (
        <Pressable
          onPress={() => void share()}
          className="w-full py-3 rounded-xl bg-secondary-container active:bg-emerald flex-row items-center justify-center gap-2 shadow-lg"
        >
          <Icon name="share" size={20} className="text-on-secondary-container" />
          <Text font="rubik" className="text-[16px] text-on-secondary-container font-bold">
            {t('matchDetails.share')}
          </Text>
        </Pressable>
      ) : null}

      <ManagePlayers match={match} />
      <LeaveMatch match={match} />
      <CancelBooking match={match} />
    </Dialog>
  );
}

/** The organizer's cancel, before kick-off only, behind a confirmation (the server checks too). */
function CancelBooking({ match }: { match: MatchDetails }) {
  const { t } = useLocale();
  const router = useRouter();
  const toast = useToast();
  const now = useNow(30_000);
  const cancel = useCancelBooking();
  const [confirming, setConfirming] = useState(false);
  if (!match.organizer || match.cancelled || new Date(match.startsAt).getTime() <= now) return null;

  if (!confirming) {
    return (
      <Pressable
        onPress={() => setConfirming(true)}
        accessibilityRole="button"
        className="self-center px-4 py-2 rounded-lg border border-error/50 active:bg-error/10"
      >
        <Text font="rubik" className="text-[13px] text-error font-bold">
          {t('matchDetails.cancel')}
        </Text>
      </Pressable>
    );
  }
  return (
    <View className="bg-surface-container-low p-3 rounded-xl border border-error/50 gap-2">
      <Text className="text-[13px] text-on-surface">{t('matchDetails.cancelConfirm')}</Text>
      {cancel.isError ? (
        <Text accessibilityRole="alert" className="text-[12px] text-error">
          {t(errorKey(cancel.error))}
        </Text>
      ) : null}
      <View className="flex-row gap-2">
        <Pressable
          onPress={() =>
            cancel.mutate(match.bookingId, {
              onSuccess: () => {
                toast.show(t('matchDetails.cancelDone'));
                router.back();
              },
            })
          }
          disabled={cancel.isPending}
          accessibilityRole="button"
          accessibilityState={{ disabled: cancel.isPending, busy: cancel.isPending }}
          className="flex-1 py-2.5 rounded-lg bg-error-container active:opacity-80 items-center disabled:opacity-50"
        >
          <Text font="rubik" className="text-[14px] text-on-error-container font-bold">
            {cancel.isPending ? t('matchDetails.cancelling') : t('matchDetails.cancelYes')}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setConfirming(false)}
          disabled={cancel.isPending}
          accessibilityRole="button"
          className="flex-1 py-2.5 rounded-lg bg-surface-container-high active:bg-surface-container-highest items-center"
        >
          <Text font="rubik" className="text-[14px] text-on-surface font-bold">
            {t('matchDetails.cancelNo')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function Lineup({
  team,
  players,
  nameOf,
}: {
  team: Team;
  players: LineupPlayer[];
  nameOf: (p: LineupPlayer) => string;
}) {
  const { t } = useLocale();
  const blue = team.kit === 'blue';
  return (
    <View
      className={`flex-1 bg-surface-container-low p-3 rounded-xl border ${
        blue ? 'border-team-blue/30' : 'border-primary-container/30'
      }`}
    >
      <View className="flex-row items-center gap-1.5 mb-2 pb-1 border-b border-surface-container-high">
        <View
          className={`w-2.5 h-2.5 rounded-full ${blue ? 'bg-team-blue' : 'bg-primary-container'}`}
        />
        <Text font="rubik" className="text-[14px] text-on-surface font-bold shrink">
          {t('matchDetails.team', { name: team.name, kit: t(`matchDetails.kit.${team.kit}`) })}
        </Text>
      </View>
      <View className="gap-1.5">
        {players.map((p) => (
          <View key={p.id} className="flex-row items-center justify-between gap-1">
            <Text className="text-[11px] text-on-surface font-medium shrink" numberOfLines={1}>
              {nameOf(p)}
            </Text>
            {p.form !== null ? (
              <Text
                font="grotesk"
                className={`text-[11px] font-bold ${blue ? 'text-primary' : 'text-secondary'}`}
              >
                {p.form.toFixed(1)}
              </Text>
            ) : null}
          </View>
        ))}
        {players.length === 0 ? (
          <Text className="text-[11px] text-muted">{t('matchDetails.empty')}</Text>
        ) : null}
      </View>
    </View>
  );
}

/** Yes / no under a question, for actions that can't be undone from here. */
function Confirm({
  question,
  yes,
  no,
  busy,
  error,
  onYes,
  onNo,
}: {
  question: string;
  yes: string;
  no: string;
  busy: boolean;
  error: unknown;
  onYes: () => void;
  onNo: () => void;
}) {
  const { t } = useLocale();
  return (
    <View className="bg-surface-container-low p-3 rounded-xl border border-error/50 gap-2">
      <Text className="text-[13px] text-on-surface">{question}</Text>
      {error ? (
        <Text accessibilityRole="alert" className="text-[12px] text-error">
          {t(errorKey(error))}
        </Text>
      ) : null}
      <View className="flex-row gap-2">
        <Pressable
          onPress={onYes}
          disabled={busy}
          accessibilityRole="button"
          accessibilityState={{ disabled: busy, busy }}
          className="flex-1 py-2.5 rounded-lg bg-error-container active:opacity-80 items-center disabled:opacity-50"
        >
          <Text font="rubik" className="text-[14px] text-on-error-container font-bold">
            {yes}
          </Text>
        </Pressable>
        <Pressable
          onPress={onNo}
          disabled={busy}
          accessibilityRole="button"
          className="flex-1 py-2.5 rounded-lg bg-surface-container-high active:bg-surface-container-highest items-center"
        >
          <Text font="rubik" className="text-[14px] text-on-surface font-bold">
            {no}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/** The organizer removes a player before kick-off; the same link won't let them back in. */
function ManagePlayers({ match }: { match: MatchDetails }) {
  const { t } = useLocale();
  const toast = useToast();
  const now = useNow(30_000);
  const remove = useRemovePlayer();
  const [asking, setAsking] = useState<string | null>(null);
  if (
    !match.organizer ||
    match.cancelled ||
    match.removable.length === 0 ||
    new Date(match.startsAt).getTime() <= now
  ) {
    return null;
  }
  return (
    <View className="bg-surface-container-low p-3 rounded-xl border border-surface-container-high gap-2">
      <Text font="rubik" className="text-[13px] text-on-surface font-bold">
        {t('matchDetails.manage')}
      </Text>
      {match.removable.map((p) =>
        asking === p.playerRef ? (
          <Confirm
            key={p.playerRef}
            question={t('matchDetails.removeConfirm', { name: bidiIsolate(p.name) })}
            yes={t('matchDetails.removeYes')}
            no={t('matchDetails.removeNo')}
            busy={remove.isPending}
            error={remove.error}
            onYes={() =>
              remove.mutate(
                { bookingId: match.bookingId, playerRef: p.playerRef },
                {
                  onSuccess: () => {
                    setAsking(null);
                    toast.show(t('matchDetails.removed'));
                  },
                },
              )
            }
            onNo={() => {
              remove.reset();
              setAsking(null);
            }}
          />
        ) : (
          <View key={p.playerRef} className="flex-row items-center justify-between gap-2">
            <Text className="text-[13px] text-on-surface shrink" numberOfLines={1}>
              {p.name}
            </Text>
            <Pressable
              onPress={() => {
                remove.reset();
                setAsking(p.playerRef);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${t('matchDetails.remove')} ${p.name}`}
              className="px-3 py-1.5 rounded-lg border border-error/50 active:bg-error/10"
            >
              <Text font="rubik" className="text-[12px] text-error font-bold">
                {t('matchDetails.remove')}
              </Text>
            </Pressable>
          </View>
        ),
      )}
    </View>
  );
}

/** A player (not the organizer) leaves before kick-off; they may come back through the link. */
function LeaveMatch({ match }: { match: MatchDetails }) {
  const { t } = useLocale();
  const router = useRouter();
  const toast = useToast();
  const now = useNow(30_000);
  const leave = useLeaveBooking();
  const [asking, setAsking] = useState(false);
  if (!match.canLeave || new Date(match.startsAt).getTime() <= now) return null;
  if (!asking) {
    return (
      <Pressable
        onPress={() => setAsking(true)}
        accessibilityRole="button"
        className="self-center px-4 py-2 rounded-lg border border-error/50 active:bg-error/10"
      >
        <Text font="rubik" className="text-[13px] text-error font-bold">
          {t('matchDetails.leave')}
        </Text>
      </Pressable>
    );
  }
  return (
    <Confirm
      question={t('matchDetails.leaveConfirm')}
      yes={t('matchDetails.leaveYes')}
      no={t('matchDetails.leaveNo')}
      busy={leave.isPending}
      error={leave.error}
      onYes={() =>
        leave.mutate(match.bookingId, {
          onSuccess: () => {
            toast.show(t('matchDetails.left'));
            router.back();
          },
        })
      }
      onNo={() => setAsking(false)}
    />
  );
}
