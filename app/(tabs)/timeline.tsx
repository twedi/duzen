import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { AppText } from '../../src/components/AppText';
import { ChoiceChip } from '../../src/components/Chips';
import { EmptyState } from '../../src/components/EmptyState';
import { IconButton, Surface } from '../../src/components/Form';
import { GanttBar, GanttMode } from '../../src/components/GanttBar';
import { useTheme } from '../../src/ThemeContext';
import { BoardSummary, CardView, getDatedCards, listBoards, updateCardDates } from '../../src/db/repo';
import { addDays, diffDays, isSameDay, rangeText, shortDate, spanDays, startOfDay } from '../../src/dates';
import { syncNotifications } from '../../src/notifications';
import { tap } from '../../src/haptics';

const ZOOMS = [
  { label: 'Gün', w: 52 },
  { label: 'Hafta', w: 26 },
  { label: 'Ay', w: 12 },
];
const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const WEEKDAY_LETTER = ['P', 'P', 'S', 'Ç', 'P', 'C', 'C']; // Pazar..Cumartesi

const HEADER_H = 52;
const GROUP_H = 38;
const ROW_H = 60;
const BAR_TOP = 26;

type Preview = { id: number; mode: GanttMode; delta: number } | null;
type Span = { s: Date; e: Date };
type LayoutItem = { type: 'group'; y: number; board: BoardSummary; count: number } | { type: 'row'; y: number; card: CardView };

function baseSpan(card: CardView): Span {
  const e = startOfDay(new Date(card.due_at as string));
  let s = card.start_at ? startOfDay(new Date(card.start_at)) : e;
  if (s > e) s = e;
  return { s, e };
}

function applyDelta({ s, e }: Span, mode: GanttMode, d: number): Span {
  if (mode === 'move') return { s: addDays(s, d), e: addDays(e, d) };
  if (mode === 'start') {
    const ns = addDays(s, d);
    return { s: ns > e ? e : ns, e };
  }
  const ne = addDays(e, d);
  return { s, e: ne < s ? s : ne };
}

export default function TimelineScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const c = theme.colors;

  const [cards, setCards] = useState<CardView[]>([]);
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [boardFilter, setBoardFilter] = useState<number | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [zoomIdx, setZoomIdx] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [preview, setPreview] = useState<Preview>(null);
  const [dragging, setDragging] = useState(false);
  const [bodyH, setBodyH] = useState(0);

  const hRef = useRef<any>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollToTodayPending = useRef(true);
  const lastDelta = useRef<{ mode: GanttMode; d: number } | null>(null);

  const load = useCallback(async () => {
    setCards(await getDatedCards());
    setBoards(await listBoards());
    setLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const dw = ZOOMS[zoomIdx].w;
  const today = startOfDay(new Date());

  const filtered = useMemo(
    () => cards.filter((x) => (showDone || !x.done) && (boardFilter === null || x.board_id === boardFilter)),
    [cards, showDone, boardFilter]
  );

  // Zaman aralığı: bugünün 2 hafta öncesinden en az 45 gün sonrasına, görevleri kapsayacak kadar
  const range = useMemo(() => {
    const t = startOfDay(new Date());
    let min = addDays(t, -14);
    let max = addDays(t, 45);
    for (const card of cards) {
      const { s, e } = baseSpan(card);
      if (s < addDays(min, 3)) min = addDays(s, -3);
      if (e > addDays(max, -7)) max = addDays(e, 10);
    }
    const days = diffDays(max, min) + 1;
    return { min, days, dates: Array.from({ length: days }, (_, i) => addDays(min, i)) };
  }, [cards]);

  const totalW = range.days * dw;
  const xOf = (d: Date) => diffDays(d, range.min) * dw;

  const spanOf = (card: CardView): Span => {
    const base = baseSpan(card);
    return preview && preview.id === card.id ? applyDelta(base, preview.mode, preview.delta) : base;
  };

  // Satır yerleşimi: pano başlığı + görev satırları
  const { items, contentH } = useMemo(() => {
    const out: LayoutItem[] = [];
    let y = 0;
    for (const b of boards) {
      const rows = filtered.filter((x) => x.board_id === b.id);
      if (!rows.length) continue;
      out.push({ type: 'group', y, board: b, count: rows.length });
      y += GROUP_H;
      for (const card of rows) {
        out.push({ type: 'row', y, card });
        y += ROW_H;
      }
    }
    return { items: out, contentH: y + 160 };
  }, [boards, filtered]);

  /* ---------- Kaydırma ---------- */

  const scrollToToday = (animated = true) => {
    hRef.current?.scrollTo({ x: Math.max(0, xOf(today) - dw * 2), animated });
  };

  useEffect(() => {
    scrollToTodayPending.current = true;
  }, [zoomIdx]);

  useEffect(() => {
    if (bodyH > 0 && loaded && scrollToTodayPending.current) {
      scrollToTodayPending.current = false;
      const id = setTimeout(() => scrollToToday(false), 50);
      return () => clearTimeout(id);
    }
  });

  /* ---------- Sürükleme ---------- */

  const commit = async (card: CardView, mode: GanttMode, d: number) => {
    const due = new Date(card.due_at as string);
    const base = baseSpan(card);
    const { s, e } = applyDelta(base, mode, d);
    const newDue = addDays(due, diffDays(e, base.e)); // saati korur
    const startIso = isSameDay(s, e) ? null : s.toISOString();
    await updateCardDates(card.id, startIso, newDue.toISOString());
    syncNotifications();
  };

  const onDrag = (card: CardView, mode: GanttMode, d: number) => {
    const last = lastDelta.current;
    if (last && last.mode === mode && last.d === d) return;
    if (last && last.d !== d) tap();
    lastDelta.current = { mode, d };
    setPreview({ id: card.id, mode, delta: d });
  };

  const onDragEnd = async (card: CardView, mode: GanttMode, d: number) => {
    lastDelta.current = null;
    setDragging(false);
    if (d !== 0) {
      await commit(card, mode, d);
      await load();
    }
    setPreview(null);
  };

  const shiftSelected = async (d: number) => {
    const card = cards.find((x) => x.id === selectedId);
    if (!card) return;
    tap();
    await commit(card, 'move', d);
    await load();
  };

  const selected = cards.find((x) => x.id === selectedId) ?? null;
  const selectedSpan = selected ? spanOf(selected) : null;

  /* ---------- Görünüm ---------- */

  if (loaded && cards.length === 0) {
    return (
      <Screen>
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <AppText variant="display">Çizelge</AppText>
        </View>
        <EmptyState
          icon="chart-timeline-variant"
          title="Çizelge henüz boş"
          text="Kartlarına tarih ya da tarih aralığı ekledikçe tüm panolardaki işlerin burada zaman çizgisinde görünür."
          buttonLabel="Panolara git"
          buttonIcon="arrow-right"
          buttonVariant="tonal"
          onPress={() => router.push('/boards')}
        />
      </Screen>
    );
  }

  const header = (
    <View style={{ width: totalW, height: HEADER_H, backgroundColor: c.background, borderBottomWidth: 1, borderBottomColor: c.border }}>
      {range.dates.map((d, i) =>
        d.getDate() === 1 || i === 0 ? (
          <AppText
            key={`m${i}`}
            variant="caption"
            color="textSecondary"
            style={{ position: 'absolute', left: i * dw + 4, top: 4 }}
            numberOfLines={1}
          >
            {`${MONTHS[d.getMonth()]} ${d.getFullYear()}`}
          </AppText>
        ) : null
      )}
      {range.dates.map((d, i) => {
        const isToday = isSameDay(d, today);
        const showNum = dw >= 26 || d.getDay() === 1 || d.getDate() === 1;
        if (!showNum && !isToday) return null;
        return (
          <View key={`d${i}`} style={{ position: 'absolute', left: i * dw, top: 22, width: Math.max(dw, 26), alignItems: dw >= 26 ? 'center' : 'flex-start' }}>
            <View
              style={{
                minWidth: 24,
                height: 24,
                paddingHorizontal: 2,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isToday ? c.primary : 'transparent',
              }}
            >
              <AppText variant="caption" color={isToday ? 'onPrimary' : d.getDay() === 0 || d.getDay() === 6 ? 'textSecondary' : 'text'}>
                {dw >= 40 ? `${WEEKDAY_LETTER[d.getDay()]} ${d.getDate()}` : String(d.getDate())}
              </AppText>
            </View>
          </View>
        );
      })}
    </View>
  );

  const background = (
    <>
      {range.dates.map((d, i) =>
        d.getDay() === 0 || d.getDay() === 6 ? (
          <View
            key={`w${i}`}
            pointerEvents="none"
            style={{ position: 'absolute', left: i * dw, top: 0, width: dw, height: contentH, backgroundColor: c.surfaceVariant, opacity: 0.45 }}
          />
        ) : d.getDate() === 1 ? (
          <View key={`ms${i}`} pointerEvents="none" style={{ position: 'absolute', left: i * dw, top: 0, width: 1, height: contentH, backgroundColor: c.border }} />
        ) : null
      )}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', left: xOf(today) + dw / 2 - 1, top: 0, width: 2, height: contentH, backgroundColor: c.primary, opacity: 0.6 }}
      />
    </>
  );

  return (
    <Screen>
      {/* Başlık ve filtreler */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16 }}>
        <AppText variant="display">Çizelge</AppText>
        <Pressable onPress={() => scrollToToday()} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <MaterialCommunityIcons name="calendar-today" size={18} color={c.primary} />
          <AppText variant="label" color="primary">
            Bugün
          </AppText>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingTop: 12 }}>
        {ZOOMS.map((z, i) => (
          <ChoiceChip key={z.label} label={z.label} selected={zoomIdx === i} onPress={() => setZoomIdx(i)} />
        ))}
        <ChoiceChip label="Tamamlananlar" icon={showDone ? 'eye-outline' : 'eye-off-outline'} selected={showDone} onPress={() => setShowDone(!showDone)} />
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 10 }}>
        <ChoiceChip label="Tüm panolar" selected={boardFilter === null} onPress={() => setBoardFilter(null)} />
        {boards.map((b) => (
          <ChoiceChip key={b.id} label={b.name} selected={boardFilter === b.id} onPress={() => setBoardFilter(b.id)} />
        ))}
      </ScrollView>

      {/* Zaman çizelgesi */}
      <View style={{ flex: 1 }} onLayout={(e) => setBodyH(e.nativeEvent.layout.height)}>
        {bodyH > 0 ? (
          <Animated.ScrollView
            ref={hRef}
            horizontal
            scrollEnabled={selectedId === null}
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
          >
            <ScrollView
              style={{ width: totalW, height: bodyH }}
              stickyHeaderIndices={[0]}
              scrollEnabled={!dragging}
              showsVerticalScrollIndicator={false}
            >
              {header}
              <View style={{ width: totalW, height: contentH }}>
                {background}
                {/* Boşluğa dokununca seçim kalkar */}
                <Pressable style={{ position: 'absolute', left: 0, top: 0, width: totalW, height: contentH }} onPress={() => setSelectedId(null)} />

                {items.map((it) => {
                  if (it.type === 'group') {
                    return (
                      <View
                        key={`g${it.board.id}`}
                        pointerEvents="none"
                        style={{ position: 'absolute', left: 0, top: it.y, width: totalW, height: GROUP_H, borderTopWidth: 1, borderTopColor: c.border }}
                      >
                        <Animated.View
                          style={{
                            transform: [{ translateX: scrollX }],
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8,
                            paddingHorizontal: 16,
                            height: GROUP_H,
                          }}
                        >
                          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: it.board.color }} />
                          <AppText variant="label">{it.board.name}</AppText>
                          <AppText variant="caption" color="textSecondary">
                            {String(it.count)}
                          </AppText>
                        </Animated.View>
                      </View>
                    );
                  }
                  const card = it.card;
                  const { s, e } = spanOf(card);
                  const x = xOf(s);
                  const width = spanDays(s, e) * dw - 4;
                  const done = !!card.done;
                  return (
                    <React.Fragment key={`r${card.id}`}>
                      <AppText
                        variant="caption"
                        color={done ? 'textSecondary' : 'text'}
                        numberOfLines={1}
                        style={{
                          position: 'absolute',
                          left: x + 2,
                          top: it.y + 6,
                          maxWidth: Math.max(width + 140, 160),
                          fontFamily: 'Inter_600SemiBold',
                          textDecorationLine: done ? 'line-through' : 'none',
                        }}
                      >
                        {card.title}
                      </AppText>
                      <GanttBar
                        x={x + 2}
                        width={width}
                        top={it.y + BAR_TOP}
                        color={card.board_color}
                        done={done}
                        selected={selectedId === card.id}
                        dayWidth={dw}
                        onSelect={() => {
                          tap();
                          setSelectedId(card.id);
                        }}
                        onOpen={() => router.push({ pathname: '/task/[id]', params: { id: String(card.id) } })}
                        onDragStart={() => setDragging(true)}
                        onDrag={(mode, d) => onDrag(card, mode, d)}
                        onDragEnd={(mode, d) => onDragEnd(card, mode, d)}
                      />
                    </React.Fragment>
                  );
                })}

                {items.length === 0 ? (
                  <Animated.View style={{ position: 'absolute', top: 24, left: 0, width: 320, transform: [{ translateX: scrollX }], paddingHorizontal: 20 }}>
                    <AppText variant="small" color="textSecondary">
                      Bu filtrelerle gösterilecek görev yok.
                    </AppText>
                  </Animated.View>
                ) : null}
              </View>
            </ScrollView>
          </Animated.ScrollView>
        ) : null}

        {/* Seçili görev araç çubuğu */}
        {selected && selectedSpan ? (
          <Surface style={{ position: 'absolute', left: 12, right: 12, bottom: 12, padding: 14, elevation: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: selected.board_color }} />
              <View style={{ flex: 1 }}>
                <AppText variant="body" numberOfLines={1}>
                  {selected.title}
                </AppText>
                <AppText variant="caption" color="textSecondary">
                  {(isSameDay(selectedSpan.s, selectedSpan.e) ? shortDate(selectedSpan.e) : rangeText(selectedSpan.s, selectedSpan.e)) +
                    ` · ${spanDays(selectedSpan.s, selectedSpan.e)} gün · ${selected.board_name}`}
                </AppText>
              </View>
              <IconButton icon="close" onPress={() => setSelectedId(null)} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
              <ChoiceChip label="1 gün geri" icon="chevron-left" onPress={() => shiftSelected(-1)} />
              <ChoiceChip label="1 gün ileri" icon="chevron-right" onPress={() => shiftSelected(1)} />
              <View style={{ flex: 1 }} />
              <ChoiceChip
                label="Aç"
                icon="open-in-new"
                selected
                onPress={() => router.push({ pathname: '/task/[id]', params: { id: String(selected.id) } })}
              />
            </View>
            <AppText variant="caption" color="textSecondary" style={{ marginTop: 10 }}>
              Çubuğu sürükleyerek taşı, kenarlarındaki tutamaklardan uzat ya da kısalt.
            </AppText>
          </Surface>
        ) : null}
      </View>
    </Screen>
  );
}

