import { flagEmoji, initials } from '@nujoom/shared';
import { Image } from 'expo-image';
import { VariableContextProvider } from 'nativewind';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';

import type { Attributes, Me } from '@/data/types';
import { themeVariables } from '@/design/tokens';
import { useLocale } from '@/lib/locale';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';

/** Attribute rows in the design's order: the first column is PAC/SHO/PAS, the second DRI/DEF/PHY. */
const COLUMNS: (keyof Attributes)[][] = [
  ['pac', 'sho', 'pas'],
  ['dri', 'def', 'phy'],
];

/** The card keeps its onyx-and-gold look in the daylight theme too (as in the prototype). */
const CARD_THEME = themeVariables('dark');

function Dots() {
  return (
    <Svg width="100%" height="100%" style={{ position: 'absolute', opacity: 0.2 }}>
      <Defs>
        <Pattern id="dots" width={14} height={14} patternUnits="userSpaceOnUse">
          <Circle cx={7} cy={7} r={1} fill="#ffc174" />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#dots)" />
    </Svg>
  );
}

/**
 * The FIFA-style street card (spec §6.2): OVR, position, flag, photo, name, hara and the six
 * attributes from peer ratings (D-006.3). Tilts in 3D under the finger like the prototype.
 */
export function PlayerCard({ me }: { me: Me }) {
  const { t, pick } = useLocale();
  const rotX = useSharedValue(0);
  const rotY = useSharedValue(0);
  const scale = useSharedValue(1);
  const size = useSharedValue({ width: 340, height: 480 });

  // Hold then drag to tilt; quick swipes still scroll the profile.
  const tilt = Gesture.Pan()
    .activateAfterLongPress(150)
    .onBegin((e) => {
      rotX.value = withTiming(((e.y - size.value.height / 2) / size.value.height) * -12, {
        duration: 80,
      });
      rotY.value = withTiming(((e.x - size.value.width / 2) / size.value.width) * 12, {
        duration: 80,
      });
      scale.value = withTiming(1.02, { duration: 80 });
    })
    .onUpdate((e) => {
      rotX.value = ((e.y - size.value.height / 2) / size.value.height) * -12;
      rotY.value = ((e.x - size.value.width / 2) / size.value.width) * 12;
    })
    .onFinalize(() => {
      rotX.value = withTiming(0, { duration: 400 });
      rotY.value = withTiming(0, { duration: 400 });
      scale.value = withTiming(1, { duration: 400 });
    });

  const style = useAnimatedStyle(() => ({
    transform: [
      { perspective: 800 },
      { rotateX: `${rotX.value}deg` },
      { rotateY: `${rotY.value}deg` },
      { scale: scale.value },
    ],
  }));

  return (
    <VariableContextProvider value={CARD_THEME}>
      <GestureDetector gesture={tilt}>
        <Animated.View
          onLayout={(e) => {
            size.value = { width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height };
          }}
          style={style}
          className="w-full max-w-[340px] self-center rounded-xl overflow-hidden bg-gradient-to-b from-card-gold via-surface-container-low to-card-bottom p-[2px] shadow-[0_16px_36px_rgba(0,0,0,0.6),0_0_28px_rgba(245,158,11,0.22)] border border-primary/40"
        >
          <View className="w-full rounded-[10px] bg-gradient-to-b from-card-top via-card-mid to-card-bottom overflow-hidden p-4">
            <Dots />
            <View className="absolute -top-12 self-center w-48 h-32 bg-primary/20 rounded-full blur-[50px]" />

            <View className="flex-row items-start justify-between">
              <View className="items-center">
                <Text
                  font="rubik"
                  className="text-[28px] leading-[30px] font-black text-primary tracking-tighter text-shadow-[0_2px_8px_rgba(245,158,11,0.4)]"
                >
                  {me.ovr ?? t('common.noValue')}
                </Text>
                <Text
                  font="grotesk"
                  className="text-[11px] text-primary-fixed font-bold tracking-widest mt-0.5"
                >
                  {me.positionTag}
                </Text>
                <Text className="text-[11px] text-on-surface-variant font-medium">
                  {t(`positions.${me.position}`)}
                </Text>
                <Text className="text-[18px] mt-1.5 leading-[20px]">
                  {flagEmoji(me.countryCode)}
                </Text>
              </View>
              <View className="items-center gap-1">
                <View className="w-10 h-10 rounded-lg bg-surface-container-high/70 p-1 items-center justify-center border border-primary/30">
                  <Image
                    source={require('../../../assets/images/logo.png')}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="contain"
                  />
                </View>
                <Text
                  font="grotesk"
                  className="text-[9px] uppercase tracking-widest text-primary opacity-80 font-bold"
                >
                  {t('profile.card.streetMvp')}
                </Text>
              </View>
            </View>

            <View className="-mt-2 items-center">
              <View className="w-36 h-36 rounded-full p-1 bg-gradient-to-b from-primary via-primary-container/40 to-transparent shadow-[0_10px_25px_rgba(0,0,0,0.5)]">
                {me.avatarUrl ? (
                  <Image
                    source={{ uri: me.avatarUrl }}
                    style={{ width: '100%', height: '100%', borderRadius: 999 }}
                    contentFit="cover"
                  />
                ) : (
                  <View className="flex-1 rounded-full bg-surface-container items-center justify-center">
                    <Text font="rubik" className="text-[40px] text-primary font-black">
                      {initials(me.name)}
                    </Text>
                  </View>
                )}
                <View
                  accessibilityLabel={t('profile.card.medal')}
                  className="absolute bottom-0 start-2 w-7 h-7 rounded-full bg-primary-container items-center justify-center shadow-lg border border-surface"
                >
                  <Icon name="military_tech" size={16} className="text-on-primary-container" />
                </View>
              </View>

              <View className="mt-2.5 items-center">
                <View className="flex-row items-center gap-1.5">
                  <Text
                    font="rubik"
                    className="text-[22px] leading-[30px] text-on-surface font-extrabold tracking-tight"
                  >
                    {me.name}
                  </Text>
                  {me.rankingEligible ? (
                    <Icon name="check_circle" filled size={18} className="text-secondary" />
                  ) : null}
                </View>
                <View className="flex-row items-center gap-2 mt-0.5">
                  <Text
                    font="grotesk"
                    className="text-[11px] text-primary font-bold tracking-wider uppercase"
                  >
                    {t('profile.card.brand')}
                  </Text>
                  <View className="w-1 h-1 rounded-full bg-outline" />
                  <Text className="text-[12px] text-on-surface-variant">
                    {pick(me.city)}
                    {me.neighborhood ? ` • ${pick(me.neighborhood)}` : ''}
                  </Text>
                </View>
              </View>
            </View>

            <View className="w-full my-3 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

            <View className="flex-row gap-4 px-1">
              {COLUMNS.map((column) => (
                <View key={column[0]} className="flex-1 gap-2">
                  {column.map((key) => {
                    // Unrated players show a dash, never a zero that reads like a score (C-007).
                    const value = me.attributes?.[key] ?? null;
                    return (
                      <View
                        key={key}
                        className="flex-row items-center justify-between bg-surface-container/60 px-2.5 py-1.5 rounded-lg border border-border/40"
                      >
                        <Text
                          font="grotesk"
                          className={`text-[16px] font-bold ${value !== null && value >= 60 ? 'text-primary' : 'text-on-surface-variant'}`}
                        >
                          {value ?? t('common.noValue')}
                        </Text>
                        <View className="flex-row items-center gap-1.5">
                          <Text
                            font="grotesk"
                            className="text-[11px] text-on-surface font-bold tracking-wider"
                          >
                            {key.toUpperCase()}
                          </Text>
                          <Text className="text-[11px] text-on-surface-variant font-medium">
                            {t(`profile.card.attrs.${key}`)}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>

            <View className="mt-3 pt-2 flex-row items-center justify-center gap-2">
              <Icon name="bolt" size={14} className="text-primary" />
              <Text font="grotesk" className="text-[10px] text-primary opacity-70 tracking-wider">
                {me.shirtNumber !== null
                  ? t('profile.card.footer', { number: me.shirtNumber, year: me.editionYear })
                  : t('profile.card.footerNoNumber', { year: me.editionYear })}
              </Text>
              <Icon name="bolt" size={14} className="text-primary" />
            </View>
          </View>
        </Animated.View>
      </GestureDetector>
    </VariableContextProvider>
  );
}
