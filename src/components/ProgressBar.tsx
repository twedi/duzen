import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../ThemeContext';

export function ProgressBar({ value }: { value: number }) {
  const { theme } = useTheme();
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.colors.surfaceVariant, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: theme.colors.primary, borderRadius: 3 }} />
    </View>
  );
}
