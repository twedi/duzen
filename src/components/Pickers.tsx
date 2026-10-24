import React, { useEffect, useRef, useState } from 'react';
import { Modal, PanResponder, Pressable, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { Button } from './Button';
import { useTheme } from '../ThemeContext';
import { BOARD_COLORS, fonts } from '../theme';
import { ICON_CHOICES } from '../db/templates';
import { hexToHsv, hsvToHex, normalizeHex, readableOn } from '../colors';
import { tap } from '../haptics';

const SPECTRUM_HUES = [0, 30, 60, 90, 120, 160, 200, 230, 260, 290, 320, 350];

/** Hazır renkler + "Özel renk" (spektrum) */
export function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [open, setOpen] = useState(false);
  const isPreset = BOARD_COLORS.some((col) => col.toLowerCase() === value.toLowerCase());

  const swatch = (col: string, sel: boolean, onPress: () => void, key: string) => (
    <Pressable
      key={key}
      onPress={() => {
        tap();
        onPress();
      }}
      style={{
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: col,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: sel ? 3 : 0,
        borderColor: c.text,
      }}
    >
      {sel ? <MaterialCommunityIcons name="check" size={20} color={readableOn(col)} /> : null}
    </Pressable>
  );

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {BOARD_COLORS.map((col) => swatch(col, col.toLowerCase() === value.toLowerCase(), () => onChange(col), col))}
      {!isPreset ? swatch(value, true, () => setOpen(true), 'custom') : null}

      {/* Spektrum düğmesi: gökkuşağı halka */}
      <Pressable
        onPress={() => setOpen(true)}
        style={{ width: 42, height: 42, borderRadius: 21, overflow: 'hidden', flexDirection: 'row', flexWrap: 'wrap', transform: [{ rotate: '45deg' }] }}
      >
        {SPECTRUM_HUES.map((h, i) => (
          <View key={h} style={{ width: i < 6 ? 7 : 7, height: 21, backgroundColor: hsvToHex(h, 0.75, 0.95) }} />
        ))}
        <View
          style={{
            position: 'absolute',
            top: 11,
            left: 11,
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: c.background,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ rotate: '-45deg' }],
          }}
        >
          <MaterialCommunityIcons name="plus" size={14} color={c.text} />
        </View>
      </Pressable>

      <SpectrumModal
        visible={open}
        initial={value}
        onClose={() => setOpen(false)}
        onPick={(col) => {
          setOpen(false);
          onChange(col);
        }}
      />
    </View>
  );
}

/** Ton, doygunluk ve parlaklık kaydırıcılarıyla serbest renk seçimi */
function SpectrumModal({ visible, initial, onClose, onPick }: { visible: boolean; initial: string; onClose: () => void; onPick: (c: string) => void }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [h, setH] = useState(0);
  const [s, setS] = useState(0.6);
  const [v, setV] = useState(0.9);
  const [hexText, setHexText] = useState(initial);

  useEffect(() => {
    if (!visible) return;
    const hsv = hexToHsv(initial);
    setH(hsv.h);
    setS(hsv.s);
    setV(hsv.v);
    setHexText(initial.toUpperCase());
  }, [visible, initial]);

  const color = hsvToHex(h, s, v);
  useEffect(() => {
    setHexText(color);
  }, [color]);

  const onHexSubmit = () => {
    const n = normalizeHex(hexText);
    if (!n) {
      setHexText(color);
      return;
    }
    const hsv = hexToHsv(n);
    setH(hsv.h);
    setS(hsv.s);
    setV(hsv.v);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }} onPress={onClose}>
        <Pressable style={{ backgroundColor: c.surface, borderRadius: 24, padding: 20 }}>
          <AppText variant="subtitle">Özel renk</AppText>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 16 }}>
            <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name="view-dashboard-outline" size={30} color={readableOn(color)} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="caption" color="textSecondary">
                Renk kodu
              </AppText>
              <TextInput
                value={hexText}
                onChangeText={setHexText}
                onSubmitEditing={onHexSubmit}
                onBlur={onHexSubmit}
                autoCapitalize="characters"
                maxLength={7}
                style={{
                  marginTop: 4,
                  height: 44,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: c.border,
                  paddingHorizontal: 12,
                  color: c.text,
                  fontFamily: fonts.semibold,
                  fontSize: 16,
                  backgroundColor: c.background,
                }}
              />
            </View>
          </View>

          <AppText variant="label" color="textSecondary" style={{ marginTop: 20, marginBottom: 8 }}>
            Ton
          </AppText>
          <GradientSlider value={h / 360} colorAt={(t) => hsvToHex(t * 360, 1, 1)} onChange={(t) => setH(t * 360)} />

          <AppText variant="label" color="textSecondary" style={{ marginTop: 16, marginBottom: 8 }}>
            Doygunluk
          </AppText>
          <GradientSlider value={s} colorAt={(t) => hsvToHex(h, t, v)} onChange={setS} />

          <AppText variant="label" color="textSecondary" style={{ marginTop: 16, marginBottom: 8 }}>
            Parlaklık
          </AppText>
          <GradientSlider value={v} colorAt={(t) => hsvToHex(h, s, 0.15 + t * 0.85)} onChange={(t) => setV(0.15 + t * 0.85)} valueToT={(x) => (x - 0.15) / 0.85} />

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
            <Button label="Vazgeç" variant="outline" onPress={onClose} style={{ flex: 1 }} />
            <Button label="Seç" icon="check" onPress={() => onPick(color)} style={{ flex: 1 }} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const SEGMENTS = 40;

/** Renk geçişli kaydırıcı (ek paket gerektirmez: ince renkli şeritlerden oluşur) */
function GradientSlider({
  value,
  colorAt,
  onChange,
  valueToT = (x) => x,
}: {
  value: number;
  colorAt: (t: number) => string;
  onChange: (t: number) => void;
  valueToT?: (x: number) => number;
}) {
  const { theme } = useTheme();
  const width = useRef(1);
  const startT = useRef(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        const t = Math.max(0, Math.min(1, e.nativeEvent.locationX / width.current));
        startT.current = t;
        onChangeRef.current(t);
      },
      onPanResponderMove: (_e, g) => {
        const t = Math.max(0, Math.min(1, startT.current + g.dx / width.current));
        onChangeRef.current(t);
      },
    })
  ).current;

  const t = Math.max(0, Math.min(1, valueToT(value)));

  return (
    <View
      {...responder.panHandlers}
      onLayout={(e) => {
        width.current = Math.max(1, e.nativeEvent.layout.width);
      }}
      style={{ height: 32, justifyContent: 'center' }}
    >
      <View style={{ height: 18, borderRadius: 9, overflow: 'hidden', flexDirection: 'row' }} pointerEvents="none">
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <View key={i} style={{ flex: 1, backgroundColor: colorAt(i / (SEGMENTS - 1)) }} />
        ))}
      </View>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: `${t * 100}%`,
          marginLeft: -14,
          width: 28,
          height: 28,
          borderRadius: 14,
          borderWidth: 3,
          borderColor: '#FFFFFF',
          backgroundColor: colorAt(t),
          elevation: 3,
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 3,
          shadowOffset: { width: 0, height: 1 },
        }}
      />
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, height: 18, borderRadius: 9, borderWidth: 1, borderColor: theme.colors.border }} />
    </View>
  );
}

export function IconPicker({ value, onChange, color }: { value: string; onChange: (i: string) => void; color: string }) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {ICON_CHOICES.map((ic) => {
        const sel = ic === value;
        return (
          <Pressable
            key={ic}
            onPress={() => {
              tap();
              onChange(ic);
            }}
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: sel ? color : c.surface,
              borderWidth: 1,
              borderColor: sel ? color : c.border,
            }}
          >
            <MaterialCommunityIcons name={ic as any} size={24} color={sel ? readableOn(color) : c.textSecondary} />
          </Pressable>
        );
      })}
    </View>
  );
}

/** Pano/şablon simgesi: renkli kutu içinde okunaklı renkte simge */
export function BoardIcon({ icon, color, size = 44 }: { icon: string; color: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <MaterialCommunityIcons name={icon as any} size={size * 0.5} color={readableOn(color)} />
    </View>
  );
}
