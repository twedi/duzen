import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeOut, SlideInDown } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import { useTheme } from '../ThemeContext';

export type ToastOptions = {
  message: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
};

type Ctx = { show: (o: ToastOptions) => void };
const ToastCtx = createContext<Ctx>({ show: () => {} });

/** Ekranın altında beliren kısa bildirim; isteğe bağlı "Geri al" düğmesiyle */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<(ToastOptions & { id: number }) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((o: ToastOptions) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ ...o, id: Date.now() });
    timer.current = setTimeout(() => setToast(null), o.duration ?? 4000);
  }, []);

  const bg = theme.dark ? '#ECEAF8' : '#262536';
  const fg = theme.dark ? '#1C1B2E' : '#F2F1FA';
  const accent = theme.dark ? '#5548C8' : '#BDB2FF';

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      {toast ? (
        <Animated.View
          key={toast.id}
          entering={SlideInDown.springify().damping(18)}
          exiting={FadeOut.duration(160)}
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: insets.bottom + 86,
            backgroundColor: bg,
            borderRadius: 16,
            paddingLeft: 16,
            paddingRight: 8,
            minHeight: 54,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            elevation: 10,
            shadowColor: '#000',
            shadowOpacity: 0.25,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 6 },
          }}
        >
          {toast.icon ? <MaterialCommunityIcons name={toast.icon} size={22} color={accent} /> : null}
          <AppText variant="body" color={fg} style={{ flex: 1 }} numberOfLines={2}>
            {toast.message}
          </AppText>
          {toast.actionLabel ? (
            <Pressable
              hitSlop={8}
              onPress={() => {
                if (timer.current) clearTimeout(timer.current);
                setToast(null);
                toast.onAction?.();
              }}
              style={{ paddingHorizontal: 12, paddingVertical: 10 }}
            >
              <AppText variant="body" color={accent}>
                {toast.actionLabel}
              </AppText>
            </Pressable>
          ) : (
            <View style={{ width: 8 }} />
          )}
        </Animated.View>
      ) : null}
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
