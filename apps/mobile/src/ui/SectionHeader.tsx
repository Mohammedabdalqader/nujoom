import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Icon, type IconName } from '@/ui/Icon';
import { Text } from '@/ui/Text';

type SectionHeaderProps = {
  icon: IconName;
  iconClassName?: string;
  iconSize?: number;
  title: string;
  trailing?: ReactNode;
  className?: string;
};

/** Section title row used across the tabs: icon + Rubik 18 title + optional trailing action. */
export function SectionHeader({
  icon,
  iconClassName = 'text-primary',
  iconSize = 20,
  title,
  trailing,
  className = '',
}: SectionHeaderProps) {
  return (
    <View className={`flex-row items-center justify-between ${className}`}>
      <View className="flex-row items-center gap-2 flex-1 min-w-0">
        <Icon name={icon} size={iconSize} className={iconClassName} />
        <Text font="rubik" className="text-[18px] text-on-surface font-bold" numberOfLines={1}>
          {title}
        </Text>
      </View>
      {trailing}
    </View>
  );
}
