import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, TextInput, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { KeyboardSafeView } from '../../src/components/KeyboardSafeView';
import { Screen } from '../../src/components/Screen';
import { AppText } from '../../src/components/AppText';
import { Checkbox } from '../../src/components/Checkbox';
import { IconButton } from '../../src/components/Form';
import { BoardIcon } from '../../src/components/Pickers';
import { ProgressBar } from '../../src/components/ProgressBar';
import { ReorderableList } from '../../src/components/ReorderableList';
import { SwipeRow } from '../../src/components/SwipeRow';
import { ActionSheet, SheetOption } from '../../src/components/Overlays';
import { useToast } from '../../src/components/Toast';
import { useTheme } from '../../src/ThemeContext';
import { fonts } from '../../src/theme';
import { withAlpha } from '../../src/colors';
import {
  addItems,
  Checklist,
  ChecklistItem,
  checklistAsText,
  clearDoneItems,
  deleteChecklist,
  deleteItem,
  getChecklist,
  getItems,
  reorderItems,
  restoreItem,
  setItemDone,
  uncheckAll,
  updateItemText,
} from '../../src/db/checklists';
import { impact, success, tap } from '../../src/haptics';

/** Tek bir liste öğesi satırı: işaretle, dokunup düzenle, sola kaydırıp sil */
function ItemRow({
  item,
  color,
  editing,
  onStartEdit,
  onEndEdit,
  onToggle,
  onDelete,
  dragHandle,
  active,
}: {
  item: ChecklistItem;
  color: string;
  editing: boolean;
  onStartEdit: () => void;
  onEndEdit: (text: string) => void;
  onToggle: () => void;
  onDelete: () => void;
  dragHandle?: Record<string, any>;
  active?: boolean;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [text, setText] = useState(item.text);
  const done = !!item.done;

  return (
    <SwipeRow onSwipeRight={onToggle} rightLabel={done ? 'Geri al' : 'Tamam'} onSwipeLeft={onDelete}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          minHeight: 54,
          paddingLeft: 14,
          paddingRight: dragHandle ? 0 : 14,
          borderRadius: 16,
          backgroundColor: c.surface,
          borderWidth: 1,
          borderColor: active ? color : c.border,
          elevation: active ? 8 : 0,
        }}
      >
        <Checkbox shape="circle" checked={done} onPress={onToggle} color={color} />
        {editing ? (
          <TextInput
            autoFocus
            value={text}
            onChangeText={setText}
            onSubmitEditing={() => onEndEdit(text)}
            onBlur={() => onEndEdit(text)}
            returnKeyType="done"
            style={{ flex: 1, color: c.text, fontFamily: fonts.regular, fontSize: 16, paddingVertical: 12 }}
          />
        ) : (
          <Pressable onPress={onStartEdit} style={{ flex: 1, paddingVertical: 14 }}>
            <AppText
              variant="bodyRegular"
              color={done ? 'textSecondary' : 'text'}
              style={{ fontSize: 16, textDecorationLine: done ? 'line-through' : 'none' }}
            >
              {item.text}
            </AppText>
          </Pressable>
        )}
        {dragHandle ? (
          <View {...dragHandle} style={{ alignSelf: 'stretch', justifyContent: 'center', paddingHorizontal: 12 }}>
            <MaterialCommunityIcons name="drag-vertical" size={24} color={active ? color : c.textSecondary} />
          </View>
        ) : null}
      </View>
    </SwipeRow>
  );
}

export default function ChecklistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const listId = Number(id);
  const router = useRouter();
  const toast = useToast();
  const { theme } = useTheme();
  const c = theme.colors;

  const [list, setList] = useState<Checklist | null>(null);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [input, setInput] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [sheet, setSheet] = useState<{ title?: string; options: SheetOption[] } | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const load = useCallback(async () => {
    const l = await getChecklist(listId);
    if (!l) {
      router.back();
      return;
    }
    setList(l);
    setItems(await getItems(listId));
  }, [listId, router]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openItems = useMemo(() => items.filter((i) => !i.done), [items]);
  const doneItems = useMemo(() => items.filter((i) => i.done), [items]);
  const color = list?.color ?? c.primary;

  /* ---------- İşlemler ---------- */

  const add = async () => {
    const t = input.trim();
    if (!t) return;
    tap();
    setInput('');
    await addItems(listId, t);
    await load();
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
  };

  const toggle = async (item: ChecklistItem) => {
    const next = !item.done;
    if (next) success();
    else tap();
    // Önce ekranda değiştir, sonra kaydet (gecikme hissedilmesin)
    setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, done: next ? 1 : 0 } : x)));
    await setItemDone(item.id, next);
    if (next && openItems.length === 1) toast.show({ message: 'Liste tamamlandı 🎉', icon: 'check-all' });
  };

  const remove = async (item: ChecklistItem) => {
    setItems((prev) => prev.filter((x) => x.id !== item.id));
    await deleteItem(item.id);
    toast.show({
      message: `"${item.text}" silindi`,
      icon: 'trash-can-outline',
      actionLabel: 'Geri al',
      onAction: async () => {
        await restoreItem(item);
        load();
      },
    });
  };

  const endEdit = async (item: ChecklistItem, text: string) => {
    setEditingId(null);
    const t = text.trim();
    if (!t) return remove(item);
    if (t !== item.text) {
      setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, text: t } : x)));
      await updateItemText(item.id, t);
    }
  };

  const onReorder = async (data: ChecklistItem[]) => {
    setItems([...data, ...doneItems]);
    await reorderItems([...data, ...doneItems].map((x) => x.id));
  };

  const clearDone = async () => {
    impact();
    const removed = await clearDoneItems(listId);
    await load();
    toast.show({
      message: `${removed.length} öğe temizlendi`,
      icon: 'broom',
      actionLabel: 'Geri al',
      onAction: async () => {
        for (const r of removed) await restoreItem(r);
        load();
      },
    });
  };

  const share = async () => {
    if (!list) return;
    try {
      await Share.share({ message: checklistAsText(list, items) });
    } catch {
      // paylaşım iptal edildi
    }
  };

  const menu = () => {
    if (!list) return;
    impact();
    setSheet({
      title: list.name,
      options: [
        { label: 'Listeyi düzenle', icon: 'pencil-outline', onPress: () => router.push({ pathname: '/checklist/edit', params: { id: String(listId) } }) },
        { label: 'Metin olarak paylaş', icon: 'share-variant-outline', onPress: share },
        ...(doneItems.length
          ? [
              {
                label: 'Tüm işaretleri kaldır',
                icon: 'restore' as const,
                onPress: async () => {
                  await uncheckAll(listId);
                  load();
                },
              },
              { label: 'İşaretlileri temizle', icon: 'broom' as const, onPress: clearDone },
            ]
          : []),
        {
          label: 'Listeyi sil',
          icon: 'trash-can-outline',
          danger: true,
          onPress: () =>
            Alert.alert('Listeyi sil', `"${list.name}" ve içindeki tüm öğeler silinecek.`, [
              { text: 'Vazgeç', style: 'cancel' },
              {
                text: 'Sil',
                style: 'destructive',
                onPress: async () => {
                  await deleteChecklist(listId);
                  router.back();
                },
              },
            ]),
        },
      ],
    });
  };

  /* ---------- Görünüm ---------- */

  const renderRow = (item: ChecklistItem, opts?: { dragHandle?: Record<string, any>; active: boolean }) => (
    <ItemRow
      key={item.id}
      item={item}
      color={color}
      editing={editingId === item.id}
      onStartEdit={() => setEditingId(item.id)}
      onEndEdit={(t) => endEdit(item, t)}
      onToggle={() => toggle(item)}
      onDelete={() => remove(item)}
      dragHandle={editingId === null ? opts?.dragHandle : undefined}
      active={opts?.active}
    />
  );

  const doneSection =
    doneItems.length > 0 ? (
      <View style={{ marginTop: openItems.length ? 10 : 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
          <Pressable onPress={() => setShowDone(!showDone)} hitSlop={8} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MaterialCommunityIcons name={showDone ? 'chevron-down' : 'chevron-right'} size={22} color={c.textSecondary} />
            <AppText variant="label" color="textSecondary">{`Tamamlananlar (${doneItems.length})`}</AppText>
          </Pressable>
          <Pressable onPress={clearDone} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <MaterialCommunityIcons name="broom" size={16} color={c.primary} />
            <AppText variant="label" color="primary">
              Temizle
            </AppText>
          </Pressable>
        </View>
        {showDone ? <View style={{ gap: 8, opacity: 0.85 }}>{doneItems.map((it) => renderRow(it))}</View> : null}
      </View>
    ) : null;

  const empty = (
    <View style={{ alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24 }}>
      <View style={{ width: 84, height: 84, borderRadius: 28, backgroundColor: withAlpha(color, 0.15), alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
        <MaterialCommunityIcons name={doneItems.length ? 'check-all' : (list?.icon as any) ?? 'format-list-checks'} size={38} color={color} />
      </View>
      <AppText variant="subtitle" style={{ textAlign: 'center' }}>
        {doneItems.length ? 'Hepsi tamam!' : 'Liste boş'}
      </AppText>
      <AppText variant="small" color="textSecondary" style={{ textAlign: 'center', marginTop: 4 }}>
        {doneItems.length ? 'Yeni öğe eklemek için aşağıya yaz.' : 'Aşağıdaki alana yazıp ekle. Birden çok satır yapıştırabilirsin.'}
      </AppText>
    </View>
  );

  return (
    <Screen bottomInset>
      {/* Üst bar */}
      <View style={{ backgroundColor: withAlpha(color, theme.dark ? 0.16 : 0.12), paddingBottom: 14, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 8, gap: 10 }}>
          <IconButton icon="arrow-left" onPress={() => router.back()} />
          {list ? <BoardIcon icon={list.icon} color={list.color} size={38} /> : null}
          <View style={{ flex: 1 }}>
            <AppText variant="title" numberOfLines={1}>
              {list?.name ?? ''}
            </AppText>
            <AppText variant="caption" color="textSecondary">
              {items.length ? `${doneItems.length}/${items.length} tamamlandı` : 'Henüz öğe yok'}
            </AppText>
          </View>
          <IconButton icon="dots-vertical" onPress={menu} />
        </View>
        {items.length ? (
          <View style={{ paddingHorizontal: 20, marginTop: 10 }}>
            <ProgressBar value={doneItems.length / items.length} color={color} height={8} />
          </View>
        ) : null}
      </View>

      {/* Öğeler + ekleme çubuğu: görünen alan klavyenin üstünde biter */}
      <KeyboardSafeView>
      <ReorderableList
        data={openItems}
        keyExtractor={(it) => String(it.id)}
        renderItem={(it, opts) => renderRow(it, opts)}
        enabled={openItems.length > 1 && editingId === null}
        onReorder={onReorder}
        gap={8}
        scrollRef={scrollRef}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 24 }}
        ListEmptyComponent={empty}
        ListFooterComponent={doneSection}
      />

      {/* Ekleme çubuğu: klavye açılınca klavyenin hemen üstüne çıkar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 12,
          paddingTop: 10,
          paddingBottom: 10,
          borderTopWidth: 1,
          borderTopColor: c.border,
          backgroundColor: c.background,
        }}
      >
        <Pressable
          onPress={() => inputRef.current?.focus()}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            minHeight: 50,
            borderRadius: 16,
            paddingHorizontal: 14,
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: input ? color : c.border,
          }}
        >
          <MaterialCommunityIcons name="plus" size={22} color={color} />
          <TextInput
            ref={inputRef}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={add}
            // Çok satırlı: yapıştırılan satırlar korunur; Enter yine "ekle" yapar
            multiline
            submitBehavior="submit"
            returnKeyType="done"
            placeholder="Öğe ekle…"
            placeholderTextColor={c.textSecondary}
            style={{ flex: 1, color: c.text, fontFamily: fonts.regular, fontSize: 16, paddingVertical: 10, maxHeight: 120 }}
          />
        </Pressable>
        <Pressable
          onPress={add}
          disabled={!input.trim()}
          style={{
            width: 50,
            height: 50,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: input.trim() ? color : c.surfaceVariant,
          }}
        >
          <MaterialCommunityIcons name="arrow-up" size={24} color={input.trim() ? '#FFFFFF' : c.textSecondary} />
        </Pressable>
      </View>
      </KeyboardSafeView>

      <ActionSheet visible={!!sheet} title={sheet?.title} options={sheet?.options ?? []} onClose={() => setSheet(null)} />
    </Screen>
  );
}
