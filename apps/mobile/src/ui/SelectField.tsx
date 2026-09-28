import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Icon } from '@/ui/Icon';
import { SelectSheet, type SelectOption } from '@/ui/SelectSheet';
import { Text } from '@/ui/Text';

/** A labelled dropdown styled like the design's form selects. */
export function SelectField<T extends string>({
  label,
  options,
  value,
  onChange,
  placeholder = '',
  error = null,
}: {
  label: string;
  options: readonly SelectOption<T>[];
  /** Null shows the placeholder: forms don't preselect facts about the user (docs/DESIGN.md). */
  value: T | null;
  onChange: (value: T) => void;
  placeholder?: string;
  error?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <View className="gap-1 flex-1">
      <Text font="grotesk" className="text-[11px] text-on-surface-variant">
        {label}
      </Text>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={label}
        className={`w-full min-h-[44px] flex-row items-center justify-between bg-surface-container-low border rounded-lg px-3 py-2 ${
          error ? 'border-error' : 'border-border'
        }`}
      >
        <Text className={`text-[15px] ${current ? 'text-on-surface' : 'text-outline'}`}>
          {current?.label ?? placeholder}
        </Text>
        <Icon name="expand_more" size={18} className="text-on-surface-variant" />
      </Pressable>
      <SelectSheet
        visible={open}
        title={label}
        options={options}
        value={value ?? undefined}
        onSelect={onChange}
        onClose={() => setOpen(false)}
      />
      {error ? <Text className="text-[12px] text-error">{error}</Text> : null}
    </View>
  );
}
