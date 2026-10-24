import React, { useCallback, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { AppText } from '../../src/components/AppText';
import { Button } from '../../src/components/Button';
import { FieldLabel, Input, ScreenHeader, Surface } from '../../src/components/Form';
import { BoardIcon, ColorPicker, IconPicker } from '../../src/components/Pickers';
import { useTheme } from '../../src/ThemeContext';
import { BOARD_COLORS } from '../../src/theme';
import { DEFAULT_LISTS } from '../../src/db/templates';
import { createBoard, getBoard, listTemplates, TemplateRow, updateBoard } from '../../src/db/repo';
import { tap } from '../../src/haptics';

/** Yeni pano oluşturma; `id` parametresi gelirse mevcut panoyu düzenler. */
export default function BoardFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editId = id ? Number(id) : null;
  const router = useRouter();
  const { theme } = useTheme();
  const c = theme.colors;

  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [tplId, setTplId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(BOARD_COLORS[0]);
  const [icon, setIcon] = useState('view-dashboard-outline');
  const loadedBoard = useRef(false);
  const pickedTemplate = useRef(false);

  const chooseTemplate = (t: TemplateRow) => {
    tap();
    setTplId(t.id);
    setColor(t.color);
    setIcon(t.icon);
    pickedTemplate.current = true;
  };

  useFocusEffect(
    useCallback(() => {
      (async () => {
        if (editId && !loadedBoard.current) {
          const b = await getBoard(editId);
          if (b) {
            setName(b.name);
            setDescription(b.description);
            setColor(b.color);
            setIcon(b.icon);
          }
          loadedBoard.current = true;
        }
        if (!editId) {
          // Şablonlar düzenlenip geri gelindiğinde liste tazelensin
          const ts = await listTemplates();
          setTemplates(ts);
          setTplId((prev) => {
            if (prev && ts.some((t) => t.id === prev)) return prev;
            const first = ts[0];
            if (first && !pickedTemplate.current) {
              setColor(first.color);
              setIcon(first.icon);
            }
            return first ? first.id : null;
          });
        }
      })();
    }, [editId])
  );

  const selected = templates.find((t) => t.id === tplId) ?? null;
  const previewLists = selected?.lists.length ? selected.lists : DEFAULT_LISTS;

  const submit = async () => {
    const n = name.trim();
    if (!n) {
      Alert.alert('Pano adı gerekli', 'Panona kısa bir ad ver.');
      return;
    }
    if (editId) {
      await updateBoard(editId, { name: n, description: description.trim(), color, icon });
      router.back();
      return;
    }
    const newId = await createBoard({
      name: n,
      description: description.trim() || selected?.hint || '',
      color,
      icon,
      lists: previewLists,
    });
    router.replace({ pathname: '/board/[id]', params: { id: String(newId) } });
  };

  return (
    <Screen bottomInset>
      <ScreenHeader title={editId ? 'Panoyu düzenle' : 'Yeni pano'} onBack={() => router.back()} closeIcon />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        {/* Önizleme */}
        <Surface style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginTop: 8 }}>
          <BoardIcon icon={icon} color={color} size={48} />
          <View style={{ flex: 1 }}>
            <AppText variant="subtitle" numberOfLines={1}>
              {name.trim() || 'Pano adı'}
            </AppText>
            <AppText variant="caption" color="textSecondary" numberOfLines={1}>
              {description.trim() || selected?.hint || 'Kısa açıklama'}
            </AppText>
          </View>
        </Surface>

        <FieldLabel>Pano adı</FieldLabel>
        <Input value={name} onChangeText={setName} placeholder="ör. Güz dönemi" autoFocus={!editId} />

        <FieldLabel>Açıklama (isteğe bağlı)</FieldLabel>
        <Input value={description} onChangeText={setDescription} placeholder={selected?.hint || 'Bu pano ne için?'} />

        <FieldLabel>Renk</FieldLabel>
        <ColorPicker value={color} onChange={setColor} />

        <FieldLabel>Simge</FieldLabel>
        <IconPicker value={icon} onChange={setIcon} color={color} />

        {!editId ? (
          <>
            <FieldLabel
              right={
                <Pressable onPress={() => router.push('/templates')} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <MaterialCommunityIcons name="pencil-outline" size={16} color={c.primary} />
                  <AppText variant="label" color="primary">
                    Şablonları düzenle
                  </AppText>
                </Pressable>
              }
            >
              Başlangıç şablonu
            </FieldLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {templates.map((t) => {
                const sel = t.id === tplId;
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => chooseTemplate(t)}
                    style={{
                      width: '47.5%',
                      borderRadius: 16,
                      borderWidth: sel ? 2 : 1,
                      borderColor: sel ? c.primary : c.border,
                      backgroundColor: sel ? c.primaryContainer : c.surface,
                      padding: 14,
                      minHeight: 104,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <BoardIcon icon={t.icon} color={t.color} size={32} />
                      {sel ? <MaterialCommunityIcons name="check-circle" size={20} color={c.primary} /> : null}
                    </View>
                    <AppText variant="body" style={{ marginTop: 10 }} numberOfLines={1}>
                      {t.name}
                    </AppText>
                    <AppText variant="caption" color="textSecondary" numberOfLines={1}>
                      {`${t.lists.length} liste · ${t.hint || 'Açıklama yok'}`}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            <Surface style={{ padding: 14, marginTop: 14, backgroundColor: c.surfaceVariant, borderColor: c.surfaceVariant }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <MaterialCommunityIcons name="format-list-checks" size={20} color={c.primary} />
                <AppText variant="body">{`${previewLists.length} liste hazır`}</AppText>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {previewLists.map((l, i) => (
                  <View
                    key={`${l.name}-${i}`}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.surface, borderRadius: 8, paddingHorizontal: 8, height: 26 }}
                  >
                    {l.done ? <MaterialCommunityIcons name="check-circle-outline" size={14} color={c.primary} /> : null}
                    <AppText variant="caption">{l.name}</AppText>
                  </View>
                ))}
              </View>
              <AppText variant="caption" color="textSecondary" style={{ marginTop: 10 }}>
                ✓ işaretli liste tamamlanma listesidir: işaretlediğin görevler oraya taşınır.
              </AppText>
            </Surface>
          </>
        ) : null}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
        <Button label={editId ? 'Kaydet' : 'Pano oluştur'} icon={editId ? 'check' : 'plus'} onPress={submit} />
      </View>
    </Screen>
  );
}
