import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { AppText } from '../../src/components/AppText';
import { TaskCard } from '../../src/components/TaskCard';
import { ChoiceChip } from '../../src/components/Chips';
import { EmptyState, InfoBox } from '../../src/components/EmptyState';
import { ProgressRing } from '../../src/components/ProgressRing';
import { Fab, IconButton } from '../../src/components/Form';
import { FadeInUp, ListItem } from '../../src/components/Motion';
import { useTheme } from '../../src/ThemeContext';
import { CardView, getStats, getToday, TodayData } from '../../src/db/repo';
import { diffDays, headerDate, longDate, relativeDay, startOfDay } from '../../src/dates';
import { useTaskActions } from '../../src/useTaskActions';

const RANGES = [
  { days: 1, label: 'Yarın' },
  { days: 3, label: '3 gün' },
  { days: 7, label: '7 gün' },
  { days: 30, label: '30 gün' },
];

/** Aynı panodaki aynı adlı görevler tek görev sayılır */
const sameTaskKey = (c: CardView) => `${c.board_id}|${c.title.trim().toLocaleLowerCase('tr-TR')}`;
const startDay = (c: CardView) => startOfDay(new Date(c.start_at ?? (c.due_at as string)));

type Entry = { card: CardView; extra: number };

/** Kopyaları teke indirir; ilk görülen kalır, diğerleri "+n" olarak sayılır */
function dedupe(cards: CardView[], skip: Set<string> = new Set()): Entry[] {
  const map = new Map<string, Entry>();
  const out: Entry[] = [];
  for (const c of cards) {
    const k = sameTaskKey(c);
    if (skip.has(k)) continue;
    const e = map.get(k);
    if (e) {
      e.extra++;
      continue;
    }
    const entry = { card: c, extra: 0 };
    map.set(k, entry);
    out.push(entry);
  }
  return out;
}

function greeting(d = new Date()): string {
  const h = d.getHours();
  if (h < 5) return 'İyi geceler';
  if (h < 12) return 'Günaydın';
  if (h < 18) return 'İyi günler';
  if (h < 22) return 'İyi akşamlar';
  return 'İyi geceler';
}

function SectionHeader({ title, count, hint, danger, icon }: { title: string; count: number; hint?: string; danger?: boolean; icon?: keyof typeof MaterialCommunityIcons.glyphMap }) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {icon ? <MaterialCommunityIcons name={icon} size={20} color={danger ? theme.colors.overdue : theme.colors.primary} /> : null}
        <AppText variant="subtitle" color={danger ? 'overdue' : 'text'}>
          {title}
        </AppText>
        <View style={{ backgroundColor: theme.colors.surfaceVariant, borderRadius: 8, paddingHorizontal: 7, height: 22, justifyContent: 'center' }}>
          <AppText variant="caption" color="textSecondary">
            {String(count)}
          </AppText>
        </View>
      </View>
      {hint ? (
        <AppText variant="caption" color="textSecondary">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

function MiniStat({ icon, value, label, tone }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; value: string; label: string; tone: string }) {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 10, gap: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <MaterialCommunityIcons name={icon} size={16} color={tone} />
        <AppText variant="subtitle">{value}</AppText>
      </View>
      <AppText variant="caption" color="textSecondary" numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

type UpcomingGroup = { key: string; label: string; items: Entry[] };

export default function TodayScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const c = theme.colors;
  const [data, setData] = useState<TodayData>({ overdue: [], today: [], upcoming: [], doneToday: [] });
  const [streak, setStreak] = useState(0);
  const [range, setRange] = useState(7);

  const load = useCallback(async () => {
    setData(await getToday());
    setStreak((await getStats()).streak);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const { toggle, remove } = useTaskActions(load);

  const overdue = useMemo(() => dedupe(data.overdue), [data.overdue]);
  const today = useMemo(() => dedupe(data.today, new Set(data.overdue.map(sameTaskKey))), [data.today, data.overdue]);

  /**
   * Yaklaşanlar: seçilen aralıkla filtrelenir, aynı görevin sonraki kopyaları tek kartta
   * toplanır, Bugün/Gecikmiş'te zaten görünenler tekrar gösterilmez, güne göre gruplanır.
   */
  const upcomingGroups = useMemo<UpcomingGroup[]>(() => {
    const t0 = startOfDay(new Date());
    const shown = new Set([...data.overdue, ...data.today].map(sameTaskKey));
    const groups = new Map<string, UpcomingGroup>();
    for (const entry of dedupe(data.upcoming, shown)) {
      const d = startDay(entry.card);
      const dd = diffDays(d, t0);
      if (dd > range) continue;
      const gk = String(dd);
      if (!groups.has(gk)) groups.set(gk, { key: gk, label: dd <= 6 ? relativeDay(d) : longDate(d), items: [] });
      groups.get(gk)!.items.push(entry);
    }
    return [...groups.values()].sort((a, b) => Number(a.key) - Number(b.key));
  }, [data, range]);

  const upcomingCount = upcomingGroups.reduce((s, g) => s + g.items.length, 0);
  const open = (id: number) => router.push({ pathname: '/card/[id]', params: { id: String(id) } });

  const remaining = today.length + overdue.length;
  const doneCount = data.doneToday.length;
  const totalToday = remaining + doneCount;
  const isEmpty = totalToday === 0 && data.upcoming.length === 0;
  const pct = totalToday ? doneCount / totalToday : 0;

  const headline =
    remaining > 0 ? `Bugün ${remaining} görevin var` : doneCount > 0 ? 'Bugünü tamamladın 🎉' : 'Bugün görevin yok';

  const renderEntries = (entries: Entry[], offset = 0) =>
    entries.map(({ card, extra }, i) => (
      <ListItem key={card.id} index={i + offset} style={{ marginBottom: 10 }}>
        <TaskCard
          card={card}
          showBoard
          note={extra > 0 ? `+${extra} tarih daha` : undefined}
          onPress={() => open(card.id)}
          onToggle={() => toggle(card)}
          onDelete={() => remove(card)}
        />
      </ListItem>
    ));

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16 }}>
        <View style={{ flex: 1 }}>
          <AppText variant="overline" color="textSecondary" style={{ letterSpacing: 0.8 }}>
            {headerDate()}
          </AppText>
          <AppText variant="title">{greeting()}</AppText>
        </View>
        <IconButton icon="chart-box-outline" onPress={() => router.push('/stats')} />
        <IconButton icon="calendar-month-outline" tone="tonal" onPress={() => router.push('/calendar')} />
      </View>

      {isEmpty ? (
        <View style={{ flex: 1 }}>
          <EmptyState
            icon="calendar-check-outline"
            title="Bugün biraz nefes al"
            text="Bugün için planlanmış ya da gecikmiş görevin yok. Kendine zaman ayırabilirsin."
            buttonLabel="Bugün için görev ekle"
            buttonIcon="plus"
            buttonVariant="tonal"
            onPress={() => router.push({ pathname: '/card/[id]', params: { id: 'new', due: 'today' } })}
          />
          <InfoBox icon="shimmer" text="Bir sonraki adımı planlamak için de güzel bir gün." />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          {/* Özet kartı */}
          <FadeInUp>
            <View
              style={{
                marginTop: 14,
                borderRadius: 24,
                padding: 18,
                backgroundColor: c.primaryContainer,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <ProgressRing value={pct} size={84} stroke={9} track={c.surface}>
                  <AppText variant="subtitle" color="onPrimaryContainer">{`%${Math.round(pct * 100)}`}</AppText>
                </ProgressRing>
                <View style={{ flex: 1 }}>
                  <AppText variant="title" color="onPrimaryContainer">
                    {headline}
                  </AppText>
                  <AppText variant="small" color="onPrimaryContainer" style={{ opacity: 0.8, marginTop: 2 }}>
                    {totalToday > 0 ? `${doneCount}/${totalToday} tamamlandı` : 'Yaklaşan görevlerine göz at'}
                  </AppText>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
                <MiniStat icon="alert-circle-outline" value={String(overdue.length)} label="Gecikmiş" tone={c.overdue} />
                <MiniStat icon="calendar-arrow-right" value={String(upcomingCount)} label={`${range} gün içinde`} tone={c.primary} />
                <MiniStat icon="fire" value={`${streak}`} label="Gün serisi" tone="#F2994A" />
              </View>
            </View>
          </FadeInUp>

          {overdue.length > 0 && (
            <>
              <SectionHeader title="Gecikmiş" count={overdue.length} hint="Önce buna göz at" danger icon="alert-circle-outline" />
              {renderEntries(overdue)}
            </>
          )}
          {today.length > 0 && (
            <>
              <SectionHeader title="Bugün" count={today.length} hint="Devam edenler dahil" icon="white-balance-sunny" />
              {renderEntries(today, overdue.length)}
            </>
          )}

          {data.upcoming.length > 0 && (
            <>
              <SectionHeader title="Yaklaşan" count={upcomingCount} icon="calendar-arrow-right" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                {RANGES.map((r) => (
                  <ChoiceChip key={r.days} label={r.label} selected={range === r.days} onPress={() => setRange(r.days)} />
                ))}
              </ScrollView>
              {upcomingGroups.map((g) => (
                <View key={g.key}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, marginBottom: 8 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.primary }} />
                    <AppText variant="label" color="textSecondary">
                      {g.label}
                    </AppText>
                    <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
                  </View>
                  {renderEntries(g.items)}
                </View>
              ))}
              {upcomingCount === 0 ? (
                <AppText variant="small" color="textSecondary" style={{ marginTop: 12 }}>
                  Bu aralıkta yeni görev yok. Daha uzun bir aralık seç.
                </AppText>
              ) : null}
            </>
          )}

          {data.doneToday.length > 0 && (
            <>
              <SectionHeader title="Bugün tamamlananlar" count={data.doneToday.length} hint="Geri almak için sağa kaydır" icon="check-all" />
              {renderEntries(data.doneToday.map((card) => ({ card, extra: 0 })))}
            </>
          )}

          <AppText variant="caption" color="textSecondary" style={{ textAlign: 'center', marginTop: 16 }}>
            İpucu: kartı sağa kaydır = tamamla, sola kaydır = sil
          </AppText>
        </ScrollView>
      )}

      {!isEmpty ? <Fab onPress={() => router.push({ pathname: '/card/[id]', params: { id: 'new', due: 'today' } })} /> : null}
    </Screen>
  );
}
