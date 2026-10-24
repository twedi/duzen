import React from 'react';
import { Pressable, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import { BOARD_COLORS } from '../theme';
import { ICON_CHOICES } from '../db/templates';
import { tap } from '../haptics';

export function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {BOARD_COLORS.map((col) => {
        const sel = col.toLowerCase() === value.toLowerCase();
        return (
          <Pressable
            key={col}
            onPress={() => {
              tap();
              onChange(col);
            }}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: col,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: sel ? 3 : 0,
              borderColor: theme.colors.primary,
            }}
          >
            {sel ? <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function IconPicker({ value, onChange, color }: { value: string; onChange: (i: string) => void; color: string }) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {ICON_CHOICES.map((ic) => {
        const sel = ic === value;
        return (
          <Pressable
            key={ic}
            onPress={() => {
              tap();
              onChange(ic);
            }}
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: sel ? color : c.surface,
              borderWidth: 1,
              borderColor: sel ? color : c.border,
            }}
          >
            <MaterialCommunityIcons name={ic as any} size={24} color={sel ? '#FFFFFF' : c.textSecondary} />
          </Pressable>
        );
      })}
    </View>
  );
}

/** Pano/şablon simgesi: renkli kutu içinde beyaz simge */
export function BoardIcon({ icon, color, size = 44 }: { icon: string; color: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <MaterialCommunityIcons name={icon as any} size={size * 0.5} color="#FFFFFF" />
    </View>
  );
}
