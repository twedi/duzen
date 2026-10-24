import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { AppText } from '../../src/components/AppText';
import { Button } from '../../src/components/Button';
import { FieldLabel, Input, ScreenHeader, Surface } from '../../src/components/Form';
import { ColorPicker, IconPicker } from '../../src/components/Pickers';
import { useTheme } from '../../src/ThemeContext';
import { BOARD_COLORS, fonts } from '../../src/theme';
import { DEFAULT_LISTS } from '../../src/db/templates';
import { deleteTemplate, getTemplateById, saveTemplate } from '../../src/db/repo';
import { tap } from '../../src/haptics';

type Row = { key: string; name: string; done: boolean };
let k = 0;
const nk = () => `r${++k}`;

export default function TemplateEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const router = useRouter();
  const { theme } = useTheme();
  const c = theme.colors;

  const [name, setName] = useState('');
  const [hint, setHint] = useState('');
  const [color, setColor] = useState(BOARD_COLORS[0]);
  const [icon, setIcon] = useState('view-dashboard-outline');
  const [rows, setRows] = useState<Row[]>(DEFAULT_LISTS.map((l) => ({ key: nk(), ...l })));
  const [newRow, setNewRow] = useState('');

  useEffect(() => {
    if (isNew) return;
    getTemplateById(Number(id)).then((t) => {
      if (!t) {
        router.back();
        return;
      }
      setName(t.name);
      setHint(t.hint);
      setColor(t.color);
      setIcon(t.icon);
      setRows(t.lists.map((l) => ({ key: nk(), ...l })));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (key: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const toggleDone = (key: string) => {
    tap();
    setRows((rs) => rs.map((r) => ({ ...r, done: r.key === key ? !r.done : false })));
  };

  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= rows.length) return;
    tap();
    const next = [...rows];
    [next[idx], next[j]] = [next[j], next[idx]];
    setRows(next);
  };

  const addRow = () => {
    const n = newRow.trim();
    if (!n) return;
    // Yeni liste tamamlanma listesinin önüne gelsin
    const doneIdx = rows.findIndex((r) => r.done);
    const next = [...rows];
    next.splice(doneIdx >= 0 ? doneIdx : next.length, 0, { key: nk(), name: n, done: false });
    setRows(next);
    setNewRow('');
  };

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Şablon adı gerekli', 'Şablona bir ad ver.');
      return;
    }
    const lists = rows.filter((r) => r.name.trim()).map((r) => ({ name: r.name.trim(), done: r.done }));
    if (!lists.length) {
      Alert.alert('Liste gerekli', 'Şablonda en az bir liste olmalı.');
      return;
    }
    await saveTemplate({ id: isNew ? undefined : Number(id), name: name.trim(), hint: hint.trim(), icon, color, lists });
    router.back();
  };

  const remove = () =>
    Alert.alert('Şablonu sil', 'Bu şablondan oluşturulmuş panolar etkilenmez.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          await deleteTemplate(Number(id));
          router.back();
        },
      },
    ]);

  return (
    <Screen bottomInset>
      <ScreenHeader title={isNew ? 'Yeni şablon' : 'Şablonu düzenle'} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <FieldLabel>Şablon adı</FieldLabel>
        <Input value={name} onChangeText={setName} placeholder="ör. Haftalık plan" />

        <FieldLabel>Kısa açıklama</FieldLabel>
        <Input value={hint} onChangeText={setHint} placeholder="ör. Haftanı günlere böl" />

        <FieldLabel>Renk</FieldLabel>
        <ColorPicker value={color} onChange={setColor} />

        <FieldLabel>Simge</FieldLabel>
        <IconPicker value={icon} onChange={setIcon} color={color} />

        <FieldLabel>Listeler</FieldLabel>
        <Surface>
          {rows.map((r, idx) => (
            <View
              key={r.key}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingLeft: 12,
                paddingRight: 6,
                paddingVertical: 6,
                borderBottomWidth: idx < rows.length - 1 ? 1 : 0,
                borderBottomColor: c.border,
              }}
            >
              <Pressable onPress={() => toggleDone(r.key)} hitSlop={8}>
                <MaterialCommunityIcons
                  name={r.done ? 'check-circle' : 'checkbox-blank-circle-outline'}
                  size={22}
                  color={r.done ? c.primary : c.textSecondary}
                />
              </Pressable>
              <TextInput
                value={r.name}
                onChangeText={(v) => update(r.key, { name: v })}
                placeholder="Liste adı"
                placeholderTextColor={c.textSecondary}
                style={{ flex: 1, color: c.text, fontFamily: fonts.medium, fontSize: 15, paddingVertical: 8 }}
              />
              <Pressable onPress={() => move(idx, -1)} disabled={idx === 0} hitSlop={6} style={{ padding: 4, opacity: idx === 0 ? 0.3 : 1 }}>
                <MaterialCommunityIcons name="chevron-up" size={22} color={c.textSecondary} />
              </Pressable>
              <Pressable
                onPress={() => move(idx, 1)}
                disabled={idx === rows.length - 1}
                hitSlop={6}
                style={{ padding: 4, opacity: idx === rows.length - 1 ? 0.3 : 1 }}
              >
                <MaterialCommunityIcons name="chevron-down" size={22} color={c.textSecondary} />
              </Pressable>
              <Pressable onPress={() => setRows(rows.filter((x) => x.key !== r.key))} hitSlop={6} style={{ padding: 4 }}>
                <MaterialCommunityIcons name="close" size={20} color={c.textSecondary} />
              </Pressable>
            </View>
          ))}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 6, borderTopWidth: rows.length ? 1 : 0, borderTopColor: c.border }}>
            <MaterialCommunityIcons name="plus" size={22} color={c.primary} />
            <TextInput
              value={newRow}
              onChangeText={setNewRow}
              onSubmitEditing={addRow}
              blurOnSubmit={false}
              returnKeyType="done"
              placeholder="Liste ekle"
              placeholderTextColor={c.primary}
              style={{ flex: 1, color: c.text, fontFamily: fonts.semibold, fontSize: 15, paddingVertical: 8 }}
            />
            {newRow.trim() ? (
              <Pressable onPress={addRow} hitSlop={8}>
                <AppText variant="label" color="primary">
                  Ekle
                </AppText>
              </Pressable>
            ) : null}
          </View>
        </Surface>
        <AppText variant="caption" color="textSecondary" style={{ marginTop: 8 }}>
          Yuvarlağı işaretlediğin liste tamamlanma listesi olur; görevleri tamamladığında oraya taşınır. Hiçbirini seçmezsen
          görevler kendi listesinde üstü çizili kalır.
        </AppText>
      </ScrollView>

      <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
        {!isNew ? <Button label="Sil" icon="trash-can-outline" variant="danger" onPress={remove} style={{ flex: 1 }} /> : null}
        <Button label="Kaydet" icon="check" onPress={save} style={{ flex: 2 }} />
      </View>
    </Screen>
  );
}
