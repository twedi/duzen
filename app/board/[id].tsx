import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { Screen } from '../../src/components/Screen';
import { AppText } from '../../src/components/AppText';
import { TaskCard } from '../../src/components/TaskCard';
import { ProgressBar } from '../../src/components/ProgressBar';
import { Button } from '../../src/components/Button';
import { BoardIcon } from '../../src/components/Pickers';
import { Fab, IconButton } from '../../src/components/Form';
import { ActionSheet, PromptModal, SheetOption } from '../../src/components/Overlays';
import { useTheme } from '../../src/ThemeContext';
import {
  addList,
  Board,
  CardView,
  deleteBoard,
  deleteCard,
  deleteList,
  duplicateCard,
  getBoard,
  getCardsOfBoard,
  getLists,
  ListRow,
  moveCardToList,
  moveList,
  renameList,
  reorderCards,
  saveBoardAsTemplate,
  setCardDone,
  setDoneList,
} from '../../src/db/repo';
import { syncNotifications } from '../../src/notifications';
import { impact, success, tap } from '../../src/haptics';

type SortMode = 'manual' | 'due' | 'priority';
const SORT_LABEL: Record<SortMode, string> = { manual: 'Elle', due: 'Tarihe göre', priority: 'Önceliğe göre' };
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const;

type PromptState = { title: string; initial?: string; confirmLabel?: string; onSubmit: (v: string) => void } | null;
type SheetState = { title?: string; options: SheetOption[] } | null;

export default function BoardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const boardId = Number(id);
  const router = useRouter();
  const { theme } = useTheme();
  const c = theme.colors;

  const [board, setBoard] = useState<Board | null>(null);
  const [lists, setLists] = useState<ListRow[]>([]);
  const [cards, setCards] = useState<Record<number, CardView[]>>({});
  const [activeId, setActiveId] = useState<number | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('manual');
  const [prompt, setPrompt] = useState<PromptState>(null);
  const [sheet, setSheet] = useState<SheetState>(null);

  const load = useCallback(async () => {
    const b = await getBoard(boardId);
    if (!b) {
      router.back();
      return;
    }
    const l = await getLists(boardId);
    const cs = await getCardsOfBoard(boardId);
    const map: Record<number, CardView[]> = {};
    l.forEach((x) => (map[x.id] = []));
    cs.forEach((card) => {
      (map[card.list_id] ??= []).push(card);
    });
    setBoard(b);
    setLists(l);
    setCards(map);
    setActiveId((prev) => (prev && l.some((x) => x.id === prev) ? prev : l[0]?.id ?? null));
  }, [boardId, router]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const activeList = lists.find((l) => l.id === activeId) ?? null;
  const allCards = useMemo(() => Object.values(cards).flat(), [cards]);
  const total = allCards.length;
  const doneCount = allCards.filter((x) => x.done).length;

  const visible = useMemo(() => {
    const arr = activeId ? [...(cards[activeId] ?? [])] : [];
    if (sortMode === 'due') {
      arr.sort((a, b) => (a.due_at ?? '9999').localeCompare(b.due_at ?? '9999'));
    } else if (sortMode === 'priority') {
      arr.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || (a.due_at ?? '9999').localeCompare(b.due_at ?? '9999'));
    }
    return arr;
  }, [cards, activeId, sortMode]);

  /* ---------- Kart işlemleri ---------- */

  const addCard = () => {
    if (!activeId) return;
    router.push({ pathname: '/card/[id]', params: { id: 'new', listId: String(activeId) } });
  };
  const openCard = (cardId: number) => router.push({ pathname: '/card/[id]', params: { id: String(cardId) } });

  const toggleDone = async (card: CardView) => {
    const next = !card.done;
    if (next) success();
    else tap();
    await setCardDone(card.id, next);
    await load();
    syncNotifications();
  };

  const cardMenu = (card: CardView) => {
    impact();
    const others = lists.filter((l) => l.id !== card.list_id);
    setSheet({
      title: card.title,
      options: [
        {
          label: card.done ? 'Tamamlanmadı olarak işaretle' : 'Tamamlandı olarak işaretle',
          icon: card.done ? 'checkbox-blank-circle-outline' : 'check-circle-outline',
          onPress: () => toggleDone(card),
        },
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
            await load();
          },
        },
        {
          label: 'Sil',
          icon: 'trash-can-outline',
          danger: true,
          onPress: () =>
            Alert.alert('Kartı sil', `"${card.title}" silinecek.`, [
              { text: 'Vazgeç', style: 'cancel' },
              {
                text: 'Sil',
                style: 'destructive',
                onPress: async () => {
                  await deleteCard(card.id);
                  await load();
                  syncNotifications();
                },
              },
            ]),
        },
      ],
    });
  };

  const onDragEnd = async (data: CardView[]) => {
    if (!activeId) return;
    setCards((prev) => ({ ...prev, [activeId]: data }));
    await reorderCards(data.map((x) => x.id));
  };

  /* ---------- Liste ve pano menüleri ---------- */

  const newListPrompt = () =>
    setPrompt({
      title: 'Yeni liste',
      confirmLabel: 'Ekle',
      onSubmit: async (v) => {
        const newId = await addList(boardId, v);
        setActiveId(newId);
        await load();
      },
    });

  const listMenu = (list: ListRow) => {
    impact();
    const idx = lists.findIndex((l) => l.id === list.id);
    setSheet({
      title: list.name,
      options: [
        {
          label: 'Yeniden adlandır',
          icon: 'pencil-outline',
          onPress: () =>
            setPrompt({
              title: 'Liste adı',
              initial: list.name,
              onSubmit: async (v) => {
                await renameList(list.id, v);
                load();
              },
            }),
        },
        {
          label: list.is_done ? 'Tamamlanma listesi olmasın' : 'Tamamlanma listesi yap',
          icon: 'check-circle-outline',
          onPress: async () => {
            await setDoneList(boardId, list.is_done ? null : list.id);
            load();
          },
        },
        ...(idx > 0 ? [{ label: 'Sola taşı', icon: 'arrow-left' as const, onPress: async () => { await moveList(list.id, -1); load(); } }] : []),
        ...(idx < lists.length - 1 ? [{ label: 'Sağa taşı', icon: 'arrow-right' as const, onPress: async () => { await moveList(list.id, 1); load(); } }] : []),
        {
          label: 'Listeyi sil',
          icon: 'trash-can-outline',
          danger: true,
          onPress: () => {
            if (lists.length <= 1) {
              Alert.alert('Silinemez', 'Bir panoda en az bir liste kalmalı.');
              return;
            }
            const n = (cards[list.id] ?? []).length;
            Alert.alert('Listeyi sil', n ? `Bu listedeki ${n} kart da silinecek.` : 'Liste silinecek.', [
              { text: 'Vazgeç', style: 'cancel' },
              {
                text: 'Sil',
                style: 'destructive',
                onPress: async () => {
                  await deleteList(list.id);
                  await load();
                  syncNotifications();
                },
              },
            ]);
          },
        },
      ],
    });
  };

  const boardMenu = () =>
    setSheet({
      title: board?.name,
      options: [
        { label: 'Panoyu düzenle', icon: 'pencil-outline', onPress: () => router.push({ pathname: '/board/new', params: { id: String(boardId) } }) },
        { label: 'Liste ekle', icon: 'playlist-plus', onPress: newListPrompt },
        {
          label: 'Şablon olarak kaydet',
          icon: 'content-save-outline',
          onPress: () =>
            setPrompt({
              title: 'Şablon adı',
              initial: board?.name,
              confirmLabel: 'Kaydet',
              onSubmit: async (v) => {
                await saveBoardAsTemplate(boardId, v);
                Alert.alert('Şablon kaydedildi', 'Yeni pano oluştururken bu şablonu seçebilirsin.');
              },
            }),
        },
        {
          label: 'Panoyu sil',
          icon: 'trash-can-outline',
          danger: true,
          onPress: () =>
            Alert.alert('Panoyu sil', 'Bu panodaki tüm listeler ve kartlar silinecek. Emin misin?', [
              { text: 'Vazgeç', style: 'cancel' },
              {
                text: 'Sil',
                style: 'destructive',
                onPress: async () => {
                  await deleteBoard(boardId);
                  syncNotifications();
                  router.back();
                },
              },
            ]),
        },
      ],
    });

  const sortMenu = () =>
    setSheet({
      title: 'Sıralama',
      options: (Object.keys(SORT_LABEL) as SortMode[]).map((k) => ({
        label: SORT_LABEL[k],
        selected: sortMode === k,
        icon: k === 'manual' ? 'gesture-tap-hold' : k === 'due' ? 'calendar-month-outline' : 'flag-outline',
        onPress: () => setSortMode(k),
      })),
    });

  /* ---------- Görünüm ---------- */

  const renderItem = ({ item, drag, isActive }: RenderItemParams<CardView>) => (
    <ScaleDecorator activeScale={1.03}>
      <View style={{ marginBottom: 10 }}>
        <TaskCard
          card={item}
          active={isActive}
          onPress={() => openCard(item.id)}
          onLongPress={() => cardMenu(item)}
          onToggle={() => toggleDone(item)}
          onDragHandle={sortMode === 'manual' && visible.length > 1 ? drag : undefined}
        />
      </View>
    </ScaleDecorator>
  );

  const listEmpty = (
    <View style={{ alignItems: 'center', paddingTop: 48, paddingHorizontal: 24 }}>
      <View
        style={{ width: 96, height: 96, borderRadius: 30, backgroundColor: c.primaryContainer, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}
      >
        <MaterialCommunityIcons name={activeList?.is_done ? 'check-all' : 'clipboard-text-outline'} size={40} color={c.primary} />
      </View>
      <AppText variant="subtitle" style={{ textAlign: 'center' }}>
        {activeList?.is_done ? 'Henüz tamamlanan yok' : 'Bu liste boş'}
      </AppText>
      <AppText variant="small" color="textSecondary" style={{ textAlign: 'center', marginTop: 6, marginBottom: 20 }}>
        {activeList?.is_done
          ? 'Bir görevi işaretlediğinde buraya gelir.'
          : 'İlk küçük adımını ekle; gerisi adım adım gelir.'}
      </AppText>
      {!activeList?.is_done ? <Button label="Kart ekle" icon="plus" onPress={addCard} style={{ alignSelf: 'stretch' }} /> : null}
    </View>
  );

  return (
    <Screen>
      {/* Üst bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 8, gap: 10 }}>
        <IconButton icon="arrow-left" onPress={() => router.back()} />
        {board ? <BoardIcon icon={board.icon} color={board.color} size={40} /> : null}
        <View style={{ flex: 1 }}>
          <AppText variant="title" numberOfLines={1}>
            {board?.name ?? ''}
          </AppText>
          {board?.description ? (
            <AppText variant="caption" color="textSecondary" numberOfLines={1}>
              {board.description}
            </AppText>
          ) : null}
        </View>
        <IconButton icon="dots-horizontal" onPress={boardMenu} />
      </View>

      {/* İlerleme */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, marginTop: 10 }}>
        <View style={{ flex: 1 }}>
          <ProgressBar value={total ? doneCount / total : 0} />
        </View>
        <AppText variant="label" color="primary">{`${doneCount}/${total} tamamlandı`}</AppText>
      </View>

      {/* Liste sekmeleri */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 14, gap: 8 }}
      >
        {lists.map((l) => {
          const sel = l.id === activeId;
          const n = (cards[l.id] ?? []).length;
          return (
            <Pressable
              key={l.id}
              onPress={() => {
                tap();
                setActiveId(l.id);
              }}
              onLongPress={() => listMenu(l)}
              style={{
                height: 40,
                paddingHorizontal: 14,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: sel ? c.primaryContainer : c.surface,
                borderWidth: 1,
                borderColor: sel ? c.primary : c.border,
              }}
            >
              {l.is_done ? <MaterialCommunityIcons name="check-circle-outline" size={16} color={sel ? c.onPrimaryContainer : c.textSecondary} /> : null}
              <AppText variant="label" color={sel ? 'onPrimaryContainer' : 'text'}>
                {l.name}
              </AppText>
              <View style={{ minWidth: 22, height: 20, borderRadius: 6, paddingHorizontal: 5, backgroundColor: sel ? c.surface : c.surfaceVariant, alignItems: 'center', justifyContent: 'center' }}>
                <AppText variant="caption" color={sel ? 'primary' : 'textSecondary'}>
                  {String(n)}
                </AppText>
              </View>
            </Pressable>
          );
        })}
        <Pressable
          onPress={newListPrompt}
          style={{
            height: 40,
            paddingHorizontal: 14,
            borderRadius: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: c.primary,
          }}
        >
          <MaterialCommunityIcons name="plus" size={16} color={c.primary} />
          <AppText variant="label" color="primary">
            Liste
          </AppText>
        </Pressable>
      </ScrollView>

      {/* Araç çubuğu */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 8 }}>
        <AppText variant="small" color="textSecondary">
          {sortMode === 'manual' && visible.length > 1 ? 'Sıralamak için ⋮⋮ tutamağından sürükle' : `${visible.length} kart`}
        </AppText>
        <Pressable onPress={sortMenu} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <MaterialCommunityIcons name="sort" size={18} color={c.primary} />
          <AppText variant="label" color="primary">
            {SORT_LABEL[sortMode]}
          </AppText>
        </Pressable>
      </View>

      {/* Kartlar */}
      <DraggableFlatList
        data={visible}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        onDragBegin={() => impact()}
        onDragEnd={({ data }) => onDragEnd(data)}
        containerStyle={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 2, paddingBottom: 120 }}
        ListEmptyComponent={listEmpty}
        showsVerticalScrollIndicator={false}
      />

      {visible.length > 0 && !activeList?.is_done ? <Fab label="Kart ekle" onPress={addCard} /> : null}

      <ActionSheet visible={!!sheet} title={sheet?.title} options={sheet?.options ?? []} onClose={() => setSheet(null)} />
      <PromptModal
        visible={!!prompt}
        title={prompt?.title ?? ''}
        initial={prompt?.initial}
        confirmLabel={prompt?.confirmLabel}
        onSubmit={(v) => prompt?.onSubmit(v)}
        onClose={() => setPrompt(null)}
      />
    </Screen>
  );
}
