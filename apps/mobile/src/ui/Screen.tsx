import type { ReactNode } from 'react';
import { ScrollView, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Height of the app header row and bottom navigation bar (both h-16 in the prototype). */
export const CHROME_HEIGHT = 64;

type ScreenProps = ScrollViewProps & {
  children: ReactNode;
  className?: string;
};

/**
 * A tab screen: scrolls under the frosted header and bottom bar (the prototype's `pt-16 pb-20`),
 * capped at the prototype's `max-w-lg` column on tablets and the web preview.
 */
export function Screen({ children, className = '', ...rest }: ScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      {...rest}
      className="flex-1 bg-surface"
      contentContainerStyle={{
        paddingTop: insets.top + CHROME_HEIGHT + 8,
        paddingBottom: Math.max(insets.bottom, 16) + CHROME_HEIGHT + 32,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View className={`w-full max-w-lg self-center ${className}`}>{children}</View>
    </ScrollView>
  );
}
