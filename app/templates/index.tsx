import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { AppText } from '../../src/components/AppText';
import { Fab, ScreenHeader } from '../../src/components/Form';
import { BoardIcon } from '../../src/components/Pickers';
import { InfoBox } from '../../src/components/EmptyState';
import { useTheme } from '../../src/ThemeContext';
import { listTemplates, TemplateRow } from '../../src/db/repo';

export default function TemplatesScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const c = theme.colors;
  const [templates, setTemplates] = useState<TemplateRow[]>([]);

  useFocusEffect(
    useCallback(() => {
      listTemplates().then(setTemplates);
    }, [])
  );

  return (
    <Screen>
      <ScreenHeader title="Şablonlar" subtitle="Yeni panolar bu şablonlarla başlar" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 110, gap: 10 }}>
        {templates.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => router.push({ pathname: '/templates/[id]', params: { id: String(t.id) } })}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              backgroundColor: c.surface,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: c.border,
              padding: 14,
              opacity: pressed ? 0.92 : 1,
            })}
          >
            <BoardIcon icon={t.icon} color={t.color} size={44} />
            <View style={{ flex: 1 }}>
              <AppText variant="body" numberOfLines={1}>
                {t.name}
              </AppText>
              <AppText variant="caption" color="textSecondary" numberOfLines={2}>
                {t.lists.map((l) => (l.done ? `${l.name} ✓` : l.name)).join(' · ')}
              </AppText>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={c.textSecondary} />
          </Pressable>
        ))}
        {templates.length === 0 ? (
          <AppText variant="small" color="textSecondary" style={{ textAlign: 'center', marginTop: 24 }}>
            Hiç şablon yok. Yeni bir tane oluştur.
          </AppText>
        ) : null}
        <View style={{ marginTop: 8, marginHorizontal: -16 }}>
          <InfoBox icon="lightbulb-on-outline" text="Bir panonun düzenini beğendiysen pano menüsünden “Şablon olarak kaydet” diyebilirsin." />
        </View>
      </ScrollView>
      <Fab label="Yeni şablon" onPress={() => router.push({ pathname: '/templates/[id]', params: { id: 'new' } })} />
    </Screen>
  );
}
