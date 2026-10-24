import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { Button } from './Button';
import { useTheme } from '../ThemeContext';
import { fonts } from '../theme';

export type SheetOption = {
  label: string;
  onPress: () => void;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  danger?: boolean;
  selected?: boolean;
};

/** Alttan açılan seçenek listesi */
export function ActionSheet({ visible, title, options, onClose }: { visible: boolean; title?: string; options: SheetOption[]; onClose: () => void }) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }} onPress={onClose}>
        <Pressable style={{ backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 28, maxHeight: '80%' }}>
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: c.border, marginBottom: 12 }} />
          {title ? (
            <AppText variant="subtitle" style={{ marginBottom: 6, marginHorizontal: 8 }} numberOfLines={1}>
              {title}
            </AppText>
          ) : null}
          <ScrollView>
            {options.map((o) => (
              <Pressable
                key={o.label}
                onPress={() => {
                  onClose();
                  // Modal kapanırken ikinci bir modal açılabilsin diye küçük gecikme
                  setTimeout(o.onPress, 180);
                }}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  paddingVertical: 14,
                  paddingHorizontal: 8,
                  borderRadius: 12,
                  backgroundColor: pressed ? c.surfaceVariant : 'transparent',
                })}
              >
                {o.icon ? <MaterialCommunityIcons name={o.icon} size={22} color={o.danger ? c.danger : c.textSecondary} /> : null}
                <AppText variant="body" color={o.danger ? 'danger' : 'text'} style={{ flex: 1 }}>
                  {o.label}
                </AppText>
                {o.selected ? <MaterialCommunityIcons name="check" size={20} color={c.primary} /> : null}
              </Pressable>
            ))}
          </ScrollView>
          <Button label="Vazgeç" variant="outline" onPress={onClose} style={{ marginTop: 8 }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Tek satırlık metin girişi penceresi (Android'de Alert.prompt olmadığı için) */
export function PromptModal({
  visible,
  title,
  initial = '',
  placeholder,
  confirmLabel = 'Tamam',
  onSubmit,
  onClose,
}: {
  visible: boolean;
  title: string;
  initial?: string;
  placeholder?: string;
  confirmLabel?: string;
  onSubmit: (value: string) => void;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [value, setValue] = useState(initial);
  useEffect(() => {
    if (visible) setValue(initial);
  }, [visible, initial]);

  const submit = () => {
    const v = value.trim();
    if (!v) return;
    onClose();
    onSubmit(v);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 }} onPress={onClose}>
          <Pressable style={{ backgroundColor: c.surface, borderRadius: 20, padding: 20 }}>
            <AppText variant="subtitle" style={{ marginBottom: 12 }}>
              {title}
            </AppText>
            <TextInput
              autoFocus
              value={value}
              onChangeText={setValue}
              placeholder={placeholder}
              placeholderTextColor={c.textSecondary}
              onSubmitEditing={submit}
              returnKeyType="done"
              style={{
                borderWidth: 1,
                borderColor: c.border,
                borderRadius: 12,
                paddingHorizontal: 14,
                height: 48,
                color: c.text,
                backgroundColor: c.background,
                fontFamily: fonts.regular,
                fontSize: 15,
              }}
            />
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <Button label="Vazgeç" variant="outline" onPress={onClose} style={{ flex: 1 }} />
              <Button label={confirmLabel} onPress={submit} style={{ flex: 1 }} />
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
