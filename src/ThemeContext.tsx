import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { darkTheme, lightTheme, Theme } from './theme';
import { getSettings, setSetting } from './db/repo';

export type ThemeMode = 'light' | 'dark' | 'system';

type Ctx = { theme: Theme; mode: ThemeMode; setMode: (m: ThemeMode) => void };

const ThemeCtx = createContext<Ctx>({ theme: lightTheme, mode: 'system', setMode: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    getSettings().then((s) => setModeState(s.theme));
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    setSetting('theme', m);
  }, []);

  const theme = useMemo(() => {
    const dark = mode === 'system' ? system === 'dark' : mode === 'dark';
    return dark ? darkTheme : lightTheme;
  }, [mode, system]);

  const value = useMemo(() => ({ theme, mode, setMode }), [theme, mode, setMode]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);
