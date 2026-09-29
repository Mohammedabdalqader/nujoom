import { bidiIsolate, errorKey } from '@nujoom/shared';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { useInvitePreview, useJoinBooking } from '@/data/api';
import { tokenFromLink, type InvitePreview, type JoinReason } from '@/data/booking';
import type { Localized } from '@/data/catalog';
import { sfx } from '@/design/sound';
import { useTheme } from '@/design/theme';
import { useLocale } from '@/lib/locale';
import { rememberResume } from '@/lib/resume';
import { useSession } from '@/lib/session';
import { Icon, type IconName } from '@/ui/Icon';
import { Page } from '@/ui/Page';
import { Text } from '@/ui/Text';
import { useToast } from '@/ui/Toast';

/** Reason codes to translation keys (contract invites.md §5). */
const REASON_KEY: Record<JoinReason, string> = {
  already_joined: 'invites.reasons.alreadyJoined',
  not_onboarded: 'invites.reasons.notOnboarded',
  cancelled: 'invites.reasons.cancelled',
  started: 'invites.reasons.started',
  removed: 'invites.reasons.removed',
  youth_only: 'invites.reasons.youthOnly',
  recording_consent_required: 'invites.reasons.recordingConsent',
  guardian_required: 'invites.reasons.guardianRequired',
  full: 'invites.reasons.full',
};

function Button({
  label,
  onPress,
  kind = 'primary',
  busy = false,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'quiet';
  busy?: boolean;
}) {
  const { color } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityState={{ disabled: busy, busy }}
      className={
        kind === 'primary'
          ? 'min-h-[52px] rounded-xl bg-primary-container active:bg-primary items-center justify-center flex-row gap-2'
          : 'min-h-[44px] items-center justify-center'
      }
    >
      {busy ? <ActivityIndicator color={color('on-primary')} /> : null}
      <Text
        font={kind === 'primary' ? 'rubik' : undefined}
        className={
          kind === 'primary'
            ? 'text-[17px] text-on-primary font-bold'
            : 'text-[15px] text-on-surface-variant'
        }
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Header({ icon, title, body }: { icon: IconName; title: string; body?: string }) {
  return (
    <>
      <Icon name={icon} size={48} className="text-primary" />
      <Text font="rubik" className="text-[24px] text-on-surface font-bold">
        {title}
      </Text>
      {body ? (
        <Text className="text-[16px] leading-[25px] text-on-surface-variant">{body}</Text>
      ) : null}
    </>
  );
}

/**
 * A match's join link (`/j/<token>`, contract invites.md §7). Signed out → sign in and come back
 * here. Signed in → what the server says about the match and this person: the match card, then
 * Join, or the one reason they can't (with the way forward when there is one). A join shows as
 * done only after the server answers. Link holders never see who plays (§6).
 */
export function JoinScreen({ token }: { token: string }) {
  const { t } = useLocale();
  const router = useRouter();
  const session = useSession();
  const valid = tokenFromLink(token);

  if (!valid) {
    return (
      <Page className="gap-5 pt-10">
        <Header icon="error" title={t('invites.title')} body={t('invites.invalid')} />
        <Button kind="quiet" label={t('invites.home')} onPress={() => router.replace('/')} />
      </Page>
    );
  }
  if (session.status !== 'signedIn') {
    return (
      <Page className="gap-5 pt-10">
        <Header icon="sports_soccer" title={t('invites.title')} body={t('invites.signInBody')} />
        <Button
          label={t('invites.signIn')}
          onPress={() => {
            rememberResume(`/j/${valid}`);
            router.replace('/sign-in');
          }}
        />
      </Page>
    );
  }
  return <SignedInJoin token={valid} />;
}

function SignedInJoin({ token }: { token: string }) {
  const { t } = useLocale();
  const router = useRouter();
  const toast = useToast();
  const preview = useInvitePreview(token);
  const join = useJoinBooking();

  const openMatch = (bookingId: string) => {
    router.replace('/');
    router.push({ pathname: '/match-details/[id]', params: { id: bookingId } });
  };

  if (preview.isPending) {
    return (
      <Page className="gap-5 pt-16 items-center">
        <ActivityIndicator />
      </Page>
    );
  }
  if (preview.isError) {
    const key = errorKey(preview.error);
    const invalid = key === 'errors.invites.invalid';
    return (
      <Page className="gap-5 pt-10">
        <Header icon={invalid ? 'error' : 'wifi_off'} title={t('invites.title')} body={t(key)} />
        {invalid ? null : (
          <Button label={t('errors.retry')} onPress={() => void preview.refetch()} />
        )}
        <Button kind="quiet" label={t('invites.home')} onPress={() => router.replace('/')} />
      </Page>
    );
  }

  const match = preview.data;
  let action: { label: string; onPress: () => void; busy?: boolean } | null = null;
  if (match.canJoin) {
    action = {
      label: join.isPending ? t('invites.joining') : t('invites.join'),
      busy: join.isPending,
      onPress: () =>
        join.mutate(token, {
          onSuccess: (receipt) => {
            sfx.success();
            toast.show(t('invites.joined'));
            openMatch(receipt.id);
          },
        }),
    };
  } else if (match.reason === 'already_joined') {
    action = { label: t('invites.openMatch'), onPress: () => openMatch(match.id) };
  } else if (match.reason === 'not_onboarded') {
    action = {
      label: t('invites.finishSignUp'),
      onPress: () => {
        rememberResume(`/j/${token}`);
        router.replace('/onboarding');
      },
    };
  } else if (match.reason === 'recording_consent_required') {
    action = { label: t('invites.openSettings'), onPress: () => router.push('/settings') };
  }

  return (
    <Page className="gap-5 pt-8">
      <Header icon="sports_soccer" title={t('invites.title')} />
      <MatchCard match={match} />
      {match.reason ? (
        <Text accessibilityRole="alert" className="text-[15px] leading-[23px] text-on-surface">
          {t(REASON_KEY[match.reason])}
        </Text>
      ) : null}
      {join.isError ? (
        <Text accessibilityRole="alert" className="text-[14px] text-error">
          {t(errorKey(join.error))}
        </Text>
      ) : null}
      {action ? <Button {...action} /> : null}
      <Button kind="quiet" label={t('invites.home')} onPress={() => router.replace('/')} />
    </Page>
  );
}

function MatchCard({ match }: { match: InvitePreview }) {
  const { t, locale, day, date, time, jod, number } = useLocale();
  const name = (l: Localized | null) =>
    l ? ((locale === 'ar' ? (l.ar ?? l.en) : (l.en ?? l.ar)) ?? '') : '';
  const title = [name(match.venue), name(match.field)].filter(Boolean).join(' · ');
  return (
    <View className="bg-surface-container-low rounded-xl border border-border p-4 gap-1.5">
      <Text font="rubik" className="text-[17px] text-on-surface font-bold">
        {title}
      </Text>
      {match.city ? (
        <Text className="text-[13px] text-on-surface-variant">{name(match.city)}</Text>
      ) : null}
      <Text className="text-[14px] text-on-surface">
        {t('catalog.booking.when', {
          day: day(match.startsAt),
          date: date(match.startsAt),
          from: time(match.startsAt),
          to: time(match.endsAt),
        })}
      </Text>
      <View className="flex-row flex-wrap gap-x-3 gap-y-1">
        {match.playersPerSide !== null ? (
          <Text className="text-[13px] text-on-surface-variant">
            {t('matchDetails.size', { value: number(match.playersPerSide) })}
          </Text>
        ) : null}
        {match.openSpots !== null ? (
          <Text className="text-[13px] text-secondary font-bold">
            {t('invites.spotsLeft', { count: match.openSpots })}
          </Text>
        ) : null}
        <Text className="text-[13px] text-on-surface-variant">
          {match.recorded ? t('invites.recorded') : t('invites.unrecorded')}
        </Text>
      </View>
      {match.total !== null ? (
        <Text font="grotesk" className="text-[13px] text-primary font-bold">
          {t('catalog.booking.total', { total: jod(match.total) })}
        </Text>
      ) : null}
      {match.invitedBy ? (
        <Text className="text-[13px] text-on-surface-variant">
          {t('invites.invitedBy', { name: bidiIsolate(match.invitedBy) })}
        </Text>
      ) : null}
    </View>
  );
}
