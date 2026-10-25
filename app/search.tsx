import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { KeyboardSafeView } from '../src/components/KeyboardSafeView';
import { Screen } from '../src/components/Screen';
import { AppText } from '../src/components/AppText';
import { TaskCard } from '../src/components/TaskCard';
import { ChoiceChip } from '../src/components/Chips';
import { BoardIcon } from '../src/components/Pickers';
import { useTheme } from '../src/ThemeContext';
import { BoardSummary, CardView, getAllCards, listBoards } from '../src/db/repo';
import { fonts } from '../src/theme';
import { useTaskActions } from '../src/useTaskActions';

type Filter = 'all' | 'open' | 'done';
const norm = (s: string) => s.toLocaleLowerCase('tr-TR');

export default function SearchScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const c = theme.colors;
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [cards, setCards] = useState<CardView[]>([]);
  const [boards, setBoards] = useState<BoardSummary[]>([]);

  const load = useCallback(async () => {
    setCards(await getAllCards());
    setBoards(await listBoards());
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const query = norm(q.trim());

  const boardHits = useMemo(
    () => (query ? boards.filter((b) => norm(b.name).includes(query) || norm(b.description).includes(query)) : []),
    [boards, query]
  );

  const cardHits = useMemo(() => {
    if (!query) return [];
    return cards.filter((card) => {
      if (filter === 'open' && card.done) return false;
      if (filter === 'done' && !card.done) return false;
      return (
        norm(card.title).includes(query) ||
        norm(card.description).includes(query) ||
        norm(card.board_name).includes(query) ||
        card.tags.some((t) => norm(t).includes(query.replace(/^#/, '')))
      );
    });
  }, [cards, query, filter]);

  const { toggle } = useTaskActions(load);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingTop: 10 }}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ padding: 6 }}>
          <MaterialCommunityIcons name="arrow-left" size={26} color={c.text} />
        </Pressable>
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: c.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: c.border,
            paddingHorizontal: 12,
            height: 48,
          }}
        >
          <MaterialCommunityIcons name="magnify" size={22} color={c.textSecondary} />
          <TextInput
            autoFocus
            value={q}
            onChangeText={setQ}
            placeholder="Görev, pano ya da #etiket ara"
            placeholderTextColor={c.textSecondary}
            style={{ flex: 1, color: c.text, fontFamily: fonts.regular, fontSize: 15 }}
          />
          {q ? (
            <Pressable onPress={() => setQ('')} hitSlop={8}>
              <MaterialCommunityIcons name="close-circle" size={20} color={c.textSecondary} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 }}>
        <ChoiceChip label="Tümü" selected={filter === 'all'} onPress={() => setFilter('all')} />
        <ChoiceChip label="Açık" selected={filter === 'open'} onPress={() => setFilter('open')} />
        <ChoiceChip label="Tamamlanan" selected={filter === 'done'} onPress={() => setFilter('done')} />
      </View>

      <KeyboardSafeView screenHasBottomInset={false}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 10 }} keyboardShouldPersistTaps="handled">
        {!query ? (
          <AppText variant="small" color="textSecondary" style={{ textAlign: 'center', marginTop: 32 }}>
            {`${cards.length} görev ve ${boards.length} pano içinde ara`}
          </AppText>
        ) : null}

        {boardHits.map((b) => (
          <Pressable
            key={`b${b.id}`}
            onPress={() => router.push({ pathname: '/board/[id]', params: { id: String(b.id) } })}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 12 }}
          >
            <BoardIcon icon={b.icon} color={b.color} size={36} />
            <View style={{ flex: 1 }}>
              <AppText variant="body">{b.name}</AppText>
              <AppText variant="caption" color="textSecondary">{`Pano · ${b.total} görev`}</AppText>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={c.textSecondary} />
          </Pressable>
        ))}

        {cardHits.map((card) => (
          <TaskCard
            key={card.id}
            card={card}
            showBoard
            onPress={() => router.push({ pathname: '/task/[id]', params: { id: String(card.id) } })}
            onToggle={() => toggle(card)}
          />
        ))}

        {query && boardHits.length === 0 && cardHits.length === 0 ? (
          <AppText variant="small" color="textSecondary" style={{ textAlign: 'center', marginTop: 32 }}>
            {`"${q.trim()}" için sonuç bulunamadı.`}
          </AppText>
        ) : null}
      </ScrollView>
      </KeyboardSafeView>
    </Screen>
  );
}
