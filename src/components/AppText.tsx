import React from 'react';
import { Text, TextProps } from 'react-native';
import { useTheme } from '../ThemeContext';
import { Colors, textStyles, TextVariant } from '../theme';

type Props = TextProps & {
  variant?: TextVariant;
  color?: keyof Colors | string;
};

export function AppText({ variant = 'bodyRegular', color = 'text', style, ...rest }: Props) {
  const { theme } = useTheme();
  const resolved = (theme.colors as Record<string, any>)[color];
  const c = typeof resolved === 'string' ? resolved : color;
  return <Text {...rest} style={[textStyles[variant], { color: c }, style]} />;
}
