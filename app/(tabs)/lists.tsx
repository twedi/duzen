import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { AppText } from '../../src/components/AppText';
import { EmptyState, InfoBox } from '../../src/components/EmptyState';
import { Fab } from '../../src/components/Form';
import { ListItem, PressableScale } from '../../src/components/Motion';
import { BoardIcon } from '../../src/components/Pickers';
import { ProgressBar } from '../../src/components/ProgressBar';
import { ActionSheet, SheetOption } from '../../src/components/Overlays';
import { useTheme } from '../../src/ThemeContext';
import { Checklist, deleteChecklist, listChecklists } from '../../src/db/checklists';
import { withAlpha } from '../../src/colors';
import { impact } from '../../src/haptics';

/** Basit listeler: alışveriş listesi gibi tarih ve pano gerektirmeyen işler */
export default function ListsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const c = theme.colors;
  const [lists, setLists] = useState<Checklist[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [sheet, setSheet] = useState<{ title: string; options: SheetOption[] } | null>(null);

  const load = useCallback(async () => {
    setLists(await listChecklists());
    setLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const open = (id: number) => router.push({ pathname: '/checklist/[id]', params: { id: String(id) } });
  const create = () => router.push('/checklist/edit');

  const menu = (l: Checklist) => {
    impact();
    setSheet({
      title: l.name,
      options: [
        { label: 'Düzenle', icon: 'pencil-outline', onPress: () => router.push({ pathname: '/checklist/edit', params: { id: String(l.id) } }) },
        {
          label: 'Listeyi sil',
          icon: 'trash-can-outline',
          danger: true,
          onPress: () =>
            Alert.alert('Listeyi sil', `"${l.name}" ve içindeki ${l.total} öğe silinecek.`, [
              { text: 'Vazgeç', style: 'cancel' },
              {
                text: 'Sil',
                style: 'destructive',
                onPress: async () => {
                  await deleteChecklist(l.id);
                  load();
                },
              },
            ]),
        },
      ],
    });
  };

  const header = (
    <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
      <AppText variant="display">Listeler</AppText>
      <AppText variant="small" color="textSecondary">
        Tarih yok, pano yok. Yaz ve işaretle.
      </AppText>
    </View>
  );

  if (loaded && lists.length === 0) {
    return (
      <Screen>
        {header}
        <EmptyState
          icon="format-list-checks"
          title="Basit bir liste aç"
          text="Alışveriş, bavul, okuma listesi… Hızlıca yaz, aldıkça işaretle."
          buttonLabel="İlk listeni oluştur"
          onPress={create}
        />
        <InfoBox icon="lightbulb-on-outline" text="Birden çok satır yapıştırırsan her satır ayrı öğe olur." />
      </Screen>
    );
  }

  return (
    <Screen>
      {header}
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }}>
          {lists.map((l, i) => {
            const pct = l.total ? l.done / l.total : 0;
            const left = l.total - l.done;
            return (
              <ListItem key={l.id} index={i} style={{ width: '48.3%' }}>
                <PressableScale
                  onPress={() => open(l.id)}
                  onLongPress={() => menu(l)}
                  delayLongPress={350}
                  style={{
                    borderRadius: 22,
                    padding: 16,
                    minHeight: 150,
                    backgroundColor: withAlpha(l.color, theme.dark ? 0.18 : 0.14),
                    borderWidth: 1,
                    borderColor: withAlpha(l.color, 0.3),
                  }}
                >
                  <BoardIcon icon={l.icon} color={l.color} size={42} />
                  <AppText variant="subtitle" numberOfLines={2} style={{ marginTop: 12 }}>
                    {l.name}
                  </AppText>
                  <AppText variant="caption" color="textSecondary" style={{ marginTop: 2, marginBottom: 10 }}>
                    {l.total === 0 ? 'Boş liste' : left === 0 ? 'Hepsi tamam ✓' : `${left} öğe kaldı`}
                  </AppText>
                  <View style={{ marginTop: 'auto' }}>
                    <ProgressBar value={pct} color={l.color} />
                  </View>
                </PressableScale>
              </ListItem>
            );
          })}
        </View>
        <AppText variant="caption" color="textSecondary" style={{ textAlign: 'center', marginTop: 16 }}>
          Düzenlemek ya da silmek için listeye basılı tut
        </AppText>
      </ScrollView>
      <Fab label="Yeni liste" onPress={create} />
      <ActionSheet visible={!!sheet} title={sheet?.title} options={sheet?.options ?? []} onClose={() => setSheet(null)} />
    </Screen>
  );
}
