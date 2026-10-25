import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen } from '../src/components/Screen';
import { AppText } from '../src/components/AppText';
import { Button } from '../src/components/Button';
import { TaskCard } from '../src/components/TaskCard';
import { IconButton, ScreenHeader } from '../src/components/Form';
import { useTheme } from '../src/ThemeContext';
import { CardView, getCardsBetween } from '../src/db/repo';
import { addDays, dayKey, isSameDay, longDate, monthGrid, monthTitle, startOfDay, WEEKDAYS_MON_FIRST } from '../src/dates';
import { tap } from '../src/haptics';
import { useTaskActions } from '../src/useTaskActions';

export default function CalendarScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const c = theme.colors;
  const { width } = useWindowDimensions();
  const cell = Math.floor((width - 32) / 7);

  const today = startOfDay(new Date());
  const [month, setMonth] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [selected, setSelected] = useState<Date>(today);
  const [cards, setCards] = useState<CardView[]>([]);

  const grid = useMemo(() => monthGrid(month.y, month.m), [month]);

  const load = useCallback(async () => {
    setCards(await getCardsBetween(grid[0], addDays(grid[41], 1)));
  }, [grid]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const byDay = useMemo(() => {
    const m: Record<string, CardView[]> = {};
    for (const card of cards) {
      if (!card.due_at) continue;
      // Aralıklı görevler aralıktaki her günde görünür
      const end = startOfDay(new Date(card.due_at));
      let d = card.start_at ? startOfDay(new Date(card.start_at)) : end;
      let guard = 0;
      while (d <= end && guard++ < 62) {
        (m[dayKey(d)] ??= []).push(card);
        d = addDays(d, 1);
      }
    }
    return m;
  }, [cards]);

  const shiftMonth = (dir: -1 | 1) => {
    tap();
    setMonth(({ y, m }) => {
      const d = new Date(y, m + dir, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };

  const goToday = () => {
    tap();
    setMonth({ y: today.getFullYear(), m: today.getMonth() });
    setSelected(today);
  };

  const { toggle } = useTaskActions(load);

  const dayCards = byDay[dayKey(selected)] ?? [];

  return (
    <Screen>
      <ScreenHeader
        title="Takvim"
        onBack={() => router.back()}
        right={
          <Pressable onPress={goToday} hitSlop={8} style={{ paddingHorizontal: 8 }}>
            <AppText variant="label" color="primary">
              Bugün
            </AppText>
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}>
        {/* Ay başlığı */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 8 }}>
          <IconButton icon="chevron-left" onPress={() => shiftMonth(-1)} />
          <AppText variant="subtitle">{monthTitle(month.y, month.m)}</AppText>
          <IconButton icon="chevron-right" onPress={() => shiftMonth(1)} />
        </View>

        {/* Gün adları */}
        <View style={{ flexDirection: 'row' }}>
          {WEEKDAYS_MON_FIRST.map((d) => (
            <View key={d} style={{ width: cell, alignItems: 'center', paddingVertical: 6 }}>
              <AppText variant="caption" color="textSecondary">
                {d}
              </AppText>
            </View>
          ))}
        </View>

        {/* Günler */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {grid.map((d) => {
            const inMonth = d.getMonth() === month.m;
            const isSel = isSameDay(d, selected);
            const isToday = isSameDay(d, today);
            const list = byDay[dayKey(d)] ?? [];
            const open = list.filter((x) => !x.done);
            return (
              <Pressable
                key={d.toISOString()}
                onPress={() => {
                  tap();
                  setSelected(d);
                  if (!inMonth) setMonth({ y: d.getFullYear(), m: d.getMonth() });
                }}
                style={{ width: cell, height: cell + 6, alignItems: 'center', paddingTop: 4 }}
              >
                <View
                  style={{
                    width: cell - 10,
                    height: cell - 10,
                    borderRadius: (cell - 10) / 2,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isSel ? c.primary : 'transparent',
                    borderWidth: isToday && !isSel ? 1.5 : 0,
                    borderColor: c.primary,
                  }}
                >
                  <AppText variant="label" color={isSel ? 'onPrimary' : inMonth ? 'text' : 'textSecondary'} style={{ opacity: inMonth ? 1 : 0.5 }}>
                    {String(d.getDate())}
                  </AppText>
                </View>
                <View style={{ flexDirection: 'row', gap: 3, marginTop: 3, height: 6 }}>
                  {open.slice(0, 3).map((x) => (
                    <View key={x.id} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.priority[x.priority].fg }} />
                  ))}
                  {open.length === 0 && list.length > 0 ? (
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.textSecondary, opacity: 0.5 }} />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Seçili gün */}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 18, marginBottom: 10 }}>
          <AppText variant="subtitle">{longDate(selected)}</AppText>
          <AppText variant="small" color="textSecondary">{`${dayCards.length} görev`}</AppText>
        </View>
        <View style={{ gap: 10 }}>
          {dayCards.map((card) => (
            <TaskCard
              key={card.id}
              card={card}
              showBoard
              onPress={() => router.push({ pathname: '/task/[id]', params: { id: String(card.id) } })}
              onToggle={() => toggle(card)}
            />
          ))}
          {dayCards.length === 0 ? (
            <AppText variant="small" color="textSecondary" style={{ textAlign: 'center', paddingVertical: 16 }}>
              Bu gün için görev yok.
            </AppText>
          ) : null}
        </View>
        <Button
          label="Bu güne kart ekle"
          icon="plus"
          variant="tonal"
          style={{ marginTop: 16 }}
          onPress={() => router.push({ pathname: '/card/[id]', params: { id: 'new', due: dayKey(selected) } })}
        />
      </ScrollView>
    </Screen>
  );
}
