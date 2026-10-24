import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { AppText } from '../../src/components/AppText';
import { ProgressBar } from '../../src/components/ProgressBar';
import { EmptyState, InfoBox } from '../../src/components/EmptyState';
import { Fab, IconButton } from '../../src/components/Form';
import { BoardIcon } from '../../src/components/Pickers';
import { ActionSheet, SheetOption } from '../../src/components/Overlays';
import { useTheme } from '../../src/ThemeContext';
import { BoardSummary, deleteBoard, listBoards } from '../../src/db/repo';
import { syncNotifications } from '../../src/notifications';
import { impact } from '../../src/haptics';

export default function BoardsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const c = theme.colors;
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [sheet, setSheet] = useState<{ title: string; options: SheetOption[] } | null>(null);

  const load = useCallback(async () => {
    setBoards(await listBoards());
    setLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const totalCards = boards.reduce((s, b) => s + b.total, 0);
  const totalDone = boards.reduce((s, b) => s + b.done, 0);

  const boardMenu = (b: BoardSummary) => {
    impact();
    setSheet({
      title: b.name,
      options: [
        { label: 'Panoyu düzenle', icon: 'pencil-outline', onPress: () => router.push({ pathname: '/board/new', params: { id: String(b.id) } }) },
        {
          label: 'Panoyu sil',
          icon: 'trash-can-outline',
          danger: true,
          onPress: () =>
            Alert.alert('Panoyu sil', `"${b.name}" ve içindeki tüm kartlar silinecek.`, [
              { text: 'Vazgeç', style: 'cancel' },
              {
                text: 'Sil',
                style: 'destructive',
                onPress: async () => {
                  await deleteBoard(b.id);
                  await load();
                  syncNotifications();
                },
              },
            ]),
        },
      ],
    });
  };

  const header = (
    <View style={{ paddingHorizontal: 20, paddingTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <AppText variant="display">Panolar</AppText>
      <IconButton icon="magnify" onPress={() => router.push('/search')} />
    </View>
  );

  if (loaded && boards.length === 0) {
    return (
      <Screen>
        {header}
        <EmptyState
          icon="view-dashboard-outline"
          title="Her şey bir panoyla başlar"
          text="Aklındakilere bir yer aç. İlk panonu oluştur, görevlerini birlikte toparlayalım."
          buttonLabel="İlk panonu oluştur"
          onPress={() => router.push('/board/new')}
        />
        <InfoBox icon="lightbulb-on-outline" text="Hazır şablonlarla başlayabilir, şablonları Ayarlar'dan kendine göre düzenleyebilirsin." />
      </Screen>
    );
  }

  return (
    <Screen>
      {header}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 8, marginBottom: 12 }}>
        <AppText variant="small" color="textSecondary">{`${boards.length} pano · ${totalCards} görev`}</AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <MaterialCommunityIcons name="check-circle-outline" size={16} color={c.primary} />
          <AppText variant="label" color="primary">{`${totalDone} tamamlandı`}</AppText>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 110, gap: 12 }}>
        {boards.map((b) => {
          const pct = b.total ? b.done / b.total : 0;
          return (
            <Pressable
              key={b.id}
              onPress={() => router.push({ pathname: '/board/[id]', params: { id: String(b.id) } })}
              onLongPress={() => boardMenu(b)}
              style={({ pressed }) => ({
                backgroundColor: c.surface,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: c.border,
                padding: 16,
                opacity: pressed ? 0.92 : 1,
              })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <BoardIcon icon={b.icon} color={b.color} size={48} />
                <View style={{ flex: 1 }}>
                  <AppText variant="subtitle" numberOfLines={1}>
                    {b.name}
                  </AppText>
                  {b.description ? (
                    <AppText variant="caption" color="textSecondary" numberOfLines={1}>
                      {b.description}
                    </AppText>
                  ) : null}
                </View>
                {b.overdue > 0 ? (
                  <View style={{ backgroundColor: c.priority.high.bg, borderRadius: 8, paddingHorizontal: 8, height: 24, justifyContent: 'center' }}>
                    <AppText variant="caption" color={c.priority.high.fg}>{`${b.overdue} gecikmiş`}</AppText>
                  </View>
                ) : null}
                <MaterialCommunityIcons name="chevron-right" size={24} color={c.textSecondary} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, marginBottom: 8 }}>
                <AppText variant="caption" color="textSecondary">{`${b.done}/${b.total} görev tamamlandı`}</AppText>
                <AppText variant="label" color="primary">{`%${Math.round(pct * 100)}`}</AppText>
              </View>
              <ProgressBar value={pct} />
            </Pressable>
          );
        })}
        <AppText variant="caption" color="textSecondary" style={{ textAlign: 'center', marginTop: 4 }}>
          Düzenlemek ya da silmek için panoya basılı tut
        </AppText>
      </ScrollView>

      <Fab label="Yeni pano" onPress={() => router.push('/board/new')} />
      <ActionSheet visible={!!sheet} title={sheet?.title} options={sheet?.options ?? []} onClose={() => setSheet(null)} />
    </Screen>
  );
}
