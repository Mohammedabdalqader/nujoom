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
}: {
  label: string;
  options: readonly SelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
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
        className="w-full flex-row items-center justify-between bg-surface-container-low border border-border rounded-lg px-3 py-2"
      >
        <Text className="text-[13px] text-on-surface">{current?.label ?? ''}</Text>
        <Icon name="expand_more" size={18} className="text-on-surface-variant" />
      </Pressable>
      <SelectSheet
        visible={open}
        title={label}
        options={options}
        value={value}
        onSelect={onChange}
        onClose={() => setOpen(false)}
      />
    </View>
  );
}
