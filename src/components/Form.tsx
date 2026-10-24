import React from 'react';
import { Pressable, StyleProp, TextInput, TextInputProps, TextStyle, View, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { useTheme } from '../ThemeContext';
import { fonts } from '../theme';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { PressableScale } from './Motion';
import { tap } from '../haptics';

export function FieldLabel({ children, style, right }: { children: string; style?: StyleProp<TextStyle>; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 8 }}>
      <AppText variant="label" color="textSecondary" style={style}>
        {children}
      </AppText>
      {right}
    </View>
  );
}

export function Input({ style, ...rest }: TextInputProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <TextInput
      placeholderTextColor={c.textSecondary}
      {...rest}
      style={[
        {
          minHeight: 50,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: c.border,
          backgroundColor: c.surface,
          paddingHorizontal: 14,
          paddingVertical: 12,
          color: c.text,
          fontFamily: fonts.regular,
          fontSize: 15,
        },
        style,
      ]}
    />
  );
}

export function Surface({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { theme } = useTheme();
  return (
    <View style={[{ backgroundColor: theme.colors.surface, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.border }, style]}>
      {children}
    </View>
  );
}

/** Stack ekranları için üst bar: geri, başlık, sağda isteğe bağlı öğe */
export function ScreenHeader({
  title,
  subtitle,
  onBack,
  right,
  closeIcon,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  right?: React.ReactNode;
  closeIcon?: boolean;
}) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, gap: 12 }}>
      <Pressable onPress={onBack} hitSlop={12} style={{ padding: 4 }}>
        <MaterialCommunityIcons name={closeIcon ? 'close' : 'arrow-left'} size={26} color={theme.colors.text} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <AppText variant="title" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="small" color="textSecondary" numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right}
    </View>
  );
}

export function IconButton({
  icon,
  onPress,
  tone = 'plain',
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
  tone?: 'plain' | 'tonal';
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={{
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: tone === 'tonal' ? c.primaryContainer : 'transparent',
      }}
    >
      <MaterialCommunityIcons name={icon} size={24} color={tone === 'tonal' ? c.onPrimaryContainer : c.text} />
    </Pressable>
  );
}

/** Sağ altta duran, açılışta büyüyerek beliren ekleme düğmesi */
export function Fab({ label, onPress, icon = 'plus' }: { label?: string; onPress: () => void; icon?: keyof typeof MaterialCommunityIcons.glyphMap }) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <Animated.View entering={ZoomIn.springify().damping(14).delay(120)} style={{ position: 'absolute', right: 16, bottom: 20 }}>
      <PressableScale
        onPress={() => {
          tap();
          onPress();
        }}
        scaleTo={0.92}
        style={{
          height: 58,
          minWidth: 58,
          paddingHorizontal: label ? 22 : 0,
          borderRadius: 20,
          backgroundColor: c.primary,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          elevation: 8,
          shadowColor: c.primary,
          shadowOpacity: 0.35,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 6 },
        }}
      >
        <MaterialCommunityIcons name={icon} size={24} color={c.onPrimary} />
        {label ? (
          <AppText variant="body" color="onPrimary">
            {label}
          </AppText>
        ) : null}
      </PressableScale>
    </Animated.View>
  );
}
