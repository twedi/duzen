import React from 'react';
import { Pressable } from 'react-native';
import Animated from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import { usePop } from './Motion';

type Props = {
  checked: boolean;
  onPress?: () => void;
  shape?: 'circle' | 'square';
  size?: number;
  color?: string;
};

/** İşaretlenince küçük bir zıplama animasyonu yapan onay kutusu */
export function Checkbox({ checked, onPress, shape = 'square', size = 26, color }: Props) {
  const { theme } = useTheme();
  const pop = usePop(checked);
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
      <Animated.View style={pop}>
        <MaterialCommunityIcons name={name} size={size} color={checked ? color ?? theme.colors.primary : theme.colors.textSecondary} />
      </Animated.View>
    </Pressable>
  );
}
