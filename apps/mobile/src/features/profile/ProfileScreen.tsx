import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { useFriends, useMe, useMyClips, useProfileExtras } from '@/data/api';
import type { Me } from '@/data/types';
import { sfx } from '@/design/sound';
import { CardActions } from '@/features/profile/CardActions';
import { CareerStats } from '@/features/profile/CareerStats';
import { EndorsementsSection } from '@/features/profile/EndorsementsSection';
import { FriendsSection } from '@/features/profile/FriendsSection';
import { HighlightsSection } from '@/features/profile/HighlightsSection';
import { PlayerCard } from '@/features/profile/PlayerCard';
import { ProgressSection } from '@/features/profile/ProgressSection';
import { ThemeCard } from '@/features/profile/ThemeCard';
import { WalletSection } from '@/features/profile/WalletSection';
import { useLocale } from '@/lib/locale';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

function StatusBadges({ me }: { me: Me }) {
  const { t, pick } = useLocale();
  const router = useRouter();
  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center gap-1.5 flex-wrap flex-1">
        {/* No "verified account" badge: every sign-in already confirms the email (C-012). */}
        <View className="flex-row items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high">
          <Icon name="location_on" size={14} className="text-on-surface-variant" />
          <Text font="grotesk" className="text-[11px] font-bold text-on-surface-variant">
            {t('profile.cityVisibility', {
              city: pick(me.city),
              visibility: t(`profile.visibility.${me.visibility}`),
            })}
          </Text>
        </View>
        {me.rankingEligible ? (
          <View className="flex-row items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container">
            <Icon name="verified" size={14} className="text-primary" />
            <Text font="grotesk" className="text-[11px] text-on-surface-variant">
              {t('profile.certified')}
            </Text>
          </View>
        ) : null}
      </View>
      <Pressable
        onPress={() => {
          sfx.clipBeep();
          router.push('/settings');
        }}
        accessibilityRole="button"
        accessibilityLabel={t('profile.edit')}
        className="w-9 h-9 rounded-full bg-surface-container-high active:bg-surface-bright items-center justify-center"
      >
        <Icon name="tune" size={18} className="text-on-surface" />
      </Pressable>
    </View>
  );
}

/** Tab 5 — ملفي: FIFA card, theme, career stats, progress charts, stars, squad, clips, respect. */
export function ProfileScreen() {
  const me = useMe().data;
  const extras = useProfileExtras().data;
  const friends = useFriends().data ?? [];
  const clips = useMyClips().data ?? [];
  if (!me || !extras) return <Screen>{null}</Screen>;

  return (
    <Screen className="pb-10">
      <View className="absolute top-20 -end-10 w-72 h-72 rounded-full bg-primary/10 blur-[100px]" />
      <View className="absolute top-80 -start-14 w-80 h-80 rounded-full bg-secondary-container/10 blur-[110px]" />
      <View className="px-4 pt-2">
        <StatusBadges me={me} />
      </View>
      <View className="px-4 pt-3">
        <PlayerCard me={me} />
        <CardActions me={me} />
      </View>
      <View className="px-4 pt-4">
        <ThemeCard />
      </View>
      <View className="px-4 pt-6">
        <CareerStats me={me} />
      </View>
      <View className="px-4 pt-6">
        <ProgressSection months={extras.progress} xp={me.xp} />
      </View>
      <View className="px-4 pt-6">
        <WalletSection wallet={extras.wallet} />
      </View>
      <View className="px-4 pt-6">
        <FriendsSection friends={friends} />
      </View>
      <View className="px-4 pt-6">
        <HighlightsSection clips={clips} total={extras.clipsCount} />
      </View>
      <View className="px-4 pt-6">
        <EndorsementsSection items={extras.endorsements} />
      </View>
    </Screen>
  );
}
