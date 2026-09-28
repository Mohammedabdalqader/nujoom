import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { useFriends, useHomeFeed, useMe } from '@/data/api';
import { ClipCard } from '@/features/clips/ClipCard';
import { FriendsBar } from '@/features/home/FriendsBar';
import { Greeting } from '@/features/home/Greeting';
import { MatchToolkit } from '@/features/home/MatchToolkit';
import { MissingOneSpotlight } from '@/features/home/MissingOneSpotlight';
import { NextMatchCard, NoMatchCard } from '@/features/home/NextMatchCard';
import { PulseFeed } from '@/features/home/PulseFeed';
import { QuickActions } from '@/features/home/QuickActions';
import { useLocale } from '@/lib/locale';
import { Screen } from '@/ui/Screen';
import { SectionHeader } from '@/ui/SectionHeader';
import { Text } from '@/ui/Text';

/** Tab 1 — الرئيسية: next match, match tools, quick actions, open spots, squad, clips, pulse. */
export function HomeScreen() {
  const { t, pick } = useLocale();
  const router = useRouter();
  const me = useMe().data;
  const feed = useHomeFeed().data;
  const online = useFriends().data?.filter((f) => f.presence === 'online').length ?? 0;
  if (!me || !feed) return <Screen>{null}</Screen>;

  return (
    <Screen className="gap-5 pb-8">
      <View className="px-4 gap-2">
        <Greeting me={me} />
        {feed.nextMatch ? <NextMatchCard match={feed.nextMatch} /> : <NoMatchCard />}
      </View>

      <View className="px-4">
        <MatchToolkit bookingId={feed.nextMatch?.bookingId ?? null} />
      </View>

      <View className="px-4">
        <QuickActions
          city={pick(me.city)}
          missingCount={feed.missingOne.length}
          firstClip={feed.trendingClips[0]}
        />
      </View>

      <MissingOneSpotlight items={feed.missingOne} />

      <View className="px-4">
        <FriendsBar online={online} />
      </View>

      <View className="gap-2">
        <SectionHeader
          className="px-4"
          icon="local_fire_department"
          iconSize={22}
          title={t('home.clips.title')}
          trailing={
            <Pressable onPress={() => router.navigate('/match')} hitSlop={8}>
              <Text font="grotesk" className="text-[11px] text-primary font-bold">
                {t('home.clips.all')}
              </Text>
            </Pressable>
          }
        />
        {feed.trendingClips.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="px-4 gap-3 py-1"
            snapToInterval={268}
            decelerationRate="fast"
          >
            {feed.trendingClips.map((clip) => (
              <ClipCard key={clip.id} clip={clip} />
            ))}
          </ScrollView>
        ) : (
          <Text className="px-4 text-[12px] text-on-surface-variant">{t('home.clips.empty')}</Text>
        )}
      </View>

      <PulseFeed items={feed.pulse} />
    </Screen>
  );
}
