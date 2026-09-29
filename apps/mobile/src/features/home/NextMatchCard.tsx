import { formatCountdown } from '@nujoom/shared';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Team, UpcomingMatch } from '@/data/types';
import { sfx } from '@/design/sound';
import { useLocale } from '@/lib/locale';
import { shareToWhatsApp } from '@/lib/share';
import { useNow } from '@/lib/useNow';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { useToast } from '@/ui/Toast';

function TeamBadge({ team }: { team: Team }) {
  const { t } = useLocale();
  const blue = team.kit === 'blue';
  return (
    <View className="items-center gap-1">
      <View
        className={`w-12 h-12 rounded-xl bg-surface-bright items-center justify-center shadow-md border ${
          blue ? 'border-primary/20' : 'border-secondary/20'
        }`}
      >
        <Text
          font="grotesk"
          className={`text-[16px] font-black ${blue ? 'text-primary' : 'text-secondary'}`}
        >
          {team.initials}
        </Text>
      </View>
      <Text className="text-[12px] text-on-surface font-bold">{team.name}</Text>
      <Text font="grotesk" className="text-[11px] text-on-surface-variant">
        {t(`kits.${team.kit}`)}
      </Text>
    </View>
  );
}

/**
 * The hero card: next booked match with a live countdown, teams and the details button. Sharing
 * shows only once the booking has a join link.
 */
export function NextMatchCard({ match }: { match: UpcomingMatch }) {
  const { t, pick, time } = useLocale();
  const router = useRouter();
  const toast = useToast();
  const now = useNow();
  const countdown = formatCountdown(new Date(match.startsAt).getTime() - now);
  const [teamA, teamB] = match.teams;

  const share = async () => {
    const text = t('home.nextMatch.shareText', {
      app: t('app.name'),
      teamA: teamA.name,
      teamB: teamB.name,
      pitch: pick(match.pitchName),
      time: time(match.startsAt),
      url: match.shareUrl,
    });
    if ((await shareToWhatsApp(text)) === 'copied') toast.show(t('common.copied'));
  };

  return (
    <View className="relative overflow-hidden rounded-xl bg-surface-container-low shadow-xl border border-border/60">
      <Image
        source={match.pitchPhotoUrl ? { uri: match.pitchPhotoUrl } : null}
        style={[StyleSheet.absoluteFill, { opacity: 0.4 }]}
        className="mix-blend-luminosity"
        contentFit="cover"
      />
      <View className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-surface-container-low/80 to-transparent" />

      <View className="p-4 gap-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2 bg-surface-container-highest/80 px-2.5 py-1 rounded-full">
            <Icon name="stadium" size={16} className="text-secondary" />
            <Text className="text-[12px] text-on-surface font-semibold">
              {pick(match.pitchName)}
            </Text>
          </View>
          {match.ranked ? (
            <View className="flex-row items-center gap-1.5 bg-surface/80 px-2.5 py-1 rounded-full">
              <View className="w-2 h-2 rounded-full bg-primary-container animate-pulse" />
              <Text
                font="grotesk"
                className="text-[11px] text-primary font-bold uppercase tracking-wider"
              >
                {t('home.nextMatch.ranked')}
              </Text>
            </View>
          ) : null}
        </View>

        <View className="flex-row items-center justify-between py-1">
          <TeamBadge team={teamA} />
          <View className="items-center">
            <Text
              font="grotesk"
              className="text-[11px] text-primary-container uppercase tracking-widest font-bold"
            >
              {t('home.nextMatch.startsIn')}
            </Text>
            <Text
              font="grotesk"
              className="text-[24px] leading-[30px] text-on-surface font-extrabold tracking-tight text-shadow-[0_0_12px_rgba(245,158,11,0.35)]"
            >
              {countdown}
            </Text>
            <View className="flex-row gap-2 mt-0.5">
              <Text className="text-[10px] text-on-surface-variant">
                {t('home.nextMatch.hours')}
              </Text>
              <Text className="text-[10px] text-on-surface-variant">•</Text>
              <Text className="text-[10px] text-on-surface-variant">
                {t('home.nextMatch.minutes')}
              </Text>
              <Text className="text-[10px] text-on-surface-variant">•</Text>
              <Text className="text-[10px] text-on-surface-variant">
                {t('home.nextMatch.seconds')}
              </Text>
            </View>
          </View>
          <TeamBadge team={teamB} />
        </View>

        <View className="flex-row items-center gap-2 pt-1">
          <Pressable
            onPress={() => {
              sfx.success();
              router.push({ pathname: '/match-details/[id]', params: { id: match.bookingId } });
            }}
            className="flex-1 h-12 bg-primary-container active:bg-primary rounded-lg flex-row items-center justify-center gap-2 shadow-[0_4px_16px_rgba(245,158,11,0.25)] active:scale-[0.98]"
          >
            <Text
              font="rubik"
              className="text-[18px] leading-[24px] text-on-primary-container font-bold text-center shrink"
            >
              {t('home.nextMatch.details')}
            </Text>
            <Icon name="arrow_back" size={20} directional className="text-on-primary-container" />
          </Pressable>
          {match.shareUrl ? (
            <Pressable
              onPress={share}
              accessibilityRole="button"
              accessibilityLabel={t('home.nextMatch.share')}
              className="h-12 w-12 bg-surface-container-high active:bg-surface-bright rounded-lg items-center justify-center"
            >
              <Icon name="share" size={20} className="text-on-surface" />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

/** Shown instead of the hero card when the player has no upcoming booking. */
export function NoMatchCard() {
  const { t } = useLocale();
  const router = useRouter();
  return (
    <View className="rounded-xl bg-surface-container-low shadow-xl border border-border/60 p-4 gap-3">
      <View className="flex-row items-center gap-3">
        <View className="w-12 h-12 rounded-xl bg-surface-container-high items-center justify-center">
          <Icon name="stadium" size={26} className="text-secondary" />
        </View>
        <View className="flex-1">
          <Text font="rubik" className="text-[18px] text-on-surface font-bold">
            {t('home.nextMatch.emptyTitle')}
          </Text>
          <Text className="text-[12px] text-on-surface-variant">
            {t('home.nextMatch.emptyBody')}
          </Text>
        </View>
      </View>
      <Pressable
        onPress={() => {
          sfx.clipBeep();
          router.navigate('/pitches');
        }}
        className="h-12 bg-primary-container active:bg-primary rounded-lg flex-row items-center justify-center gap-2 shadow-[0_4px_16px_rgba(245,158,11,0.25)] active:scale-[0.98]"
      >
        <Icon name="bolt" size={20} className="text-on-primary-container" />
        <Text font="rubik" className="text-[18px] text-on-primary-container font-bold">
          {t('home.nextMatch.emptyCta')}
        </Text>
      </Pressable>
    </View>
  );
}
