import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { HeaderButton } from '@/components/ui';
import type { IconName } from '@/db/types';
import { useTheme } from '@/lib/theme';

const tabIcon = (name: IconName) =>
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} size={size} color={color as string} />;
  };

export default function TabLayout() {
  const t = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: t.primary,
        tabBarInactiveTintColor: t.muted,
        headerShadowVisible: false,
        headerTitleStyle: { color: t.text },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerTitle: 'BudT',
          tabBarIcon: tabIcon('home'),
          headerRight: () => <HeaderButton icon="settings-outline" label="Settings" onPress={() => router.push('/settings')} />,
        }}
      />
      <Tabs.Screen
        name="budgets"
        options={{
          title: 'Budgets',
          tabBarIcon: tabIcon('pie-chart'),
          headerRight: () => <HeaderButton icon="add" label="Add budget" onPress={() => router.push('/budget')} />,
        }}
      />
      <Tabs.Screen
        name="tax"
        options={{ title: 'Tax', headerTitle: 'Tax calculator', tabBarIcon: tabIcon('calculator') }}
      />
      <Tabs.Screen
        name="pension"
        options={{ title: 'Pension', headerTitle: 'Pension planner', tabBarIcon: tabIcon('umbrella') }}
      />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: tabIcon('grid') }} />
    </Tabs>
  );
}
