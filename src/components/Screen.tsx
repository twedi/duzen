import React from 'react';
import { StatusBar, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';

type Props = { children: React.ReactNode; style?: ViewStyle; bottomInset?: boolean };

export function Screen({ children, style, bottomInset = false }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        { flex: 1, backgroundColor: theme.colors.background, paddingTop: insets.top, paddingBottom: bottomInset ? insets.bottom : 0 },
        style,
      ]}
    >
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      {children}
    </View>
  );
}
