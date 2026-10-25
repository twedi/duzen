import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { AppText } from '../../src/components/AppText';
import { Button } from '../../src/components/Button';
import { Checkbox } from '../../src/components/Checkbox';
import { MetaChip, PriorityTag, REPEAT_LABEL, TagChip, DueChip } from '../../src/components/Chips';
import { IconButton, Surface } from '../../src/components/Form';
import { BoardIcon } from '../../src/components/Pickers';
import { ProgressBar } from '../../src/components/ProgressBar';
import { FadeInUp, ListItem } from '../../src/components/Motion';
import { ActionSheet, SheetOption } from '../../src/components/Overlays';
import { useToast } from '../../src/components/Toast';
import { useTheme } from '../../src/ThemeContext';
import {
  CardView,
  deleteCard,
  duplicateCard,
  getCard,
  getLists,
  ListRow,
  moveCardToList,
  restoreCard,
  setCardDone,
  setSubtaskDone,
  SubtaskRow,
} from '../../src/db/repo';
import { isSameDay, longDate, rangeText, relativeDay, spanDays, timeText } from '../../src/dates';
import { withAlpha } from '../../src/colors';
import { syncNotifications } from '../../src/notifications';
import { impact, success, tap } from '../../src/haptics';

/**
 * Görev detayı: karta dokununca açılan sade, okunur görünüm.
 * Buradan alt görevler işaretlenebilir ve görev tamamlanabilir.
 * Düzenleme için sağ üstteki kalem ya da ⋮ menüsü kullanılır.
 */
export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const cardId = Number(id);
  const router = useRouter();
  const toast = useToast();
  const { theme } = useTheme();
  const c = theme.colors;

  const [card, setCard] = useState<CardView | null>(null);
  const [subs, setSubs] = useState<SubtaskRow[]>([]);
  const [lists, setLists] = useState<ListRow[]>([]);
  const [sheet, setSheet] = useState<{ title?: string; options: SheetOption[] } | null>(null);

  const load = useCallback(async () => {
    const res = await getCard(cardId);
    if (!res) {
      router.back();
      return;
    }
    setCard(res.card);
    setSubs(res.subtasks);
    setLists(await getLists(res.card.board_id));
  }, [cardId, router]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!card) return <Screen>{null}</Screen>;

  const done = !!card.done;
  const edit = () => router.push({ pathname: '/card/[id]', params: { id: String(card.id) } });
  const focus = () => router.push({ pathname: '/focus/[id]', params: { id: String(card.id) } });

  const toggleDone = async () => {
    const next = !done;
    if (next) success();
    else tap();
    await setCardDone(card.id, next);
    await load();
    syncNotifications();
    if (next) {
      toast.show({
        message: card.repeat !== 'none' ? 'Tamamlandı, bir sonraki tekrar eklendi' : 'Görev tamamlandı',
        icon: 'check-circle-outline',
        actionLabel: 'Geri al',
        onAction: async () => {
          await setCardDone(card.id, false);
          await load();
          syncNotifications();
        },
      });
    }
  };

  const toggleSub = async (s: SubtaskRow) => {
    tap();
    setSubs((prev) => prev.map((x) => (x.id === s.id ? { ...x, done: s.done ? 0 : 1 } : x)));
    await setSubtaskDone(s.id, !s.done);
  };

  const remove = () =>
    Alert.alert('Görevi sil', `"${card.title}" silinecek.`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          const snap = await getCard(card.id);
          await deleteCard(card.id);
          syncNotifications();
          router.back();
          toast.show({
            message: 'Görev silindi',
            icon: 'trash-can-outline',
            actionLabel: 'Geri al',
            onAction: async () => {
              if (snap) await restoreCard(snap);
              syncNotifications();
            },
          });
        },
      },
    ]);

  const menu = () => {
    impact();
    const others = lists.filter((l) => l.id !== card.list_id);
    setSheet({
      title: card.title,
      options: [
        { label: 'Düzenle', icon: 'pencil-outline', onPress: edit },
        { label: 'Odaklan', icon: 'timer-outline', onPress: focus },
        ...(others.length
          ? [
              {
                label: 'Başka listeye taşı',
                icon: 'arrow-right-bold-box-outline' as const,
                onPress: () =>
                  setSheet({
                    title: 'Hangi listeye?',
                    options: others.map((l) => ({
                      label: l.name,
                      icon: (l.is_done ? 'check-circle-outline' : 'format-list-bulleted') as any,
                      onPress: async () => {
                        await moveCardToList(card.id, l.id);
                        await load();
                        syncNotifications();
                      },
                    })),
                  }),
              },
            ]
          : []),
        {
          label: 'Çoğalt',
          icon: 'content-copy',
          onPress: async () => {
            await duplicateCard(card.id);
            toast.show({ message: 'Kopyası aynı listeye eklendi', icon: 'content-copy' });
          },
        },
        { label: 'Sil', icon: 'trash-can-outline', danger: true, onPress: remove },
      ],
    });
  };

  // Tarih bilgisi
  const due = card.due_at ? new Date(card.due_at) : null;
  const start = card.start_at ? new Date(card.start_at) : null;
  const isRange = !!(due && start && !isSameDay(start, due));
  const subDone = subs.filter((s) => s.done).length;

  const InfoRow = ({ icon, title, sub, tint }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; title: string; sub?: string; tint?: string }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: withAlpha(tint ?? c.primary, 0.14), alignItems: 'center', justifyContent: 'center' }}>
        <MaterialCommunityIcons name={icon} size={20} color={tint ?? c.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="body">{title}</AppText>
        {sub ? (
          <AppText variant="small" color="textSecondary">
            {sub}
          </AppText>
        ) : null}
      </View>
    </View>
  );

  return (
    <Screen bottomInset>
      {/* Üst bar: pano renginde hafif zemin */}
      <View style={{ backgroundColor: withAlpha(card.board_color, theme.dark ? 0.16 : 0.12), paddingBottom: 18, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 8, gap: 4 }}>
          <IconButton icon="arrow-left" onPress={() => router.back()} />
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <BoardIcon icon={card.board_icon} color={card.board_color} size={24} />
            <AppText variant="label" color="textSecondary" numberOfLines={1} style={{ flex: 1 }}>
              {`${card.board_name} / ${card.list_name}`}
            </AppText>
          </View>
          <IconButton icon="pencil-outline" onPress={edit} />
          <IconButton icon="dots-vertical" onPress={menu} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 20, marginTop: 10 }}>
          <View style={{ paddingTop: 3 }}>
            <Checkbox shape="circle" size={32} checked={done} onPress={toggleDone} />
          </View>
          <AppText
            variant="display"
            color={done ? 'textSecondary' : 'text'}
            style={{ flex: 1, textDecorationLine: done ? 'line-through' : 'none' }}
          >
            {card.title}
          </AppText>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 20, paddingLeft: 64, marginTop: 12 }}>
          <PriorityTag priority={card.priority} />
          {card.due_at ? <DueChip iso={card.due_at} startIso={card.start_at} hasTime={!!card.due_has_time} done={done} /> : null}
          {card.repeat !== 'none' ? <MetaChip icon="repeat" label={REPEAT_LABEL[card.repeat]} /> : null}
          {card.tags.map((t) => (
            <TagChip key={t} label={t} />
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {/* Açıklama */}
        {card.description ? (
          <FadeInUp>
            <Surface style={{ padding: 16 }}>
              <AppText variant="label" color="textSecondary" style={{ marginBottom: 6 }}>
                Açıklama
              </AppText>
              <AppText variant="bodyRegular">{card.description}</AppText>
            </Surface>
          </FadeInUp>
        ) : null}

        {/* Bilgiler */}
        <FadeInUp delay={60}>
          <Surface style={{ paddingHorizontal: 14, marginTop: card.description ? 12 : 0 }}>
            {due ? (
              <InfoRow
                icon={isRange ? 'calendar-range' : 'calendar-month-outline'}
                title={isRange && start ? `${rangeText(start, due)} · ${spanDays(start, due)} gün` : longDate(due)}
                sub={
                  (isRange && start ? `${relativeDay(start)} başlıyor, ${relativeDay(due).toLocaleLowerCase('tr-TR')} bitiyor` : relativeDay(due)) +
                  (card.due_has_time ? ` · saat ${timeText(due)}` : '')
                }
              />
            ) : (
              <InfoRow icon="calendar-blank-outline" title="Tarih yok" sub="Düzenle'den tarih ekleyebilirsin" tint={c.textSecondary} />
            )}
            <View style={{ height: 1, backgroundColor: c.border }} />
            <InfoRow icon="view-dashboard-outline" title={card.board_name} sub={`${card.list_name} listesinde`} tint={card.board_color} />
            {card.focus_minutes > 0 ? (
              <>
                <View style={{ height: 1, backgroundColor: c.border }} />
                <InfoRow icon="timer-outline" title={`${card.focus_minutes} dakika odaklanıldı`} tint="#5B9BE6" />
              </>
            ) : null}
          </Surface>
        </FadeInUp>

        {/* Alt görevler */}
        {subs.length > 0 ? (
          <FadeInUp delay={120}>
            <Surface style={{ padding: 16, marginTop: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                <AppText variant="subtitle">Alt görevler</AppText>
                <AppText variant="label" color="primary">{`${subDone}/${subs.length}`}</AppText>
              </View>
              <ProgressBar value={subDone / subs.length} />
              <View style={{ marginTop: 6 }}>
                {subs.map((s, i) => (
                  <ListItem key={s.id} index={i}>
                    <Pressable
                      onPress={() => toggleSub(s)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        paddingVertical: 12,
                        borderBottomWidth: i < subs.length - 1 ? 1 : 0,
                        borderBottomColor: c.border,
                      }}
                    >
                      <Checkbox checked={!!s.done} onPress={() => toggleSub(s)} />
                      <AppText
                        variant="bodyRegular"
                        color={s.done ? 'textSecondary' : 'text'}
                        style={{ flex: 1, textDecorationLine: s.done ? 'line-through' : 'none' }}
                      >
                        {s.title}
                      </AppText>
                    </Pressable>
                  </ListItem>
                ))}
              </View>
            </Surface>
          </FadeInUp>
        ) : null}

        <AppText variant="caption" color="textSecondary" style={{ textAlign: 'center', marginTop: 16 }}>
          Düzenlemek için sağ üstteki kaleme ya da ⋮ menüsüne dokun
        </AppText>
      </ScrollView>

      <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderTopWidth: 1, borderTopColor: c.border }}>
        <Button label="Odaklan" icon="timer-outline" variant="tonal" onPress={focus} style={{ flex: 1 }} />
        <Button
          label={done ? 'Geri al' : 'Tamamla'}
          icon={done ? 'undo' : 'check'}
          variant={done ? 'outline' : 'primary'}
          onPress={toggleDone}
          style={{ flex: 1.4 }}
        />
      </View>

      <ActionSheet visible={!!sheet} title={sheet?.title} options={sheet?.options ?? []} onClose={() => setSheet(null)} />
    </Screen>
  );
}
