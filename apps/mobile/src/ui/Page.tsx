import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLocale } from '@/lib/locale';
import { DemoMarker } from '@/ui/DemoMarker';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';

/**
 * A full screen outside the tabs (sign-in, onboarding, settings, legal): the design's graphite
 * surface, the max-w-lg column, safe areas, and room for the keyboard.
 */
export function Page({
  children,
  title,
  back = false,
  className = 'gap-5',
}: {
  children: ReactNode;
  /** Shows the top bar with this title. */
  title?: string;
  back?: boolean;
  className?: string;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useLocale();
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-surface"
    >
      {title ? (
        <View className="bg-surface border-b border-border/60" style={{ paddingTop: insets.top }}>
          <View className="h-14 w-full max-w-lg self-center px-4 flex-row items-center gap-3">
            {back ? (
              <Pressable
                onPress={() => router.back()}
                accessibilityRole="button"
                accessibilityLabel={t('onboarding.back')}
                hitSlop={8}
                className="w-10 h-10 rounded-full bg-surface-container items-center justify-center"
              >
                <Icon name="arrow_forward" directional size={20} className="text-on-surface" />
              </Pressable>
            ) : null}
            <Text font="rubik" className="text-[18px] text-on-surface font-bold shrink">
              {title}
            </Text>
          </View>
          <DemoMarker />
        </View>
      ) : null}
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: title ? 16 : insets.top + 24,
          paddingBottom: Math.max(insets.bottom, 16) + 24,
        }}
      >
        <View className={`w-full max-w-lg self-center px-4 ${className}`}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** A row of single-choice chips in the design's pill style. */
export function ChoiceChips<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  label?: string;
}) {
  return (
    <View className="gap-1.5">
      {label ? (
        <Text font="grotesk" className="text-[12px] text-on-surface-variant">
          {label}
        </Text>
      ) : null}
      <View className="flex-row flex-wrap gap-2" accessibilityRole="radiogroup">
        {options.map((option) => {
          const on = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              className={`min-h-[44px] px-4 rounded-xl border items-center justify-center ${
                on
                  ? 'bg-primary-container border-primary-container'
                  : 'bg-surface-container-low border-border active:bg-surface-container-high'
              }`}
            >
              <Text
                font="rubik"
                className={`text-[15px] ${on ? 'text-on-primary font-bold' : 'text-on-surface'}`}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
