import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Screen } from '../../src/components/Screen';
import { AppText } from '../../src/components/AppText';
import { Button } from '../../src/components/Button';
import { Checkbox } from '../../src/components/Checkbox';
import { ChoiceChip, PrioritySelector, REPEAT_LABEL, TagChip } from '../../src/components/Chips';
import { FieldLabel, IconButton, ScreenHeader, Surface } from '../../src/components/Form';
import { BoardIcon } from '../../src/components/Pickers';
import { ProgressBar } from '../../src/components/ProgressBar';
import { useTheme } from '../../src/ThemeContext';
import {
  Board,
  BoardWithLists,
  deleteCard,
  duplicateCard,
  getAllTags,
  getBoard,
  getBoardsWithLists,
  getCard,
  getList,
  getLists,
  ListRow,
  Repeat,
  saveCard,
} from '../../src/db/repo';
import { formatHm, isSameDay, longDate, parseDayKey, quickDates, relativeDay, shortDate, startOfDay, timeText } from '../../src/dates';
import { syncNotifications } from '../../src/notifications';
import { fonts, PriorityKey } from '../../src/theme';
import { success, tap } from '../../src/haptics';

type Sub = { key: string; title: string; done: boolean };
let keyCounter = 0;
const nextKey = () => `s${++keyCounter}`;

const TIME_PRESETS: [number, number][] = [
  [9, 0],
  [12, 0],
  [18, 0],
  [21, 0],
];
const REPEATS: Repeat[] = ['none', 'daily', 'weekly', 'monthly'];

export default function CardScreen() {
  const params = useLocalSearchParams<{ id: string; listId?: string; due?: string }>();
  const isNew = params.id === 'new';
  const router = useRouter();
  const { theme } = useTheme();
  const c = theme.colors;

  const [ready, setReady] = useState(false);
  const [quickMode, setQuickMode] = useState(false);
  const [boards, setBoards] = useState<BoardWithLists[]>([]);
  const [board, setBoard] = useState<Board | null>(null);
  const [lists, setLists] = useState<ListRow[]>([]);
  const [listId, setListId] = useState(0);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [done, setDone] = useState(false);
  const [due, setDue] = useState<Date | null>(null);
  const [hasTime, setHasTime] = useState(false);
  const [priority, setPriority] = useState<PriorityKey>('medium');
  const [repeat, setRepeat] = useState<Repeat>('none');
  const [tags, setTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [addingTag, setAddingTag] = useState(false);
  const [tagText, setTagText] = useState('');
  const [subs, setSubs] = useState<Sub[]>([]);
  const [subText, setSubText] = useState('');

  const applyBoard = (b: Board, ls: ListRow[], preferList?: number) => {
    setBoard(b);
    setLists(ls);
    const fallback = ls.find((l) => !l.is_done)?.id ?? ls[0]?.id ?? 0;
    setListId(preferList && ls.some((l) => l.id === preferList) ? preferList : fallback);
  };

  useEffect(() => {
    (async () => {
      setAllTags(await getAllTags());
      if (isNew) {
        if (params.listId) {
          const list = await getList(Number(params.listId));
          const b = list ? await getBoard(list.board_id) : null;
          if (!list || !b) {
            router.back();
            return;
          }
          applyBoard(b, await getLists(b.id), list.id);
          if (list.is_done) setDone(true);
        } else {
          const bs = await getBoardsWithLists();
          if (!bs.length) {
            Alert.alert('Önce bir pano oluştur', 'Kart eklemek için en az bir panon olmalı.', [
              { text: 'Pano oluştur', onPress: () => router.replace('/board/new') },
              { text: 'Vazgeç', style: 'cancel', onPress: () => router.back() },
            ]);
            return;
          }
          setBoards(bs);
          setQuickMode(true);
          applyBoard(bs[0], bs[0].lists);
        }
        if (params.due) {
          const d = params.due === 'today' ? startOfDay(new Date()) : parseDayKey(params.due);
          if (d) setDue(d);
        }
      } else {
        const res = await getCard(Number(params.id));
        if (!res) {
          router.back();
          return;
        }
        const { card, subtasks } = res;
        const b = await getBoard(card.board_id);
        if (b) applyBoard(b, await getLists(b.id), card.list_id);
        setTitle(card.title);
        setDescription(card.description);
        setDone(!!card.done);
        setDue(card.due_at ? new Date(card.due_at) : null);
        setHasTime(!!card.due_has_time);
        setPriority(card.priority);
        setRepeat(card.repeat);
        setTags(card.tags);
        setSubs(subtasks.map((s) => ({ key: nextKey(), title: s.title, done: !!s.done })));
      }
      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doneList = lists.find((l) => l.is_done);
  const firstOpen = lists.find((l) => !l.is_done);
  const currentList = lists.find((l) => l.id === listId);

  /* ---------- Tamamlandı & liste ---------- */

  const toggleDone = () => {
    const nd = !done;
    if (nd) success();
    else tap();
    setDone(nd);
    if (nd && doneList) setListId(doneList.id);
    if (!nd && currentList?.is_done && firstOpen) setListId(firstOpen.id);
  };

  const selectList = (l: ListRow) => {
    setListId(l.id);
    if (l.is_done) setDone(true);
    else if (currentList?.is_done) setDone(false);
  };

  const selectBoard = (b: BoardWithLists) => {
    applyBoard(b, b.lists);
    setDone(false);
  };

  /* ---------- Tarih & saat ---------- */

  const setDay = (d: Date) => {
    const x = new Date(d);
    if (hasTime && due) x.setHours(due.getHours(), due.getMinutes(), 0, 0);
    else x.setHours(0, 0, 0, 0);
    setDue(x);
  };

  const pickCustomDate = () =>
    DateTimePickerAndroid.open({
      value: due ?? new Date(),
      mode: 'date',
      onChange: (e, d) => {
        if (e.type === 'set' && d) setDay(d);
      },
    });

  const setTime = (h: number, m: number) => {
    const base = due ? new Date(due) : startOfDay(new Date());
    base.setHours(h, m, 0, 0);
    setDue(base);
    setHasTime(true);
  };

  const clearTime = () => {
    if (due) {
      const x = new Date(due);
      x.setHours(0, 0, 0, 0);
      setDue(x);
    }
    setHasTime(false);
  };

  const pickCustomTime = () =>
    DateTimePickerAndroid.open({
      value: due ?? new Date(),
      mode: 'time',
      is24Hour: true,
      onChange: (e, t) => {
        if (e.type === 'set' && t) setTime(t.getHours(), t.getMinutes());
      },
    });

  const clearDue = () => {
    tap();
    setDue(null);
    setHasTime(false);
    setRepeat('none');
  };

  const chooseRepeat = (r: Repeat) => {
    setRepeat(r);
    if (r !== 'none' && !due) setDay(new Date());
  };

  const quick = quickDates();
  const quickMatch = due ? quick.find((q) => isSameDay(q.date, due)) : undefined;
  const presetMatch = hasTime && due ? TIME_PRESETS.find(([h, m]) => due.getHours() === h && due.getMinutes() === m) : undefined;

  /* ---------- Etiket & alt görev ---------- */

  const addTag = (name: string) => {
    const n = name.trim().replace(/^#/, '');
    if (n && !tags.some((t) => t.toLocaleLowerCase('tr-TR') === n.toLocaleLowerCase('tr-TR'))) setTags([...tags, n]);
    setTagText('');
    setAddingTag(false);
  };

  const addSub = () => {
    const t = subText.trim();
    if (!t) return;
    setSubs([...subs, { key: nextKey(), title: t, done: false }]);
    setSubText('');
  };

  /* ---------- Kaydet / sil ---------- */

  const save = async () => {
    if (!title.trim()) {
      Alert.alert('Başlık gerekli', 'Kartına kısa bir başlık yaz.');
      return;
    }
    if (!listId) {
      Alert.alert('Liste seç', 'Kartın hangi listeye ekleneceğini seç.');
      return;
    }
    await saveCard({
      id: isNew ? undefined : Number(params.id),
      list_id: listId,
      title: title.trim(),
      description: description.trim(),
      due_at: due ? due.toISOString() : null,
      due_has_time: !!due && hasTime,
      priority,
      done,
      repeat: due ? repeat : 'none',
      tags,
      subtasks: subs.map((s) => ({ title: s.title, done: s.done })),
    });
    syncNotifications();
    router.back();
  };

  const remove = () => {
    Alert.alert('Kartı sil', 'Bu kart kalıcı olarak silinecek.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          await deleteCard(Number(params.id));
          syncNotifications();
          router.back();
        },
      },
    ]);
  };

  const duplicate = async () => {
    await duplicateCard(Number(params.id));
    Alert.alert('Kopyalandı', 'Kartın bir kopyası aynı listeye eklendi.');
  };

  const subDone = subs.filter((s) => s.done).length;
  const suggestions = allTags.filter((t) => !tags.some((x) => x.toLocaleLowerCase('tr-TR') === t.toLocaleLowerCase('tr-TR')));

  if (!ready) return <Screen>{null}</Screen>;

  return (
    <Screen bottomInset>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScreenHeader
          title={isNew ? 'Yeni kart' : 'Kartı düzenle'}
          onBack={() => router.back()}
          right={!isNew ? <IconButton icon="content-copy" onPress={duplicate} /> : undefined}
        />

        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
          {/* Konum */}
          {board ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <BoardIcon icon={board.icon} color={board.color} size={22} />
              <AppText variant="small" color="textSecondary">{`${board.name} / ${currentList?.name ?? ''}`}</AppText>
            </View>
          ) : null}

          {/* Başlık + tamamlandı */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 16 }}>
            <View style={{ paddingTop: 6 }}>
              <Checkbox shape="circle" size={30} checked={done} onPress={toggleDone} />
            </View>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Ne yapılacak?"
              placeholderTextColor={c.textSecondary}
              multiline
              autoFocus={isNew}
              style={{
                flex: 1,
                color: done ? c.textSecondary : c.text,
                fontFamily: fonts.bold,
                fontSize: 22,
                lineHeight: 28,
                paddingVertical: 4,
                textDecorationLine: done ? 'line-through' : 'none',
              }}
            />
          </View>
          {done ? (
            <AppText variant="caption" color="primary" style={{ marginLeft: 42, marginTop: 2 }}>
              Tamamlandı olarak işaretli
            </AppText>
          ) : null}

          {/* Açıklama */}
          <Surface style={{ padding: 12, marginTop: 14 }}>
            <AppText variant="caption" color="textSecondary">
              Açıklama
            </AppText>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="İstersen not ekle"
              placeholderTextColor={c.textSecondary}
              multiline
              style={{ color: c.text, fontFamily: fonts.regular, fontSize: 15, minHeight: 44, paddingTop: 4 }}
            />
          </Surface>

          {/* Öncelik */}
          <FieldLabel>Öncelik</FieldLabel>
          <PrioritySelector value={priority} onChange={setPriority} />

          {/* Tarih */}
          <FieldLabel
            right={
              due ? (
                <Pressable onPress={clearDue} hitSlop={8}>
                  <AppText variant="label" color="danger">
                    Tarihi kaldır
                  </AppText>
                </Pressable>
              ) : undefined
            }
          >
            Bitiş tarihi
          </FieldLabel>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {quick.map((q) => (
              <ChoiceChip key={q.key} label={q.label} selected={quickMatch?.key === q.key} onPress={() => setDay(q.date)} />
            ))}
            <ChoiceChip
              label={due && !quickMatch ? shortDate(due) : 'Tarih seç'}
              icon="calendar-month-outline"
              selected={!!due && !quickMatch}
              onPress={pickCustomDate}
            />
          </ScrollView>

          {due ? (
            <Surface style={{ marginTop: 12, padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: c.primaryContainer, alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialCommunityIcons name="calendar-month-outline" size={24} color={c.onPrimaryContainer} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="body">{longDate(due)}</AppText>
                  <AppText variant="small" color="textSecondary">
                    {relativeDay(due) + (hasTime ? ` · saat ${timeText(due)}` : ' · saat belirtilmedi')}
                  </AppText>
                </View>
              </View>

              <AppText variant="label" color="textSecondary" style={{ marginTop: 14, marginBottom: 8 }}>
                Saat
              </AppText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                <ChoiceChip label="Saat yok" selected={!hasTime} onPress={clearTime} />
                {TIME_PRESETS.map(([h, m]) => (
                  <ChoiceChip key={`${h}:${m}`} label={formatHm(h, m)} selected={presetMatch?.[0] === h && presetMatch?.[1] === m} onPress={() => setTime(h, m)} />
                ))}
                <ChoiceChip
                  label={hasTime && !presetMatch ? timeText(due) : 'Saat seç'}
                  icon="clock-outline"
                  selected={hasTime && !presetMatch}
                  onPress={pickCustomTime}
                />
              </ScrollView>
            </Surface>
          ) : null}

          {/* Tekrar */}
          <FieldLabel>Tekrar</FieldLabel>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {REPEATS.map((r) => (
              <ChoiceChip key={r} label={r === 'none' ? 'Yok' : REPEAT_LABEL[r]} icon={r === 'none' ? undefined : 'repeat'} selected={repeat === r} onPress={() => chooseRepeat(r)} />
            ))}
          </ScrollView>
          {repeat !== 'none' ? (
            <AppText variant="caption" color="textSecondary" style={{ marginTop: 6 }}>
              Tamamladığında bir sonraki tarih için yeni kart otomatik oluşur.
            </AppText>
          ) : null}

          {/* Pano (hızlı ekleme) */}
          {quickMode && boards.length > 1 ? (
            <>
              <FieldLabel>Pano</FieldLabel>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {boards.map((b) => (
                  <ChoiceChip key={b.id} label={b.name} selected={board?.id === b.id} onPress={() => selectBoard(b)} />
                ))}
              </ScrollView>
            </>
          ) : null}

          {/* Liste */}
          <FieldLabel>Liste</FieldLabel>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {lists.map((l) => (
              <ChoiceChip
                key={l.id}
                label={l.name}
                icon={l.is_done ? 'check-circle-outline' : undefined}
                selected={l.id === listId}
                onPress={() => selectList(l)}
              />
            ))}
          </ScrollView>

          {/* Etiketler */}
          <FieldLabel>Etiketler</FieldLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            {tags.map((t) => (
              <TagChip key={t} label={t} onRemove={() => setTags(tags.filter((x) => x !== t))} />
            ))}
            {addingTag ? (
              <TextInput
                autoFocus
                value={tagText}
                onChangeText={setTagText}
                onSubmitEditing={() => addTag(tagText)}
                onBlur={() => (tagText.trim() ? addTag(tagText) : setAddingTag(false))}
                placeholder="etiket adı"
                placeholderTextColor={c.textSecondary}
                style={{
                  minWidth: 110,
                  height: 34,
                  paddingVertical: 0,
                  color: c.text,
                  fontFamily: fonts.regular,
                  fontSize: 14,
                  borderBottomWidth: 1.5,
                  borderBottomColor: c.primary,
                }}
              />
            ) : (
              <Pressable onPress={() => setAddingTag(true)} hitSlop={6} style={{ flexDirection: 'row', alignItems: 'center', gap: 2, height: 30 }}>
                <MaterialCommunityIcons name="plus" size={18} color={c.primary} />
                <AppText variant="label" color="primary">
                  Etiket ekle
                </AppText>
              </Pressable>
            )}
          </View>
          {addingTag && suggestions.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              {suggestions.map((t) => (
                <TagChip key={t} label={t} onPress={() => addTag(t)} />
              ))}
            </View>
          ) : null}

          {/* Alt görevler */}
          <FieldLabel
            right={
              subs.length > 0 ? (
                <AppText variant="label" color="primary">{`${subDone}/${subs.length} tamamlandı`}</AppText>
              ) : undefined
            }
          >
            Alt görevler
          </FieldLabel>
          {subs.length > 0 ? (
            <View style={{ marginBottom: 6 }}>
              <ProgressBar value={subDone / subs.length} />
            </View>
          ) : null}
          {subs.map((s) => (
            <View key={s.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.border }}>
              <Checkbox
                checked={s.done}
                onPress={() => {
                  tap();
                  setSubs(subs.map((x) => (x.key === s.key ? { ...x, done: !x.done } : x)));
                }}
              />
              <TextInput
                value={s.title}
                onChangeText={(v) => setSubs(subs.map((x) => (x.key === s.key ? { ...x, title: v } : x)))}
                style={{
                  flex: 1,
                  color: s.done ? c.textSecondary : c.text,
                  fontFamily: fonts.regular,
                  fontSize: 15,
                  paddingVertical: 4,
                  textDecorationLine: s.done ? 'line-through' : 'none',
                }}
              />
              <Pressable hitSlop={10} onPress={() => setSubs(subs.filter((x) => x.key !== s.key))}>
                <MaterialCommunityIcons name="close" size={20} color={c.textSecondary} />
              </Pressable>
            </View>
          ))}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
            <MaterialCommunityIcons name="plus" size={24} color={c.primary} />
            <TextInput
              value={subText}
              onChangeText={setSubText}
              onSubmitEditing={addSub}
              placeholder="Alt görev ekle"
              placeholderTextColor={c.primary}
              returnKeyType="done"
              blurOnSubmit={false}
              style={{ flex: 1, color: c.text, fontFamily: fonts.semibold, fontSize: 15, paddingVertical: 4 }}
            />
            {subText.trim() ? (
              <Pressable onPress={addSub} hitSlop={8}>
                <AppText variant="label" color="primary">
                  Ekle
                </AppText>
              </Pressable>
            ) : null}
          </View>
        </ScrollView>

        {/* Alt butonlar */}
        <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, borderTopWidth: 1, borderTopColor: c.border }}>
          {!isNew ? <Button label="Sil" icon="trash-can-outline" variant="danger" onPress={remove} style={{ flex: 1 }} /> : null}
          <Button label={isNew ? 'Kartı ekle' : 'Kaydet'} icon={isNew ? 'plus' : 'check'} onPress={save} style={{ flex: 2 }} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
