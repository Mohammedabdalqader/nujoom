import {
  ADULT_AGE,
  APP_NAME,
  bidiIsolate,
  currentAge,
  digitsOnly,
  dobFromParts,
  errorKey,
  formatDateTime,
  normalizeDisplayName,
} from '@nujoom/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { getSource, type GuardianInvite } from '@/data/source';
import { useTheme } from '@/design/theme';
import { useLocale } from '@/lib/locale';
import { rememberResume } from '@/lib/resume';
import { accountKey, useAccount, useSession, useSignOut } from '@/lib/session';
import { Field } from '@/ui/Field';
import { Icon, type IconName } from '@/ui/Icon';
import { ChoiceChips, Page } from '@/ui/Page';
import { Text } from '@/ui/Text';

const VISIBILITIES = ['private', 'city', 'public'] as const;
type Visibility = (typeof VISIBILITIES)[number];

function Button({
  label,
  onPress,
  kind = 'primary',
  busy = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'outline' | 'quiet' | 'danger';
  busy?: boolean;
  disabled?: boolean;
}) {
  const { color } = useTheme();
  const box = {
    primary: 'min-h-[52px] rounded-xl bg-primary-container active:bg-primary',
    outline: 'min-h-[52px] rounded-xl border border-primary/60',
    danger: 'min-h-[52px] rounded-xl border border-error/60',
    quiet: 'min-h-[44px]',
  }[kind];
  const text = {
    primary: 'text-[17px] text-on-primary font-bold',
    outline: 'text-[16px] text-primary font-bold',
    danger: 'text-[16px] text-error font-bold',
    quiet: 'text-[15px] text-on-surface-variant',
  }[kind];
  return (
    <Pressable
      onPress={onPress}
      disabled={busy || disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: busy || disabled }}
      className={`${box} items-center justify-center flex-row gap-2 ${disabled ? 'opacity-50' : ''}`}
    >
      {busy ? <ActivityIndicator color={color('on-primary')} /> : null}
      <Text font={kind === 'quiet' ? undefined : 'rubik'} className={text}>
        {label}
      </Text>
    </Pressable>
  );
}

function Header({ icon, title, body }: { icon: IconName; title: string; body?: string }) {
  // Titles can start with the youth's name in the other script; on the web `dir="auto"` would
  // then flip the whole sentence, so the paragraph direction follows the app language.
  const { rtl } = useLocale();
  const direction = { writingDirection: rtl ? ('rtl' as const) : ('ltr' as const) };
  return (
    <>
      <Icon name={icon} size={48} className="text-primary" />
      <Text font="rubik" className="text-[24px] text-on-surface font-bold" style={direction}>
        {title}
      </Text>
      {body ? (
        <Text className="text-[16px] leading-[25px] text-on-surface-variant" style={direction}>
          {body}
        </Text>
      ) : null}
    </>
  );
}

/**
 * The guardian's side of S1-11 (spec §7): opened from the approval email's link
 * (`/guardian/accept/<token>`). Signed out → sign in first and come back; signed in as someone
 * else, or an expired/used link → say so without revealing anything about the invite; otherwise
 * approve (visibility, recording yes/no, and name/date of birth for a guardian without a
 * profile) or decline.
 */
export function GuardianApproveScreen({ token }: { token: string }) {
  const { t } = useLocale();
  const router = useRouter();
  const session = useSession();

  if (session.status !== 'signedIn') {
    return (
      <Page className="gap-5 pt-10">
        <Header
          icon="family_restroom"
          title={t('guardianApprove.title')}
          body={t('guardianApprove.signInBody')}
        />
        <Button
          label={t('guardianApprove.signIn')}
          onPress={() => {
            rememberResume(`/guardian/accept/${token}`);
            router.replace('/sign-in');
          }}
        />
      </Page>
    );
  }
  return <SignedInApproval token={token} email={session.session.email ?? ''} />;
}

function SignedInApproval({ token, email }: { token: string; email: string }) {
  const { t } = useLocale();
  const router = useRouter();
  const signOut = useSignOut();
  const invite = useQuery({
    queryKey: ['guardianInvite', token],
    queryFn: () => getSource().guardian.preview(token),
    staleTime: Infinity,
  });

  if (invite.isPending) {
    return (
      <Page className="gap-5 pt-16 items-center">
        <ActivityIndicator />
      </Page>
    );
  }
  if (invite.isError) {
    return (
      <Page className="gap-5 pt-10">
        <Header
          icon="wifi_off"
          title={t('guardianApprove.title')}
          body={t(errorKey(invite.error))}
        />
        <Button label={t('errors.retry')} onPress={() => void invite.refetch()} />
      </Page>
    );
  }
  if (!invite.data) {
    return (
      <Page className="gap-5 pt-10">
        <Header
          icon="error"
          title={t('guardianApprove.title')}
          body={t('guardianApprove.invalidBody', { email: bidiIsolate(email) })}
        />
        <Button
          kind="outline"
          label={t('guardianApprove.switchAccount')}
          onPress={() => {
            rememberResume(`/guardian/accept/${token}`);
            void signOut();
          }}
        />
        <Button
          kind="quiet"
          label={t('guardianApprove.close')}
          onPress={() => router.replace('/')}
        />
      </Page>
    );
  }
  return <ApprovalForm token={token} invite={invite.data} />;
}

function ApprovalForm({ token, invite }: { token: string; invite: GuardianInvite }) {
  const { t, locale, rtl } = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useSession();
  const account = useAccount();
  const signOut = useSignOut();
  const [visibility, setVisibility] = useState<Visibility>('private');
  const [recording, setRecording] = useState<'yes' | 'no' | null>(null);
  const [name, setName] = useState('');
  const [dob, setDob] = useState({ day: '', month: '', year: '' });
  const [shown, setShown] = useState(false); // field errors after the first attempt
  const [busy, setBusy] = useState<'approve' | 'decline' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDecline, setConfirmDecline] = useState(false);
  const [outcome, setOutcome] = useState<'approved' | 'declined' | null>(null);

  const youth = bidiIsolate(invite.youthName);
  const dobIso = dobFromParts(dob.day, dob.month, dob.year);
  const nameOk = normalizeDisplayName(name).length >= 2;
  const dobOk = dobIso !== null && currentAge(dobIso) >= ADULT_AGE;
  const detailsOk = !invite.needsDetails || (nameOk && dobOk);

  const finish = (result: 'approved' | 'declined') => {
    setOutcome(result);
    void queryClient.invalidateQueries({ queryKey: accountKey(session?.userId) });
  };

  const approve = async () => {
    setShown(true);
    if (!detailsOk) return;
    setBusy('approve');
    setError(null);
    try {
      await getSource().guardian.accept(token, {
        visibility,
        recording: recording === null ? null : recording === 'yes',
        ...(invite.needsDetails ? { name: normalizeDisplayName(name), dob: dobIso! } : {}),
      });
      finish('approved');
    } catch (e) {
      setError(t(errorKey(e)));
    } finally {
      setBusy(null);
    }
  };

  const decline = async () => {
    setBusy('decline');
    setError(null);
    try {
      await getSource().guardian.decline(token);
      finish('declined');
    } catch (e) {
      setError(t(errorKey(e)));
    } finally {
      setBusy(null);
    }
  };

  if (outcome) {
    // A guardian-only account has no player profile: the journey would ask them to onboard.
    const guardianOnly = account.data?.stage === 'onboarding';
    return (
      <Page className="gap-5 pt-10">
        <Header
          icon={outcome === 'approved' ? 'verified' : 'block'}
          title={
            outcome === 'approved'
              ? t('guardianApprove.approved', { name: youth })
              : t('guardianApprove.declined')
          }
          body={guardianOnly ? t('guardianApprove.guardianOnly') : undefined}
        />
        {guardianOnly ? (
          <>
            <Button
              kind="outline"
              label={t('guardianApprove.signOut')}
              onPress={() => void signOut()}
            />
            <Button
              kind="quiet"
              label={t('guardianApprove.createProfile')}
              onPress={() => router.replace('/')}
            />
          </>
        ) : (
          <Button label={t('guardianApprove.done')} onPress={() => router.replace('/')} />
        )}
      </Page>
    );
  }

  return (
    <Page className="gap-5 pt-10">
      <Header
        icon="family_restroom"
        title={t('guardianApprove.intro', { name: youth, app: APP_NAME[locale] })}
        body={t('guardianApprove.explain')}
      />
      {invite.expiresAt ? (
        <Text font="grotesk" className="text-[12px] text-on-surface-variant">
          {t('guardianApprove.expires', {
            date: formatDateTime(invite.expiresAt, locale, { dateStyle: 'medium' }),
          })}
        </Text>
      ) : null}

      <View className="rounded-2xl bg-surface-container border border-border p-4 gap-3">
        <ChoiceChips
          label={t('guardianApprove.visibility')}
          options={VISIBILITIES.map((v) => ({
            value: v,
            label: t(`guardianApprove.visibilityOptions.${v}`),
          }))}
          value={visibility}
          onChange={setVisibility}
        />
        <Text className="text-[14px] leading-[22px] text-on-surface-variant">
          {t(`guardianApprove.visibilityHint.${visibility}`)}
        </Text>
      </View>

      <View className="rounded-2xl bg-surface-container border border-border p-4 gap-3">
        <ChoiceChips
          label={t('guardianApprove.recording')}
          options={[
            { value: 'yes' as const, label: t('guardianApprove.recordingYes') },
            { value: 'no' as const, label: t('guardianApprove.recordingNo') },
          ]}
          value={recording}
          onChange={setRecording}
        />
        <Text className="text-[14px] leading-[22px] text-on-surface-variant">
          {t('guardianApprove.recordingHint')}
        </Text>
      </View>

      {invite.needsDetails ? (
        <View className="rounded-2xl bg-surface-container border border-border p-4 gap-3">
          <Text font="rubik" className="text-[17px] text-on-surface font-bold">
            {t('guardianApprove.yourDetails')}
          </Text>
          <Text className="text-[14px] leading-[22px] text-on-surface-variant">
            {t('guardianApprove.yourDetailsHint')}
          </Text>
          <Field
            label={t('guardianApprove.name')}
            value={name}
            onChangeText={setName}
            autoComplete="name"
            maxLength={40}
            error={shown && !nameOk ? t('guardianApprove.nameError') : null}
          />
          <View className="gap-1.5">
            <Text font="grotesk" className="text-[12px] text-on-surface-variant">
              {t('onboarding.dob')}
            </Text>
            <View className="flex-row gap-2">
              {(
                [
                  ['day', 2],
                  ['month', 2],
                  ['year', 4],
                ] as const
              ).map(([part, max]) => (
                <View key={part} className="flex-1">
                  <Field
                    label={t(`onboarding.${part}`)}
                    value={dob[part]}
                    onChangeText={(v) =>
                      setDob((d) => ({ ...d, [part]: digitsOnly(v).slice(0, max) }))
                    }
                    keyboardType="number-pad"
                    maxLength={max}
                    ltr
                  />
                </View>
              ))}
            </View>
            {shown && !dobOk ? (
              <Text className="text-[13px] text-error">{t('guardianApprove.dobError')}</Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {error ? (
        <Text accessibilityLiveRegion="polite" className="text-[15px] text-error">
          {error}
        </Text>
      ) : null}

      <Button
        label={busy === 'approve' ? t('guardianApprove.approving') : t('guardianApprove.approve')}
        busy={busy === 'approve'}
        disabled={busy !== null}
        onPress={() => void approve()}
      />
      {confirmDecline ? (
        <View className="rounded-xl border border-error/40 p-3 gap-3">
          <Text
            className="text-[15px] leading-[23px] text-on-surface"
            style={{ writingDirection: rtl ? 'rtl' : 'ltr' }}
          >
            {t('guardianApprove.declineConfirm', { name: youth })}
          </Text>
          <Button
            kind="danger"
            label={t('guardianApprove.declineYes')}
            busy={busy === 'decline'}
            disabled={busy !== null}
            onPress={() => void decline()}
          />
          <Button
            kind="quiet"
            label={t('guardianStep.cancel')}
            onPress={() => setConfirmDecline(false)}
          />
        </View>
      ) : (
        <Button
          kind="quiet"
          label={t('guardianApprove.decline')}
          disabled={busy !== null}
          onPress={() => setConfirmDecline(true)}
        />
      )}
    </Page>
  );
}
