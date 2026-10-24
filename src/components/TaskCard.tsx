import React from 'react';
import { Pressable, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { Checkbox } from './Checkbox';
import { DueChip, MetaChip, PriorityTag, REPEAT_LABEL, TagChip } from './Chips';
import { useTheme } from '../ThemeContext';
import type { CardView } from '../db/repo';

type Props = {
  card: CardView;
  /** Pano ve liste adını üstte göster (Bugün, Takvim, Arama) */
  showBoard?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  onToggle?: () => void;
  /** Verilirse sağda sürükleme tutamağı çıkar */
  onDragHandle?: () => void;
  active?: boolean;
};

export function TaskCard({ card, showBoard, onPress, onLongPress, onToggle, onDragHandle, active }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const done = !!card.done;
  const sub = card.sub_total > 0 ? `${card.sub_done}/${card.sub_total}` : null;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      style={{
        backgroundColor: c.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: active ? c.primary : c.border,
        paddingVertical: 14,
        paddingLeft: 12,
        paddingRight: onDragHandle ? 4 : 14,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        elevation: active ? 8 : 0,
        shadowColor: '#000',
        shadowOpacity: active ? 0.15 : 0,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      }}
    >
      <View style={{ paddingTop: 1 }}>
        <Checkbox shape="circle" checked={done} onPress={onToggle} />
      </View>

      <View style={{ flex: 1 }}>
        {showBoard ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: card.board_color }} />
            <AppText variant="caption" color="textSecondary" numberOfLines={1} style={{ flex: 1 }}>
              {`${card.board_name} · ${card.list_name}`}
            </AppText>
          </View>
        ) : null}
        <AppText
          variant="body"
          color={done ? 'textSecondary' : 'text'}
          style={{ textDecorationLine: done ? 'line-through' : 'none' }}
          numberOfLines={3}
        >
          {card.title}
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {card.due_at ? <DueChip iso={card.due_at} hasTime={!!card.due_has_time} done={done} /> : null}
          <PriorityTag priority={card.priority} />
          {card.repeat !== 'none' ? <MetaChip icon="repeat" label={REPEAT_LABEL[card.repeat]} /> : null}
          {sub ? <MetaChip icon="format-list-checks" label={sub} /> : null}
          {card.tags.slice(0, 3).map((t) => (
            <TagChip key={t} label={t} />
          ))}
        </View>
      </View>

      {onDragHandle ? (
        <Pressable onPressIn={onDragHandle} hitSlop={10} style={{ alignSelf: 'stretch', justifyContent: 'center', paddingHorizontal: 8 }}>
          <MaterialCommunityIcons name="drag-vertical" size={26} color={c.textSecondary} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}
