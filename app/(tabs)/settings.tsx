import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Screen } from '../../src/components/Screen';
import { AppText } from '../../src/components/AppText';
import { Button } from '../../src/components/Button';
import { ThemeMode, useTheme } from '../../src/ThemeContext';
import { getCounts, getSettings, setSetting, Settings, wipeAll } from '../../src/db/repo';
import { exportAll, importAll, parseBackup } from '../../src/db/backup';
import { syncNotifications } from '../../src/notifications';
import { formatHm, parseHm } from '../../src/dates';

const MODES: { key: ThemeMode; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { key: 'light', label: 'Açık', icon: 'white-balance-sunny' },
  { key: 'dark', label: 'Koyu', icon: 'weather-night' },
  { key: 'system', label: 'Sistem', icon: 'cellphone' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { theme, mode, setMode } = useTheme();
  const c = theme.colors;
  const [settings, setSettings] = useState<Settings | null>(null);
  const [counts, setCounts] = useState({ boards: 0, cards: 0, done: 0 });

  const load = useCallback(async () => {
    setSettings(await getSettings());
    setCounts(await getCounts());
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const toggle = async (key: 'remindersOn' | 'overdueOn', value: boolean) => {
    await setSetting(key, value);
    setSettings((s) => (s ? { ...s, [key]: value } : s));
    syncNotifications(value);
  };

  const pickTime = () => {
    if (!settings) return;
    const { h, m } = parseHm(settings.checkTime);
    const base = new Date();
    base.setHours(h, m, 0, 0);
    DateTimePickerAndroid.open({
      value: base,
      mode: 'time',
      is24Hour: true,
      onChange: async (event, date) => {
        if (event.type !== 'set' || !date) return;
        const v = formatHm(date.getHours(), date.getMinutes());
        await setSetting('checkTime', v);
        setSettings((s) => (s ? { ...s, checkTime: v } : s));
        syncNotifications();
      },
    });
  };

  const backup = async () => {
    try {
      const json = await exportAll();
      const stamp = new Date().toISOString().slice(0, 10);
      const uri = `${FileSystem.cacheDirectory}duzen-yedek-${stamp}.json`;
      await FileSystem.writeAsStringAsync(uri, json);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'Düzen yedeğini kaydet' });
      } else {
        Alert.alert('Paylaşım kullanılamıyor', 'Bu cihazda dosya paylaşımı desteklenmiyor.');
      }
    } catch (e: any) {
      Alert.alert('Yedekleme başarısız', String(e?.message ?? e));
    }
  };

  const restore = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.[0]) return;
      const text = await FileSystem.readAsStringAsync(res.assets[0].uri);
      const data = parseBackup(text);
      Alert.alert(
        'Yedekten geri yükle',
        `Yedekte ${data.boards.length} pano ve ${data.cards.length} görev var. Şu anki tüm verilerin silinip bunlarla değiştirilecek. Devam edilsin mi?`,
        [
          { text: 'Vazgeç', style: 'cancel' },
          {
            text: 'Geri yükle',
            style: 'destructive',
            onPress: async () => {
              try {
                await importAll(data);
                await load();
                syncNotifications();
                Alert.alert('Tamam', 'Yedek geri yüklendi.');
              } catch (e: any) {
                Alert.alert('Geri yükleme başarısız', String(e?.message ?? e));
              }
            },
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('Geri yükleme başarısız', String(e?.message ?? e));
    }
  };

  const wipe = () =>
    Alert.alert('Tüm verileri sil', 'Bütün panoların ve görevlerin silinecek. Şablonların ve ayarların kalır. Bu işlem geri alınamaz.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Hepsini sil',
        style: 'destructive',
        onPress: async () => {
          await wipeAll();
          await load();
          syncNotifications();
        },
      },
    ]);

  const Section = ({ children }: { children: string }) => (
    <AppText variant="overline" color="textSecondary" style={{ letterSpacing: 0.8, marginTop: 22, marginBottom: 8 }}>
      {children}
    </AppText>
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <AppText variant="display">Ayarlar</AppText>
          <Pressable
            hitSlop={10}
            onPress={() => Alert.alert('Düzen', 'Çevrimdışı çalışan kişisel planlayıcı.\nTüm verilerin yalnızca bu telefonda saklanır.')}
          >
            <MaterialCommunityIcons name="information-outline" size={24} color={c.text} />
          </Pressable>
        </View>

        <Section>GÖRÜNÜM</Section>
        <View style={{ flexDirection: 'row', backgroundColor: c.surfaceVariant, borderRadius: 16, padding: 4 }}>
          {MODES.map((m) => {
            const active = mode === m.key;
            return (
              <Pressable
                key={m.key}
                onPress={() => setMode(m.key)}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  backgroundColor: active ? c.surface : 'transparent',
                }}
              >
                <MaterialCommunityIcons name={m.icon} size={18} color={active ? c.primary : c.textSecondary} />
                <AppText variant="caption" color={active ? 'text' : 'textSecondary'}>
                  {m.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        <AppText variant="small" color="textSecondary" style={{ marginTop: 8 }}>
          Uygulamanın görünümünü kendine göre ayarla.
        </AppText>

        <Section>BİLDİRİMLER</Section>
        {settings && (
          <View style={{ backgroundColor: c.surface, borderRadius: 18, borderWidth: 1, borderColor: c.border }}>
            <ToggleRow
              title="Görev hatırlatıcıları"
              sub="Bitiş saatinde haber ver"
              value={settings.remindersOn}
              onChange={(v) => toggle('remindersOn', v)}
            />
            <Divider />
            <ToggleRow
              title="Gecikmiş görevler"
              sub="Tamamlanmayanları hatırlat"
              value={settings.overdueOn}
              onChange={(v) => toggle('overdueOn', v)}
            />
            <Divider />
            <Pressable onPress={pickTime} style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
              <AppText variant="body" style={{ flex: 1 }}>
                Günlük kontrol saati
              </AppText>
              <AppText variant="body" color="primary">
                {settings.checkTime}
              </AppText>
              <MaterialCommunityIcons name="chevron-right" size={22} color={c.textSecondary} />
            </Pressable>
          </View>
        )}

        <Section>DÜZEN</Section>
        <Pressable
          onPress={() => router.push('/templates')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.surface, borderRadius: 18, borderWidth: 1, borderColor: c.border, padding: 16 }}
        >
          <MaterialCommunityIcons name="view-grid-plus-outline" size={22} color={c.primary} />
          <View style={{ flex: 1 }}>
            <AppText variant="body">Pano şablonları</AppText>
            <AppText variant="caption" color="textSecondary">
              Hazır listeleri kendine göre düzenle, yenilerini ekle
            </AppText>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={c.textSecondary} />
        </Pressable>

        <Section>VERİLERİN SENDE</Section>
        <AppText variant="small" color="textSecondary" style={{ marginBottom: 12 }}>
          {`${counts.boards} panonu ve ${counts.cards} görevini dosya olarak sakla ya da daha önce aldığın yedeği geri yükle.`}
        </AppText>
        <Button label="Yedekle (dosyaya aktar)" icon="download-outline" variant="tonal" onPress={backup} />
        <Button label="Yedekten geri yükle" icon="upload-outline" variant="outline" onPress={restore} style={{ marginTop: 12 }} />
        <Pressable onPress={wipe} hitSlop={8} style={{ alignSelf: 'center', marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <MaterialCommunityIcons name="trash-can-outline" size={18} color={c.danger} />
          <AppText variant="label" color="danger">
            Tüm verileri sil
          </AppText>
        </Pressable>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 36 }}>
          <MaterialCommunityIcons name="layers-outline" size={16} color={c.primary} />
          <AppText variant="small" color="textSecondary">
            Düzen · v1.0
          </AppText>
        </View>
      </ScrollView>
    </Screen>
  );
}

function Divider() {
  const { theme } = useTheme();
  return <View style={{ height: 1, backgroundColor: theme.colors.border, marginHorizontal: 16 }} />;
}

function ToggleRow({ title, sub, value, onChange }: { title: string; sub: string; value: boolean; onChange: (v: boolean) => void }) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
      <View style={{ flex: 1 }}>
        <AppText variant="body">{title}</AppText>
        <AppText variant="caption" color="textSecondary">
          {sub}
        </AppText>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: theme.colors.primary, false: theme.colors.surfaceVariant }}
        thumbColor={theme.dark ? theme.colors.onPrimary : '#FFFFFF'}
      />
    </View>
  );
}
