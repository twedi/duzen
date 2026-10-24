import React from 'react';
import { Pressable, View } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../src/components/AppText';
import { useTheme } from '../../src/ThemeContext';

const ITEMS: Record<string, { label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; href: string }> = {
  index: { label: 'Bugün', icon: 'calendar-check-outline', href: '/' },
  boards: { label: 'Panolar', icon: 'view-dashboard-outline', href: '/boards' },
  settings: { label: 'Ayarlar', icon: 'tune-variant', href: '/settings' },
};

function TabBar({ state }: any) {
  const router = useRouter();
  const { theme } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: c.background,
        borderTopWidth: 1,
        borderTopColor: c.border,
        paddingTop: 8,
        paddingBottom: Math.max(insets.bottom, 8),
      }}
    >
      {state.routes.map((route: any, index: number) => {
        const item = ITEMS[route.name];
        if (!item) return null;
        const focused = state.index === index;
        return (
          <Pressable
            key={route.key}
            onPress={() => {
              if (!focused) router.navigate(item.href as any);
            }}
            style={{ flex: 1, alignItems: 'center', gap: 4 }}
          >
            <View
              style={{
                paddingHorizontal: 20,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: focused ? c.primaryContainer : 'transparent',
              }}
            >
              <MaterialCommunityIcons name={item.icon} size={22} color={focused ? c.onPrimaryContainer : c.textSecondary} />
            </View>
            <AppText variant="caption" color={focused ? 'onPrimaryContainer' : 'textSecondary'} style={{ fontWeight: focused ? '700' : '500' }}>
              {item.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="boards" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
