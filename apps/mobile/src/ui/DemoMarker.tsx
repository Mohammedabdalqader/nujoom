import { View } from 'react-native';

import { IS_DEMO } from '@/lib/variant';
import { useLocale } from '@/lib/locale';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';

/**
 * The permanent "نسخة تجريبية / Demo" marker (docs/DESIGN.md, contract §7): shown on every tab
 * and sheet of the demo build, never dismissible, and styled as a hazard strip rather than a
 * badge so it can't be mistaken for a verification. Renders nothing in production.
 */
export function DemoMarker({ className = '' }: { className?: string }) {
  const { t } = useLocale();
  if (!IS_DEMO) return null;
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={t('demo.marker')}
      className={`flex-row items-center justify-center gap-1 py-0.5 bg-primary-container ${className}`}
    >
      <Icon name="warning" size={12} className="text-on-primary" />
      <Text font="grotesk" className="text-[10px] leading-[14px] text-on-primary font-bold">
        {t('demo.marker')}
      </Text>
    </View>
  );
}
