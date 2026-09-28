import { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/design/theme';
import { Text } from '@/ui/Text';

type FieldProps = TextInputProps & {
  label: string;
  error?: string | null;
  /** Phone numbers and codes stay left-to-right inside Arabic forms. */
  ltr?: boolean;
};

/** The design's form input: graphite field, gold border on focus, grotesk label above. */
export function Field({ label, error, ltr, style, ...rest }: FieldProps) {
  const { color } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View className="gap-1">
      <Text font="grotesk" className="text-[11px] text-on-surface-variant">
        {label}
      </Text>
      <TextInput
        // The visible label names the input for screen readers too.
        accessibilityLabel={label}
        {...rest}
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        placeholderTextColor={color('outline')}
        className={`w-full bg-surface-container-low border rounded-lg px-3 py-2 text-on-surface text-[14px] ${
          error ? 'border-error' : focused ? 'border-primary' : 'border-border'
        }`}
        style={[
          { fontFamily: 'PlusJakartaSans_400Regular' },
          ltr ? { writingDirection: 'ltr' } : null,
          style,
        ]}
      />
      {error ? <Text className="text-[11px] text-error">{error}</Text> : null}
    </View>
  );
}
