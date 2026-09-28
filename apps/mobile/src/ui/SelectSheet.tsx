import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { sfx } from '@/design/sound';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';

export type SelectOption<T extends string> = { value: T; label: string };

type SelectSheetProps<T extends string> = {
  visible: boolean;
  title: string;
  options: readonly SelectOption<T>[];
  value: T;
  onSelect: (value: T) => void;
  onClose: () => void;
};

/**
 * The native stand-in for the prototype's `<select>`: a dialog card with the options, in the
 * same surface and gold-accent style as the design's dropdowns.
 */
export function SelectSheet<T extends string>({
  visible,
  title,
  options,
  value,
  onSelect,
  onClose,
}: SelectSheetProps<T>) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        className="flex-1 items-center justify-center p-4 bg-scrim"
        style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }}
      >
        <Pressable className="absolute inset-0" onPress={onClose} accessibilityRole="none" />
        <View className="w-full max-w-sm max-h-full rounded-2xl bg-surface-container-high border border-primary/30 p-3 gap-2 shadow-2xl">
          <View className="flex-row items-center justify-between px-1 pb-1">
            <Text font="rubik" className="text-[16px] text-on-surface font-bold">
              {title}
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              className="w-7 h-7 rounded-full bg-surface-container items-center justify-center"
            >
              <Icon name="close" size={16} className="text-on-surface-variant" />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {options.map((option) => {
              const selected = option.value === value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    sfx.clipBeep();
                    onSelect(option.value);
                    onClose();
                  }}
                  className={`flex-row items-center justify-between px-3 py-3 rounded-lg mb-1 ${
                    selected ? 'bg-primary-container/15' : 'active:bg-surface-container'
                  }`}
                >
                  <Text
                    font="rubik"
                    className={`text-[15px] ${selected ? 'text-primary font-bold' : 'text-on-surface'}`}
                  >
                    {option.label}
                  </Text>
                  {selected ? <Icon name="check" size={18} className="text-primary" /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
