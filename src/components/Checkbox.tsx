import React from 'react';
import { Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';

type Props = {
  checked: boolean;
  onPress?: () => void;
  shape?: 'circle' | 'square';
  size?: number;
};

export function Checkbox({ checked, onPress, shape = 'square', size = 26 }: Props) {
  const { theme } = useTheme();
  const name =
    shape === 'circle'
      ? checked
        ? 'check-circle'
        : 'checkbox-blank-circle-outline'
      : checked
        ? 'checkbox-marked'
        : 'checkbox-blank-outline';
  return (
    <Pressable onPress={onPress} hitSlop={12} disabled={!onPress}>
      <MaterialCommunityIcons name={name} size={size} color={checked ? theme.colors.primary : theme.colors.textSecondary} />
    </Pressable>
  );
}
