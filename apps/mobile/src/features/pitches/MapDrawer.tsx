import { Pressable, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';

import type { Pitch } from '@/data/types';
import { sfx } from '@/design/sound';
import { useTheme } from '@/design/theme';
import { mapPins } from '@/features/pitches/logic';
import { useLocale } from '@/lib/locale';
import { Icon } from '@/ui/Icon';
import { PingDot } from '@/ui/PingDot';
import { Text } from '@/ui/Text';

const GRID = [0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875];

/**
 * "خريطة ملاعب عمان المضاءة": pins at the pitches' real relative positions on a schematic grid.
 * Map tiles arrive with a Google Maps key (flag `map_enabled`); until then no fake map image is
 * shown under real pins.
 */
export function MapDrawer({
  pitches,
  onClose,
  onPitch,
  onUrgent,
}: {
  pitches: Pitch[];
  onClose: () => void;
  onPitch: (pitch: Pitch) => void;
  onUrgent: (pitch: Pitch) => void;
}) {
  const { t, pick } = useLocale();
  const { color } = useTheme();
  const pins = mapPins(pitches);
  const lineColor = color('border-strong');

  return (
    <View className="bg-surface-container-high rounded-xl p-3 gap-3 shadow-2xl border border-primary/20">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <Icon name="explore" size={20} className="text-secondary" />
          <Text font="rubik" className="text-[16px] text-on-surface font-bold">
            {t('pitches.mapTitle')}
          </Text>
        </View>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          className="w-7 h-7 rounded-full bg-surface-container items-center justify-center"
        >
          <Icon name="close" size={16} className="text-on-surface-variant" />
        </Pressable>
      </View>

      <View className="w-full h-52 bg-surface-container-low rounded-lg overflow-hidden border border-surface-container-highest">
        <Svg width="100%" height="100%" style={{ position: 'absolute' }}>
          {GRID.map((g) => (
            <Line
              key={`h${g}`}
              x1="0%"
              x2="100%"
              y1={`${g * 100}%`}
              y2={`${g * 100}%`}
              stroke={lineColor}
              strokeWidth={1}
            />
          ))}
          {GRID.map((g) => (
            <Line
              key={`v${g}`}
              y1="0%"
              y2="100%"
              x1={`${g * 100}%`}
              x2={`${g * 100}%`}
              stroke={lineColor}
              strokeWidth={1}
            />
          ))}
        </Svg>

        {pins.map(({ pitch, x, y }) => {
          const urgent = pitch.openSpot !== null;
          return (
            <Pressable
              key={pitch.id}
              onPress={() => {
                sfx.clipBeep();
                if (urgent) onUrgent(pitch);
                else onPitch(pitch);
              }}
              className="absolute items-center active:scale-110"
              // Map positions are geographic (east is right in every language), so this is physical.
              // eslint-disable-next-line rtl/no-physical-style
              style={{ left: `${x * 100}%`, top: `${y * 100}%`, transform: [{ translateX: -40 }] }}
            >
              {urgent ? (
                <View className="w-3.5 h-3.5 rounded-full bg-error animate-pulse" />
              ) : pitch.favorite ? (
                <PingDot color="bg-primary-container" size="w-3.5 h-3.5" />
              ) : (
                <View className="w-3.5 h-3.5 rounded-full bg-secondary" />
              )}
              <View className="w-20 items-center">
                <View className="px-1.5 py-0.5 rounded bg-surface/95 shadow-md">
                  <Text
                    font="grotesk"
                    className={`text-[9px] font-bold ${
                      urgent ? 'text-error' : pitch.favorite ? 'text-primary' : 'text-secondary'
                    }`}
                    numberOfLines={1}
                  >
                    {urgent
                      ? t('pitches.mapPinUrgent', { area: pick(pitch.area).split(' • ')[0] })
                      : t('pitches.mapPin', {
                          area: pick(pitch.area).split(' • ')[0],
                          price: pitch.pricePerHour,
                        })}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Text className="text-[12px] text-on-surface-variant text-center">
        {t('pitches.mapHint')}
      </Text>
    </View>
  );
}
