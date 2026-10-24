import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing, cancelAnimation } from 'react-native-reanimated';
import { Screen } from '../../src/components/Screen';
import { AppText } from '../../src/components/AppText';
import { Button } from '../../src/components/Button';
import { ChoiceChip } from '../../src/components/Chips';
import { ScreenHeader } from '../../src/components/Form';
import { ProgressRing } from '../../src/components/ProgressRing';
import { FadeInUp } from '../../src/components/Motion';
import { useTheme } from '../../src/ThemeContext';
import { addFocusMinutes, CardView, getCard } from '../../src/db/repo';
import { useToast } from '../../src/components/Toast';
import { success, tap } from '../../src/haptics';

const FOCUS_PRESETS = [15, 25, 45, 60];
const BREAK_MIN = 5;

type Mode = 'focus' | 'break';

const fmt = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

/**
 * Odak zamanlayıcısı (pomodoro). Süre bitince ya da "Bitir" denince
 * çalışılan dakikalar karta eklenir; istatistiklerde toplam odak süresi görünür.
 * Süre, telefonun saatine göre hesaplanır; ekran kapansa da kaymaz.
 */
export default function FocusScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { theme } = useTheme();
  const c = theme.colors;

  const [card, setCard] = useState<CardView | null>(null);
  const [mode, setMode] = useState<Mode>('focus');
  const [minutes, setMinutes] = useState(25);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [sessionMinutes, setSessionMinutes] = useState(0);

  const endAt = useRef<number | null>(null);
  const focusedSec = useRef(0); // bu odak turunda kaydedilmemiş çalışılan saniye
  const lastTick = useRef<number | null>(null);

  useEffect(() => {
    getCard(Number(id)).then((r) => setCard(r?.card ?? null));
  }, [id]);

  const total = (mode === 'focus' ? minutes : BREAK_MIN) * 60;

  const saveFocused = useCallback(async () => {
    const m = Math.floor(focusedSec.current / 60);
    if (m <= 0 || !card) return 0;
    focusedSec.current -= m * 60;
    await addFocusMinutes(card.id, m);
    setSessionMinutes((x) => x + m);
    return m;
  }, [card]);

  // Zamanlayıcı
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      const now = Date.now();
      if (mode === 'focus' && lastTick.current) focusedSec.current += (now - lastTick.current) / 1000;
      lastTick.current = now;
      const left = Math.max(0, Math.round(((endAt.current ?? now) - now) / 1000));
      setRemaining(left);
      if (left <= 0) {
        setRunning(false);
        endAt.current = null;
        lastTick.current = null;
        success();
        if (mode === 'focus') {
          focusedSec.current = Math.max(focusedSec.current, total);
          saveFocused().then((m) => {
            toast.show({ message: `${m} dakika odaklandın. Kısa bir mola ver!`, icon: 'coffee-outline' });
          });
          setMode('break');
          setRemaining(BREAK_MIN * 60);
        } else {
          toast.show({ message: 'Mola bitti. Hazırsan yeni tura başla.', icon: 'timer-outline' });
          setMode('focus');
          setRemaining(minutes * 60);
        }
      }
    }, 250);
    return () => clearInterval(t);
  }, [running, mode, minutes, total, saveFocused, toast]);

  // Sayfadan çıkarken çalışılan süreyi kaybetme
  useEffect(
    () => () => {
      saveFocused();
    },
    [saveFocused]
  );

  const start = () => {
    tap();
    endAt.current = Date.now() + remaining * 1000;
    lastTick.current = Date.now();
    setRunning(true);
  };

  const pause = () => {
    tap();
    setRunning(false);
    endAt.current = null;
    lastTick.current = null;
  };

  const reset = () => {
    tap();
    setRunning(false);
    endAt.current = null;
    lastTick.current = null;
    setRemaining(total);
  };

  const choose = (m: number) => {
    if (running) return;
    setMode('focus');
    setMinutes(m);
    setRemaining(m * 60);
  };

  const finish = async () => {
    pause();
    const m = await saveFocused();
    if (m > 0) toast.show({ message: `${m} dakika karta eklendi`, icon: 'check-circle-outline' });
    else Alert.alert('Henüz kaydedilecek süre yok', 'En az 1 dakika odaklandığında süre karta eklenir.');
  };

  // Çalışırken halkanın etrafında hafif "nefes alma" efekti
  const breath = useSharedValue(1);
  useEffect(() => {
    if (running) breath.value = withRepeat(withTiming(1.06, { duration: 1800, easing: Easing.inOut(Easing.sin) }), -1, true);
    else {
      cancelAnimation(breath);
      breath.value = withTiming(1, { duration: 300 });
    }
  }, [running, breath]);
  const glow = useAnimatedStyle(() => ({ transform: [{ scale: breath.value }], opacity: (breath.value - 1) * 4 }));

  const accent = mode === 'focus' ? c.primary : c.priority.low.fg;
  const progress = total ? 1 - remaining / total : 0;

  return (
    <Screen bottomInset>
      <ScreenHeader title={mode === 'focus' ? 'Odak' : 'Mola'} subtitle={card?.title} onBack={() => router.back()} closeIcon />

      <FadeInUp style={{ flex: 1, alignItems: 'center', paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          {FOCUS_PRESETS.map((m) => (
            <ChoiceChip key={m} label={`${m} dk`} selected={mode === 'focus' && minutes === m} onPress={() => choose(m)} />
          ))}
        </View>

        <View style={{ marginTop: 40, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View
            style={[{ position: 'absolute', width: 280, height: 280, borderRadius: 140, backgroundColor: accent }, glow]}
          />
          <ProgressRing value={progress} size={260} stroke={14} color={accent} duration={400}>
            <MaterialCommunityIcons name={mode === 'focus' ? 'brain' : 'coffee-outline'} size={28} color={accent} />
            <AppText style={{ fontFamily: 'Inter_700Bold', fontSize: 56, lineHeight: 64, letterSpacing: 1 }}>{fmt(remaining)}</AppText>
            <AppText variant="small" color="textSecondary">
              {mode === 'focus' ? (running ? 'Odaklanıyorsun' : 'Hazır olduğunda başla') : 'Kısa bir mola'}
            </AppText>
          </ProgressRing>
        </View>

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 44, alignSelf: 'stretch' }}>
          <Button label="Sıfırla" icon="restart" variant="outline" onPress={reset} style={{ flex: 1 }} />
          {running ? (
            <Button label="Duraklat" icon="pause" variant="tonal" onPress={pause} style={{ flex: 2 }} />
          ) : (
            <Button label={remaining < total ? 'Devam et' : 'Başla'} icon="play" onPress={start} style={{ flex: 2 }} />
          )}
        </View>
        {mode === 'focus' ? (
          <Button label="Bitir ve süreyi kaydet" icon="check" variant="outline" onPress={finish} style={{ alignSelf: 'stretch', marginTop: 12 }} />
        ) : null}

        <View style={{ marginTop: 'auto', paddingBottom: 16, alignItems: 'center', gap: 4 }}>
          <AppText variant="small" color="textSecondary">
            {`Bu oturumda ${sessionMinutes} dk · Bu göreve toplam ${(card?.focus_minutes ?? 0) + sessionMinutes} dk`}
          </AppText>
          <AppText variant="caption" color="textSecondary">
            Ekranı açık tut; uygulamadan çıkarsan süre kaydedilir.
          </AppText>
        </View>
      </FadeInUp>
    </Screen>
  );
}
