import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
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
import { ListItem, PressableScale } from '../../src/components/Motion';
import { MetaChip } from '../../src/components/Chips';
import { withAlpha } from '../../src/colors';
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
        {boards.map((b, i) => {
          const pct = b.total ? b.done / b.total : 0;
          const open = b.total - b.done;
          return (
            <ListItem key={b.id} index={i}>
              <PressableScale
                onPress={() => router.push({ pathname: '/board/[id]', params: { id: String(b.id) } })}
                onLongPress={() => boardMenu(b)}
                delayLongPress={350}
                scaleTo={0.98}
                style={{
                  backgroundColor: c.surface,
                  borderRadius: 22,
                  borderWidth: 1,
                  borderColor: c.border,
                  overflow: 'hidden',
                  elevation: theme.dark ? 0 : 1,
                  shadowColor: '#1C1B2E',
                  shadowOpacity: theme.dark ? 0 : 0.05,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 2 },
                }}
              >
                {/* Pano renginde hafif zemin */}
                <View style={{ backgroundColor: withAlpha(b.color, theme.dark ? 0.16 : 0.12), padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
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
                  <MaterialCommunityIcons name="chevron-right" size={24} color={c.textSecondary} />
                </View>
                <View style={{ padding: 16, paddingTop: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <MetaChip icon="checkbox-blank-circle-outline" label={`${open} açık`} />
                    <MetaChip icon="check-circle-outline" label={`${b.done} bitti`} />
                    {b.overdue > 0 ? (
                      <View style={{ backgroundColor: c.priority.high.bg, borderRadius: 8, paddingHorizontal: 8, height: 24, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={14} color={c.priority.high.fg} />
                        <AppText variant="caption" color={c.priority.high.fg}>{`${b.overdue} gecikmiş`}</AppText>
                      </View>
                    ) : null}
                    <View style={{ flex: 1 }} />
                    <AppText variant="label" style={{ color: b.color }}>{`%${Math.round(pct * 100)}`}</AppText>
                  </View>
                  <ProgressBar value={pct} color={b.color} height={8} />
                </View>
              </PressableScale>
            </ListItem>
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
