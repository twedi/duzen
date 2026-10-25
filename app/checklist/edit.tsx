import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { KeyboardSafeView } from '../../src/components/KeyboardSafeView';
import { Screen } from '../../src/components/Screen';
import { AppText } from '../../src/components/AppText';
import { Button } from '../../src/components/Button';
import { ChoiceChip } from '../../src/components/Chips';
import { FieldLabel, IconButton, Input, ScreenHeader, Surface } from '../../src/components/Form';
import { BoardIcon, ColorPicker, IconPicker } from '../../src/components/Pickers';
import { createChecklist, getChecklist, LIST_ICONS, LIST_PRESETS, updateChecklist } from '../../src/db/checklists';
import { useKeyboardHeight } from '../../src/useKeyboard';

/** Yeni basit liste oluşturur; `id` gelirse mevcut listeyi düzenler */
export default function ChecklistEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editId = id ? Number(id) : null;
  const router = useRouter();
  const kb = useKeyboardHeight();

  const [name, setName] = useState('');
  const [color, setColor] = useState('#8579E8');
  const [icon, setIcon] = useState('format-list-checks');

  useEffect(() => {
    if (!editId) return;
    getChecklist(editId).then((l) => {
      if (!l) return;
      setName(l.name);
      setColor(l.color);
      setIcon(l.icon);
    });
  }, [editId]);

  const submit = async () => {
    const n = name.trim();
    if (!n) return;
    if (editId) {
      await updateChecklist(editId, { name: n, color, icon });
      router.back();
    } else {
      const newId = await createChecklist({ name: n, color, icon });
      router.replace({ pathname: '/checklist/[id]', params: { id: String(newId) } });
    }
  };

  return (
    <Screen bottomInset>
      <ScreenHeader
        title={editId ? 'Listeyi düzenle' : 'Yeni liste'}
        onBack={() => router.back()}
        closeIcon
        right={kb > 0 && name.trim() ? <IconButton icon="check" tone="tonal" onPress={submit} /> : undefined}
      />
      <KeyboardSafeView>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        {/* Önizleme */}
        <Surface style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginTop: 8 }}>
          <BoardIcon icon={icon} color={color} size={44} />
          <AppText variant="subtitle" numberOfLines={1} style={{ flex: 1 }}>
            {name.trim() || 'Liste adı'}
          </AppText>
        </Surface>

        {!editId ? (
          <>
            <FieldLabel>Hızlı başla</FieldLabel>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} keyboardShouldPersistTaps="handled">
              {LIST_PRESETS.map((p) => (
                <ChoiceChip
                  key={p.name}
                  label={p.name}
                  icon={p.icon as any}
                  selected={name === p.name}
                  onPress={() => {
                    setName(p.name);
                    setColor(p.color);
                    setIcon(p.icon);
                  }}
                />
              ))}
            </ScrollView>
          </>
        ) : null}

        <FieldLabel>Liste adı</FieldLabel>
        <Input value={name} onChangeText={setName} placeholder="ör. Haftalık market" autoFocus={!editId} returnKeyType="done" onSubmitEditing={submit} />

        <FieldLabel>Renk</FieldLabel>
        <ColorPicker value={color} onChange={setColor} />

        <FieldLabel>Simge</FieldLabel>
        <IconPicker value={icon} onChange={setIcon} color={color} icons={LIST_ICONS} />
      </ScrollView>

      {kb === 0 ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
          <Button label={editId ? 'Kaydet' : 'Listeyi oluştur'} icon={editId ? 'check' : 'plus'} onPress={submit} disabled={!name.trim()} />
        </View>
      ) : null}
      </KeyboardSafeView>
    </Screen>
  );
}
