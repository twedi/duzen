import React from 'react';
import { Pressable, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { useTheme } from '../ThemeContext';
import { PriorityKey } from '../theme';
import { dueInfoRange } from '../dates';
import { tap } from '../haptics';
import type { Repeat } from '../db/repo';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

export const PRIORITY_LABEL: Record<PriorityKey, string> = {
  high: 'Yüksek',
  medium: 'Orta',
  low: 'Düşük',
};

export const REPEAT_LABEL: Record<Repeat, string> = {
  none: 'Tekrar yok',
  daily: 'Her gün',
  weekly: 'Her hafta',
  monthly: 'Her ay',
};

/** Kartlarda gösterilen küçük öncelik etiketi */
export function PriorityTag({ priority }: { priority: PriorityKey }) {
  const { theme } = useTheme();
  const p = theme.colors.priority[priority];
  return (
    <View style={{ backgroundColor: p.bg, paddingHorizontal: 8, height: 24, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: p.fg }} />
      <AppText variant="caption" color={p.fg}>
        {PRIORITY_LABEL[priority]}
      </AppText>
    </View>
  );
}

/** Kart formundaki öncelik seçici: üç eşit parça, okunaklı yazı */
export function PrioritySelector({ value, onChange }: { value: PriorityKey; onChange: (p: PriorityKey) => void }) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View style={{ flexDirection: 'row', backgroundColor: c.surfaceVariant, borderRadius: 14, padding: 4, gap: 4 }}>
      {(['low', 'medium', 'high'] as PriorityKey[]).map((p) => {
        const sel = value === p;
        const pc = c.priority[p];
        return (
          <Pressable
            key={p}
            onPress={() => {
              tap();
              onChange(p);
            }}
            style={{
              flex: 1,
              height: 42,
              borderRadius: 10,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              backgroundColor: sel ? pc.bg : 'transparent',
              borderWidth: sel ? 1.5 : 0,
              borderColor: pc.fg,
            }}
          >
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: pc.fg }} />
            <AppText variant="label" color={sel ? pc.fg : 'textSecondary'} numberOfLines={1}>
              {PRIORITY_LABEL[p]}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Genel seçilebilir çip (tarih, saat, tekrar, liste seçimleri) */
export function ChoiceChip({ label, icon, selected, onPress }: { label: string; icon?: IconName; selected?: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={{
        height: 38,
        paddingHorizontal: 14,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: selected ? c.primaryContainer : c.surface,
        borderWidth: 1,
        borderColor: selected ? c.primary : c.border,
      }}
    >
      {icon ? <MaterialCommunityIcons name={icon} size={16} color={selected ? c.onPrimaryContainer : c.textSecondary} /> : null}
      <AppText variant="label" color={selected ? 'onPrimaryContainer' : 'text'}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function TagChip({ label, onPress, onRemove }: { label: string; onPress?: () => void; onRemove?: () => void }) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress ?? onRemove}
      disabled={!onPress && !onRemove}
      style={{
        backgroundColor: theme.colors.primaryContainer,
        paddingHorizontal: 8,
        height: 24,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
      }}
    >
      <AppText variant="caption" color="onPrimaryContainer">
        {'#' + label}
      </AppText>
      {onRemove ? <MaterialCommunityIcons name="close" size={14} color={theme.colors.onPrimaryContainer} /> : null}
    </Pressable>
  );
}

/** Simge + kısa yazı (alt görev sayısı, tekrar vb.) */
export function MetaChip({ icon, label }: { icon: IconName; label: string }) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View style={{ backgroundColor: c.surfaceVariant, paddingHorizontal: 8, height: 24, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <MaterialCommunityIcons name={icon} size={14} color={c.textSecondary} />
      <AppText variant="caption" color="textSecondary">
        {label}
      </AppText>
    </View>
  );
}

/** Tarih/saat çipi: gecikmişse kırmızı, bugünse vurgulu */
export function DueChip({ iso, startIso = null, hasTime, done }: { iso: string; startIso?: string | null; hasTime: boolean; done: boolean }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const { label, tone } = dueInfoRange(startIso, iso, hasTime, done);
  const map = {
    overdue: { bg: c.priority.high.bg, fg: c.priority.high.fg, icon: 'alert-circle-outline' as IconName },
    today: { bg: c.primaryContainer, fg: c.onPrimaryContainer, icon: (hasTime ? 'clock-outline' : 'calendar-today') as IconName },
    soon: { bg: c.surfaceVariant, fg: c.text, icon: (hasTime ? 'clock-outline' : 'calendar-month-outline') as IconName },
    later: { bg: c.surfaceVariant, fg: c.textSecondary, icon: 'calendar-month-outline' as IconName },
    done: { bg: c.surfaceVariant, fg: c.textSecondary, icon: 'calendar-check-outline' as IconName },
  }[tone];
  return (
    <View style={{ backgroundColor: map.bg, paddingHorizontal: 8, height: 24, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <MaterialCommunityIcons name={map.icon} size={14} color={map.fg} />
      <AppText variant="caption" color={map.fg}>
        {label}
      </AppText>
    </View>
  );
}
