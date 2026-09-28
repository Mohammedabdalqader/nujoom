import { View } from 'react-native';

type PingDotProps = {
  /** Background class of the dot, e.g. `bg-live`. */
  color: string;
  /** Tailwind size class, e.g. `h-2.5 w-2.5`. */
  size?: string;
  /** Extra classes for the solid dot (rings, borders). */
  className?: string;
};

/** The prototype's live indicator: a solid dot with an `animate-ping` halo behind it. */
export function PingDot({ color, size = 'h-2 w-2', className = '' }: PingDotProps) {
  return (
    <View className={`relative ${size}`}>
      <View className={`absolute inset-0 rounded-full opacity-75 animate-ping ${color}`} />
      <View className={`rounded-full ${size} ${color} ${className}`} />
    </View>
  );
}
