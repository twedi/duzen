import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { AppText } from '../../src/components/AppText';
import { TaskCard } from '../../src/components/TaskCard';
import { EmptyState, InfoBox } from '../../src/components/EmptyState';
import { ProgressBar } from '../../src/components/ProgressBar';
import { Fab, IconButton, Surface } from '../../src/components/Form';
import { CardView, getToday, setCardDone, TodayData } from '../../src/db/repo';
import { headerDate } from '../../src/dates';
import { syncNotifications } from '../../src/notifications';
import { success, tap } from '../../src/haptics';

function SectionHeader({ title, count, hint, danger }: { title: string; count: number; hint?: string; danger?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 22, marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
        <AppText variant="subtitle" color={danger ? 'overdue' : 'text'}>
          {title}
        </AppText>
        <AppText variant="small" color="textSecondary">
          {count}
        </AppText>
      </View>
      {hint ? (
        <AppText variant="caption" color="textSecondary">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

export default function TodayScreen() {
  const router = useRouter();
  const [data, setData] = useState<TodayData>({ overdue: [], today: [], upcoming: [], doneToday: [] });

  const load = useCallback(async () => {
    setData(await getToday());
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const toggle = async (card: CardView) => {
    const next = !card.done;
    if (next) success();
    else tap();
    await setCardDone(card.id, next);
    await load();
    syncNotifications();
  };

  const open = (id: number) => router.push({ pathname: '/card/[id]', params: { id: String(id) } });

  const remaining = data.today.length + data.overdue.length;
  const doneCount = data.doneToday.length;
  const totalToday = remaining + doneCount;
  const isEmpty = totalToday === 0 && data.upcoming.length === 0;

  const title =
    remaining > 0 ? `Bugün ${remaining} görevin var` : doneCount > 0 ? 'Bugünü tamamladın' : 'Bugün görevin yok';

  const renderList = (cards: CardView[]) => (
    <View style={{ gap: 10 }}>
      {cards.map((card) => (
        <TaskCard key={card.id} card={card} showBoard onPress={() => open(card.id)} onToggle={() => toggle(card)} />
      ))}
    </View>
  );

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16 }}>
        <View style={{ flex: 1 }}>
          <AppText variant="overline" color="textSecondary" style={{ letterSpacing: 0.8 }}>
            {headerDate()}
          </AppText>
          <AppText variant="display">{title}</AppText>
        </View>
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
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 110 }}>
          {totalToday > 0 ? (
            <Surface style={{ padding: 16, marginTop: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                <AppText variant="body">Bugünün ilerlemesi</AppText>
                <AppText variant="body" color="primary">{`${doneCount}/${totalToday}`}</AppText>
              </View>
              <ProgressBar value={totalToday ? doneCount / totalToday : 0} />
            </Surface>
          ) : null}

          {data.overdue.length > 0 && (
            <>
              <SectionHeader title="Gecikmiş" count={data.overdue.length} hint="Önce buna göz at" danger />
              {renderList(data.overdue)}
            </>
          )}
          {data.today.length > 0 && (
            <>
              <SectionHeader title="Bugün" count={data.today.length} hint="Tüm panolar" />
              {renderList(data.today)}
            </>
          )}
          {data.upcoming.length > 0 && (
            <>
              <SectionHeader title="Yaklaşan" count={data.upcoming.length} hint="Önümüzdeki 7 gün" />
              {renderList(data.upcoming)}
            </>
          )}
          {data.doneToday.length > 0 && (
            <>
              <SectionHeader title="Bugün tamamlananlar" count={data.doneToday.length} hint="Geri almak için işarete dokun" />
              {renderList(data.doneToday)}
            </>
          )}
        </ScrollView>
      )}

      {!isEmpty ? <Fab onPress={() => router.push({ pathname: '/card/[id]', params: { id: 'new', due: 'today' } })} /> : null}
    </Screen>
  );
}
