import React, { useRef } from 'react';
import { PanResponder, Pressable, View } from 'react-native';
import { useTheme } from '../ThemeContext';

export type GanttMode = 'move' | 'start' | 'end';

export const BAR_H = 26;
const HANDLE_W = 18;

type Props = {
  x: number;
  width: number;
  top: number;
  color: string;
  done: boolean;
  selected: boolean;
  dayWidth: number;
  onSelect: () => void;
  onOpen: () => void;
  onDragStart: () => void;
  onDrag: (mode: GanttMode, deltaDays: number) => void;
  onDragEnd: (mode: GanttMode, deltaDays: number) => void;
};

/**
 * Gantt çubuğu.
 * Seçili değilken dokunmak çubuğu seçer (zaman çizelgesi rahatça kaydırılabilsin diye).
 * Seçiliyken: gövdeden sürükle = taşı (süre korunur), kenarlardan sürükle = başlangıcı/bitişi değiştir,
 * kısa dokunuş = kartı aç.
 */
export function GanttBar(props: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const p = useRef(props);
  p.current = props;

  const make = (mode: GanttMode) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => p.current.selected,
      onMoveShouldSetPanResponder: () => p.current.selected,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: () => p.current.onDragStart(),
      onPanResponderMove: (_e, g) => p.current.onDrag(mode, Math.round(g.dx / p.current.dayWidth)),
      onPanResponderRelease: (_e, g) => {
        const isTap = Math.abs(g.dx) < 6 && Math.abs(g.dy) < 6;
        if (mode === 'move' && isTap) {
          p.current.onDragEnd(mode, 0);
          p.current.onOpen();
          return;
        }
        p.current.onDragEnd(mode, Math.round(g.dx / p.current.dayWidth));
      },
      onPanResponderTerminate: () => p.current.onDragEnd(mode, 0),
    });

  const r = useRef({ move: make('move'), start: make('start'), end: make('end') }).current;
  const { x, width, top, color, done, selected } = props;
  const w = Math.max(width, 8);

  if (!selected) {
    return (
      <Pressable
        onPress={props.onSelect}
        hitSlop={{ top: 8, bottom: 8 }}
        style={{ position: 'absolute', left: x, top, width: w, height: BAR_H, borderRadius: 8, backgroundColor: color, opacity: done ? 0.4 : 1 }}
      />
    );
  }

  const grip = (
    <View style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: c.text, opacity: 0.8 }} />
  );

  return (
    <View style={{ position: 'absolute', left: x - HANDLE_W, top: top - 6, width: w + HANDLE_W * 2, height: BAR_H + 12, flexDirection: 'row', alignItems: 'center' }}>
      <View {...r.start.panHandlers} style={{ width: HANDLE_W, height: '100%', alignItems: 'flex-end', justifyContent: 'center', paddingRight: 3 }}>
        {grip}
      </View>
      <View
        {...r.move.panHandlers}
        style={{
          flex: 1,
          height: BAR_H,
          borderRadius: 8,
          backgroundColor: color,
          opacity: done ? 0.55 : 1,
          borderWidth: 2,
          borderColor: c.text,
        }}
      />
      <View {...r.end.panHandlers} style={{ width: HANDLE_W, height: '100%', alignItems: 'flex-start', justifyContent: 'center', paddingLeft: 3 }}>
        {grip}
      </View>
    </View>
  );
}
