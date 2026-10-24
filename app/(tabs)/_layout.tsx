import React, { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { AppText } from '../../src/components/AppText';
import { SPRING } from '../../src/components/Motion';
import { useTheme } from '../../src/ThemeContext';
import { tap } from '../../src/haptics';
import { withAlpha } from '../../src/colors';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

const ITEMS: Record<string, { label: string; icon: IconName; iconActive: IconName; href: string }> = {
  index: { label: 'Bugün', icon: 'calendar-check-outline', iconActive: 'calendar-check', href: '/' },
  boards: { label: 'Panolar', icon: 'view-dashboard-outline', iconActive: 'view-dashboard', href: '/boards' },
  timeline: { label: 'Çizelge', icon: 'chart-timeline-variant', iconActive: 'chart-timeline-variant-shimmer', href: '/timeline' },
  settings: { label: 'Ayarlar', icon: 'tune-variant', iconActive: 'tune-variant', href: '/settings' },
};

/** Seçilince hap şeklindeki zemin büyüyerek belirir, simge hafifçe zıplar */
function TabItem({ item, focused, onPress }: { item: (typeof ITEMS)[string]; focused: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const f = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    f.value = withTiming(focused ? 1 : 0, { duration: 220 });
  }, [focused, f]);
  const scale = useSharedValue(1);
  // Renkler worklet dışında hesaplanır (worklet içinde normal JS fonksiyonu çağrılamaz)
  const pillFrom = withAlpha(c.primaryContainer, 0);
  const pillTo = withAlpha(c.primaryContainer, 1);

  const pill = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(f.value, [0, 1], [pillFrom, pillTo]),
    transform: [{ scaleX: 0.6 + f.value * 0.4 }],
  }));
  const icon = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      onPress={() => {
        scale.value = withSpring(1.18, SPRING, () => {
          scale.value = withSpring(1, SPRING);
        });
        onPress();
      }}
      style={{ flex: 1, alignItems: 'center', gap: 4 }}
    >
      <View style={{ width: 64, height: 34, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 999 }, pill]} />
        <Animated.View style={icon}>
          <MaterialCommunityIcons name={focused ? item.iconActive : item.icon} size={22} color={focused ? c.onPrimaryContainer : c.textSecondary} />
        </Animated.View>
      </View>
      <AppText variant="caption" color={focused ? 'onPrimaryContainer' : 'textSecondary'} style={{ fontFamily: focused ? 'Inter_700Bold' : 'Inter_500Medium' }}>
        {item.label}
      </AppText>
    </Pressable>
  );
}

function TabBar({ state }: any) {
  const router = useRouter();
  const { theme } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: c.surface,
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
          <TabItem
            key={route.key}
            item={item}
            focused={focused}
            onPress={() => {
              if (focused) return;
              tap();
              router.navigate(item.href as any);
            }}
          />
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, animation: 'shift' }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="boards" />
      <Tabs.Screen name="timeline" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
