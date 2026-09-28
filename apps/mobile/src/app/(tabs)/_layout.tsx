import { Tabs } from 'expo-router/js-tabs';
import { View } from 'react-native';

import { AppHeader } from '@/features/shell/AppHeader';
import { BottomNav } from '@/features/shell/BottomNav';
import { TABS, tabForRoute } from '@/features/shell/tabs';

/** The five tabs under one fixed frosted header and the custom bottom bar. */
export default function TabsLayout() {
  return (
    <View className="flex-1 bg-surface">
      <Tabs
        tabBar={(props) => <BottomNav {...props} />}
        screenOptions={({ route }) => ({
          header: () => <AppHeader tab={tabForRoute(route.name)} />,
          headerTransparent: true,
          sceneStyle: { backgroundColor: 'transparent' },
        })}
      >
        {TABS.map((tab) => (
          <Tabs.Screen key={tab.name} name={tab.name} />
        ))}
      </Tabs>
    </View>
  );
}
