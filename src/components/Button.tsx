import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { PressableScale } from './Motion';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { useTheme } from '../ThemeContext';
import { radius } from '../theme';

type Variant = 'primary' | 'tonal' | 'outline' | 'danger';

type Props = {
  label: string;
  onPress?: () => void;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  variant?: Variant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, icon, variant = 'primary', disabled, style }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const map = {
    primary: { bg: c.primary, fg: c.onPrimary, border: 'transparent' },
    tonal: { bg: c.primaryContainer, fg: c.onPrimaryContainer, border: 'transparent' },
    outline: { bg: 'transparent', fg: c.primary, border: c.border },
    danger: { bg: c.dangerContainer, fg: c.danger, border: 'transparent' },
  }[variant];

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.96}
      style={[
        {
          height: 52,
          borderRadius: radius.md,
          backgroundColor: map.bg,
          borderWidth: 1,
          borderColor: map.border,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {icon ? <MaterialCommunityIcons name={icon} size={20} color={map.fg} /> : null}
        <AppText variant="body" color={map.fg}>
          {label}
        </AppText>
      </View>
    </PressableScale>
  );
}
