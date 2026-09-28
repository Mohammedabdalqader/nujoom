import { Image } from 'expo-image';
import { View } from 'react-native';

import { Text } from '@/ui/Text';

type AvatarProps = {
  uri?: string | null;
  /** Initials shown when there is no photo (or the viewer may not see it, spec §7). */
  initials: string;
  /** Tailwind size classes, e.g. `w-8 h-8`. */
  size: string;
  className?: string;
  textClassName?: string;
};

/** Round player photo, falling back to the design's initials badge ("ع.م"). */
export function Avatar({
  uri,
  initials,
  size,
  className = '',
  textClassName = 'text-[10px] text-on-surface',
}: AvatarProps) {
  return (
    <View
      className={`${size} rounded-full overflow-hidden bg-surface-bright items-center justify-center ${className}`}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
      ) : (
        <Text font="grotesk" className={`font-bold ${textClassName}`}>
          {initials}
        </Text>
      )}
    </View>
  );
}
