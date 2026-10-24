import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { Checkbox } from './Checkbox';
import { DueChip, MetaChip, PriorityTag, REPEAT_LABEL, TagChip } from './Chips';
import { PressableScale } from './Motion';
import { SwipeRow } from './SwipeRow';
import { useTheme } from '../ThemeContext';
import type { CardView } from '../db/repo';

type Props = {
  card: CardView;
  /** Pano ve liste adını üstte göster (Bugün, Takvim, Arama) */
  showBoard?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  onToggle?: () => void;
  /** Verilirse kart sola kaydırılarak silinebilir */
  onDelete?: () => void;
  /** Sürükleme tutamağının dokunma işleyicileri (ReorderableList verir) */
  dragHandle?: Record<string, any>;
  active?: boolean;
  /** Ek bilgi çipi, ör. "+2 tarih daha" */
  note?: string;
};

export function TaskCard({ card, showBoard, onPress, onLongPress, onToggle, onDelete, dragHandle, active, note }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;

  // İşaret hemen değişsin (animasyon görünsün), veritabanı işlemi kısa süre sonra yapılsın
  const [checked, setChecked] = useState(!!card.done);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    setChecked(!!card.done);
  }, [card.done]);
  useEffect(
    () => () => {
      if (pending.current) clearTimeout(pending.current);
    },
    []
  );
  const handleToggle = onToggle
    ? () => {
        setChecked((v) => !v);
        if (pending.current) clearTimeout(pending.current);
        pending.current = setTimeout(onToggle, 260);
      }
    : undefined;

  const done = checked;
  const sub = card.sub_total > 0 ? `${card.sub_done}/${card.sub_total}` : null;
  const stripe = c.priority[card.priority].fg;

  const body = (
    <PressableScale
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      scaleTo={0.985}
      style={{
        backgroundColor: c.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: active ? c.primary : c.border,
        paddingVertical: 14,
        paddingLeft: 14,
        paddingRight: dragHandle ? 0 : 14,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        overflow: 'hidden',
        opacity: done ? 0.72 : 1,
        elevation: active ? 10 : theme.dark ? 0 : 1,
        shadowColor: '#1C1B2E',
        shadowOpacity: active ? 0.2 : theme.dark ? 0 : 0.05,
        shadowRadius: active ? 14 : 6,
        shadowOffset: { width: 0, height: active ? 6 : 2 },
      }}
    >
      {/* Öncelik şeridi */}
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: done ? c.border : stripe }} />

      <View style={{ paddingTop: 1 }}>
        <Checkbox shape="circle" checked={done} onPress={handleToggle} />
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
        {card.description ? (
          <AppText variant="small" color="textSecondary" numberOfLines={1} style={{ marginTop: 2 }}>
            {card.description}
          </AppText>
        ) : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {card.due_at ? <DueChip iso={card.due_at} startIso={card.start_at} hasTime={!!card.due_has_time} done={done} /> : null}
          <PriorityTag priority={card.priority} />
          {card.repeat !== 'none' ? <MetaChip icon="repeat" label={REPEAT_LABEL[card.repeat]} /> : null}
          {sub ? <MetaChip icon="format-list-checks" label={sub} /> : null}
          {card.focus_minutes > 0 ? <MetaChip icon="timer-outline" label={`${card.focus_minutes} dk`} /> : null}
          {note ? <MetaChip icon="calendar-multiple" label={note} /> : null}
          {card.tags.slice(0, 3).map((t) => (
            <TagChip key={t} label={t} />
          ))}
        </View>
      </View>

      {dragHandle ? (
        <View
          {...dragHandle}
          hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
          style={{ alignSelf: 'stretch', justifyContent: 'center', paddingHorizontal: 12, marginVertical: -14 }}
        >
          <MaterialCommunityIcons name="drag-vertical" size={26} color={active ? c.primary : c.textSecondary} />
        </View>
      ) : null}
    </PressableScale>
  );

  if (!handleToggle && !onDelete) return body;
  return (
    <SwipeRow
      onSwipeRight={handleToggle}
      rightLabel={done ? 'Geri al' : 'Tamamla'}
      onSwipeLeft={onDelete}
    >
      {body}
    </SwipeRow>
  );
}
