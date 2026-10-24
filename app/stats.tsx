import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { Screen } from '../src/components/Screen';
import { AppText } from '../src/components/AppText';
import { ScreenHeader, Surface } from '../src/components/Form';
import { ProgressBar } from '../src/components/ProgressBar';
import { ProgressRing } from '../src/components/ProgressRing';
import { FadeInUp } from '../src/components/Motion';
import { BoardIcon } from '../src/components/Pickers';
import { useTheme } from '../src/ThemeContext';
import { getStats, listBoards, Stats } from '../src/db/repo';
import { WEEKDAYS_MON_FIRST } from '../src/dates';
import { withAlpha } from '../src/colors';

const CHART_H = 130;

/** Haftalık çubuk: yüksekliği sıfırdan büyüyerek gelir */
function Bar({ value, max, label, highlight, index }: { value: number; max: number; label: string; highlight: boolean; index: number }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const h = useSharedValue(0);
  const target = max ? Math.max(value ? 8 : 4, (value / max) * CHART_H) : 4;
  useEffect(() => {
    h.value = withDelay(index * 60, withTiming(target, { duration: 600, easing: Easing.out(Easing.cubic) }));
  }, [target, index, h]);
  const anim = useAnimatedStyle(() => ({ height: h.value }));
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
      <AppText variant="caption" color={highlight ? 'primary' : 'textSecondary'}>
        {value ? String(value) : ''}
      </AppText>
      <View style={{ height: CHART_H, justifyContent: 'flex-end' }}>
        <Animated.View
          style={[{ width: 22, borderRadius: 8, backgroundColor: highlight ? c.primary : withAlpha(c.primary, value ? 0.45 : 0.15) }, anim]}
        />
      </View>
      <AppText variant="caption" color={highlight ? 'text' : 'textSecondary'}>
        {label}
      </AppText>
    </View>
  );
}

function StatTile({ icon, value, label, tone }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; value: string; label: string; tone: string }) {
  return (
    <Surface style={{ width: '48%', padding: 14, gap: 6 }}>
      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: withAlpha(tone, 0.15), alignItems: 'center', justifyContent: 'center' }}>
        <MaterialCommunityIcons name={icon} size={20} color={tone} />
      </View>
      <AppText variant="title">{value}</AppText>
      <AppText variant="caption" color="textSecondary">
        {label}
      </AppText>
    </Surface>
  );
}

export default function StatsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const c = theme.colors;
  const [stats, setStats] = useState<Stats | null>(null);
  const [icons, setIcons] = useState<Record<number, string>>({});

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setStats(await getStats());
        const bs = await listBoards();
        setIcons(Object.fromEntries(bs.map((b) => [b.id, b.icon])));
      })();
    }, [])
  );

  if (!stats) return <Screen>{null}</Screen>;

  const max = Math.max(...stats.week.map((d) => d.count), 1);
  const weekTotal = stats.week.reduce((s, d) => s + d.count, 0);
  const all = stats.totalDone + stats.totalOpen;
  const focusText =
    stats.focusMinutes >= 60 ? `${Math.floor(stats.focusMinutes / 60)} sa ${stats.focusMinutes % 60} dk` : `${stats.focusMinutes} dk`;

  return (
    <Screen>
      <ScreenHeader title="İstatistikler" subtitle="İlerlemene bir bak" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {/* Seri */}
        <FadeInUp>
          <View style={{ borderRadius: 24, padding: 18, marginTop: 8, backgroundColor: withAlpha('#F2994A', theme.dark ? 0.18 : 0.14), flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: '#F2994A', alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name="fire" size={36} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="display">{`${stats.streak} gün`}</AppText>
              <AppText variant="small" color="textSecondary">
                {stats.streak > 0 ? 'Arka arkaya görev tamamladın, devam!' : 'Bugün bir görev tamamla, seri başlasın.'}
              </AppText>
              <AppText variant="caption" color="textSecondary" style={{ marginTop: 2 }}>{`En uzun seri: ${stats.bestStreak} gün`}</AppText>
            </View>
          </View>
        </FadeInUp>

        {/* Haftalık grafik */}
        <FadeInUp delay={80}>
          <Surface style={{ padding: 16, marginTop: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
              <AppText variant="subtitle">Son 7 gün</AppText>
              <AppText variant="label" color="primary">{`${weekTotal} görev tamamlandı`}</AppText>
            </View>
            <View style={{ flexDirection: 'row' }}>
              {stats.week.map((d, i) => (
                <Bar
                  key={i}
                  index={i}
                  value={d.count}
                  max={max}
                  label={WEEKDAYS_MON_FIRST[(d.date.getDay() + 6) % 7]}
                  highlight={i === stats.week.length - 1}
                />
              ))}
            </View>
          </Surface>
        </FadeInUp>

        {/* Özet kutuları */}
        <FadeInUp delay={160}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, marginTop: 14 }}>
            <StatTile icon="check-circle-outline" value={String(stats.totalDone)} label="Tamamlanan görev" tone={c.priority.low.fg} />
            <StatTile icon="checkbox-blank-circle-outline" value={String(stats.totalOpen)} label="Açık görev" tone={c.primary} />
            <StatTile icon="alert-circle-outline" value={String(stats.overdue)} label="Gecikmiş" tone={c.priority.high.fg} />
            <StatTile icon="timer-outline" value={focusText} label="Toplam odak süresi" tone="#5B9BE6" />
          </View>
        </FadeInUp>

        {/* Genel tamamlanma */}
        <FadeInUp delay={240}>
          <Surface style={{ padding: 16, marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <ProgressRing value={all ? stats.totalDone / all : 0} size={72} stroke={8}>
              <AppText variant="label">{`%${all ? Math.round((stats.totalDone / all) * 100) : 0}`}</AppText>
            </ProgressRing>
            <View style={{ flex: 1 }}>
              <AppText variant="body">Genel tamamlanma</AppText>
              <AppText variant="small" color="textSecondary">{`${all} görevin ${stats.totalDone} tanesi bitti`}</AppText>
            </View>
          </Surface>
        </FadeInUp>

        {/* Panolar */}
        {stats.boards.length ? (
          <FadeInUp delay={320}>
            <AppText variant="subtitle" style={{ marginTop: 22, marginBottom: 10 }}>
              Panolara göre
            </AppText>
            <Surface style={{ paddingHorizontal: 16, paddingVertical: 6 }}>
              {stats.boards.map((b, i) => {
                const pct = b.total ? b.done / b.total : 0;
                return (
                  <View key={b.id} style={{ paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: c.border }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <BoardIcon icon={icons[b.id] ?? 'view-dashboard-outline'} color={b.color} size={28} />
                      <AppText variant="body" style={{ flex: 1 }} numberOfLines={1}>
                        {b.name}
                      </AppText>
                      <AppText variant="caption" color="textSecondary">{`${b.done}/${b.total}`}</AppText>
                    </View>
                    <ProgressBar value={pct} color={b.color} />
                  </View>
                );
              })}
            </Surface>
          </FadeInUp>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
