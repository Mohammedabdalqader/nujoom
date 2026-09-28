import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/design/theme';

const WIDTHS = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' } as const;

type DialogProps = {
  children: ReactNode;
  width?: keyof typeof WIDTHS;
  /** Card classes: the prototype varies the border colour per dialog. */
  className?: string;
  /** Scroll the body when it is taller than the screen (the prototype's max-h-[9x vh]). */
  scroll?: boolean;
  onClose?: () => void;
};

/**
 * The prototype's modal: a centred card over a dark blurred scrim (`bg-black/85`). Rendered by a
 * route presented as a transparent modal, so Android back and deep links work.
 */
export function Dialog({
  children,
  width = 'sm',
  className = 'bg-surface-container border border-primary/40 p-4 gap-4',
  scroll = false,
  onClose,
}: DialogProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const close = onClose ?? (() => router.back());
  const card = `w-full ${WIDTHS[width]} rounded-2xl shadow-2xl ${className}`;
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
    >
      <View
        className="flex-1 items-center justify-center p-4 bg-scrim"
        style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }}
      >
        <Pressable className="absolute inset-0" onPress={close} accessibilityRole="none" />
        {scroll ? (
          <View className={`${card} max-h-full overflow-hidden`}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-3.5">
              {children}
            </ScrollView>
          </View>
        ) : (
          <View className={card}>{children}</View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

/** The dialog while its data loads (the route opens before the query resolves). */
export function DialogLoading() {
  const { color } = useTheme();
  return (
    <Dialog>
      <View className="py-10 items-center">
        <ActivityIndicator color={color('primary')} />
      </View>
    </Dialog>
  );
}
