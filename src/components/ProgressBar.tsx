import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '../ThemeContext';

/** Değer değişince yumuşakça dolan ilerleme çubuğu */
export function ProgressBar({ value, color, height = 6 }: { value: number; color?: string; height?: number }) {
  const { theme } = useTheme();
  const [w, setW] = useState(0);
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(Math.max(0, Math.min(1, value)), { duration: 650, easing: Easing.out(Easing.cubic) });
  }, [value, p]);
  const anim = useAnimatedStyle(() => ({ width: w * p.value }));
  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={{ height, borderRadius: height / 2, backgroundColor: theme.colors.surfaceVariant, overflow: 'hidden' }}
    >
      <Animated.View style={[{ height: '100%', backgroundColor: color ?? theme.colors.primary, borderRadius: height / 2 }, anim]} />
    </View>
  );
}
