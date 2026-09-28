import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/design/theme';

/** The frosted bar behind the header and bottom navigation (`bg-surface/85 backdrop-blur-xl`). */
export function Chrome({ children, className = '' }: { children: ReactNode; className?: string }) {
  const { theme } = useTheme();
  return (
    <View className={`overflow-hidden ${className}`}>
      <BlurView
        intensity={40}
        tint={theme === 'dark' ? 'dark' : 'light'}
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />
      <View className="absolute inset-0 bg-chrome" />
      {children}
    </View>
  );
}
