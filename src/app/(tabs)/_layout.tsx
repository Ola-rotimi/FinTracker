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

const addTransaction = () => <HeaderButton icon="add" label="Add transaction" onPress={() => router.push('/transaction')} />;

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
          headerTitle: 'Fintrack',
          tabBarIcon: tabIcon('home'),
          headerRight: () => <HeaderButton icon="settings-outline" label="Settings" onPress={() => router.push('/settings')} />,
        }}
      />
      <Tabs.Screen name="transactions" options={{ title: 'Activity', tabBarIcon: tabIcon('list'), headerRight: addTransaction }} />
      <Tabs.Screen
        name="budgets"
        options={{
          title: 'Budgets',
          tabBarIcon: tabIcon('pie-chart'),
          headerRight: () => <HeaderButton icon="add" label="Add budget" onPress={() => router.push('/budget')} />,
        }}
      />
      <Tabs.Screen name="insights" options={{ title: 'Insights', tabBarIcon: tabIcon('stats-chart') }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: tabIcon('grid') }} />
    </Tabs>
  );
}
