import React from 'react';
import { View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { Button } from './Button';
import { useTheme } from '../ThemeContext';

type Props = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  text: string;
  buttonLabel: string;
  buttonIcon?: keyof typeof MaterialCommunityIcons.glyphMap;
  buttonVariant?: 'primary' | 'tonal';
  onPress: () => void;
  footer?: string;
};

export function EmptyState({ icon, title, text, buttonLabel, buttonIcon = 'plus', buttonVariant = 'primary', onPress, footer }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 48 }}>
      <View
        style={{
          width: 128,
          height: 128,
          borderRadius: 40,
          backgroundColor: c.primaryContainer,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 28,
        }}
      >
        <View style={{ width: 76, height: 76, borderRadius: 24, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons name={icon} size={36} color={c.primary} />
        </View>
        <View style={{ position: 'absolute', top: 10, right: 6, width: 12, height: 12, borderRadius: 6, backgroundColor: c.primary }} />
      </View>
      <AppText variant="title" style={{ textAlign: 'center' }}>
        {title}
      </AppText>
      <AppText variant="bodyRegular" color="textSecondary" style={{ textAlign: 'center', marginTop: 8, marginBottom: 24 }}>
        {text}
      </AppText>
      <Button label={buttonLabel} icon={buttonIcon} variant={buttonVariant} onPress={onPress} style={{ alignSelf: 'stretch', marginHorizontal: 16 }} />
      {footer ? (
        <AppText variant="small" color="textSecondary" style={{ textAlign: 'center', marginTop: 'auto', paddingBottom: 24 }}>
          {footer}
        </AppText>
      ) : null}
    </View>
  );
}

export function InfoBox({ icon, text }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; text: string }) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: theme.colors.surfaceVariant,
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 16,
      }}
    >
      <MaterialCommunityIcons name={icon} size={20} color={theme.colors.primary} />
      <AppText variant="small" color="textSecondary" style={{ flex: 1 }}>
        {text}
      </AppText>
    </View>
  );
}
