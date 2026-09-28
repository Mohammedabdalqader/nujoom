import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { useTheme } from '@/design/theme';

/**
 * The frosted bar behind the header and bottom navigation (`bg-surface/85 backdrop-blur-xl`).
 * Android's blur needs a separate capture target around the content, which the tab navigator's
 * own header and tab bar cannot wrap; there the bar is the same translucent surface without blur.
 */
export function Chrome({ children, className = '' }: { children: ReactNode; className?: string }) {
  const { theme } = useTheme();
  return (
    <View className={`overflow-hidden ${className}`}>
      {Platform.OS !== 'android' ? (
        <BlurView
          intensity={40}
          tint={theme === 'dark' ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View className="absolute inset-0 bg-chrome" />
      {children}
    </View>
  );
}
