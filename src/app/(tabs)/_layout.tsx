import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useMemo } from 'react';
import { fonts, useTheme } from '@/lib/theme';
import { useAllInsights } from '@/store/useInsights';
import { useStore } from '@/store/useStore';

export default function TabsLayout() {
  const { c } = useTheme();
  const insights = useAllInsights();
  const snoozes = useStore((s) => s.snoozes);
  const urgent = useMemo(() => {
    const now = Date.now();
    return insights.flatMap((i) => i.needs).filter((n) => (n.severity === 'danger' || n.severity === 'warning') && !(snoozes[n.key] && new Date(snoozes[n.key]).getTime() > now)).length;
  }, [insights, snoozes]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.successText,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border, minHeight: 60 },
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 12 },
        headerStyle: { backgroundColor: c.surface },
        headerTitleStyle: { fontFamily: fonts.bold, fontSize: 20, color: c.text },
        headerShadowVisible: false,
        headerTitleAlign: 'left',
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'الكراج', headerShown: false, tabBarIcon: ({ color, size }) => <Ionicons name="car-sport" color={color as string} size={size} /> }} />
      <Tabs.Screen name="history" options={{ title: 'السجل', tabBarIcon: ({ color, size }) => <Ionicons name="time" color={color as string} size={size} /> }} />
      <Tabs.Screen
        name="reminders"
        options={{
          title: 'التذكيرات',
          tabBarBadge: urgent > 0 ? urgent : undefined,
          tabBarBadgeStyle: { backgroundColor: c.danger, fontFamily: fonts.bold },
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications" color={color as string} size={size} />,
        }}
      />
      <Tabs.Screen name="settings" options={{ title: 'الإعدادات', tabBarIcon: ({ color, size }) => <Ionicons name="settings" color={color as string} size={size} /> }} />
    </Tabs>
  );
}
